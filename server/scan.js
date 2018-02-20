const { WyvernProtocol } = require('wyvern-js')

const log = require('./logging.js')
const { canSettleOrder } = require('./misc.js')

const promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) { reject(err) }
      resolve(res)
    })
  )

const scanOrderbook = (web3, protocolInstance, network, { Order }) => {
  const scanFunc = async () => {
    const start = Date.now() / 1000
    try {
      await Order.findAll({where: {cancelledOrFinalized: false}}).then(orders => {
        return Promise.all(orders.map(async order => {
          const valid = await protocolInstance.wyvernExchange.validateOrder_.callAsync(
            [order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken],
            [order.makerFee, order.takerFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt],
            order.side,
            order.saleKind,
            order.howToCall,
            order.calldata,
            order.replacementPattern,
            order.staticExtradata,
            parseInt(order.v),
            order.r,
            order.s)
          if (!valid) {
            order.cancelledOrFinalized = true
            return order.save().then(() => {
              log.info('Order ' + order.hash + ' marked cancelled or finalized')
            })
          }
        }))
      })
      await Order.findAll({where: {markedInvalid: false, side: '1'}}).then(orders => {
        return Promise.all(orders.map(async order => {
          const res = await canSettleOrder(web3, protocolInstance, order)
          if (!res) {
            order.markedInvalid = true
            order.save().then(() => {
              log.info('Order ' + order.hash + ' marked invalid')
            })
          }
        }))
      })
    } catch (err) {
      log.warn({err: err.stack}, 'Error scanning orderbook')
    }
    const end = Date.now() / 1000
    const dt = Math.round((end - start) * 1000) / 1000
    log.info({dt: dt + 's'}, 'Orderbook scan completed')
    setTimeout(scanFunc, 5000)
  }
  scanFunc()
}

const genericSync = async (what, event, onEvent, web3, protocolInstance, { sequelize, Sequelize, Synced }) => {
  const syncFunc = async () => {
    try {
      await (async () => {
        var currentBlockNumber = await promisify(web3.eth.getBlockNumber)
        currentBlockNumber = parseInt(currentBlockNumber)
        const synced = await Synced.findOne({where: {what}}).catch(() => null)
        if (synced === null) {
          return Synced.create({what, blockNumber: 1500000})
        } else {
          const lastSyncedBlockNumber = parseInt(synced.blockNumber)
          if (lastSyncedBlockNumber < currentBlockNumber) {
            const fromBlock = lastSyncedBlockNumber + 1
            const toBlock = Math.min(lastSyncedBlockNumber + 1000, currentBlockNumber)
            return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED}, txn => {
              const args = { fromBlock, toBlock }
              return promisify(c => event({}, args).get(c)).then(async events => {
                for (var i = 0; i < events.length; i++) {
                  const event = events[i]
                  await onEvent(event, txn)
                }
                return Synced.update({blockNumber: toBlock}, {where: {what}, transaction: txn})
              })
            }).then(() => {
              log.info({fromBlock, toBlock, what}, 'Synced logs')
            })
          }
        }
      })()
    } catch (err) {
      log.warn({err: err.stack, what: what}, 'Error syncing')
    }
    setTimeout(syncFunc, 100)
  }
  syncFunc()
}

const syncAssets = (schema, web3, protocolInstance, config) => {
  const { Asset } = config
  const transfer = schema.events.transfer
  const event = web3.eth.contract([transfer]).at(transfer.target)[transfer.name]
  const destination = transfer.inputs.filter(i => i.kind === 'destination')[0]
  return genericSync(schema.name, event, (event, txn) => {
    const owner = event.args[destination.name].toLowerCase()
    const asset = transfer.assetFromInputs(event.args)
    const hash = WyvernProtocol.getAssetHashHex(schema.hash(asset), schema.name)
    console.log('schema: ' + schema.name, 'asset: ' + asset, 'hash: ' + hash, 'owner: ' + owner)
    return schema.formatter(asset).then(formatted => {
      return Asset.upsert({
        hash,
        owner,
        schema: schema.name,
        schemaVersion: schema.version,
        asset,
        formatted
      }, {transaction: txn})
    })
  }, web3, protocolInstance, config)
}

const syncLogs = async (web3, protocolInstance, { sequelize, Sequelize, Op, Synced, Settlement, Order, startBlockNumber }) => {
  const syncFunc = async () => {
    try {
      await (async () => {
        const currentBlockNumber = await promisify(web3.eth.getBlockNumber)
        const synced = await Synced.findOne({where: {what: 'matchLogs'}}).catch(() => null)
        if (synced === null) {
          return Synced.create({what: 'matchLogs', blockNumber: startBlockNumber})
        } else {
          const lastSyncedBlockNumber = parseInt(synced.blockNumber)
          if (lastSyncedBlockNumber < currentBlockNumber) {
            const blockToSync = lastSyncedBlockNumber + 1
            const block = await promisify(c => web3.eth.getBlock(blockToSync, false, c))
            return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE}, txn => {
              const args = { fromBlock: blockToSync, toBlock: blockToSync }
              return promisify(c => protocolInstance.wyvernExchange.web3ContractInstance.OrdersMatched({}, args).get(c)).then(matchEvents => {
                return Promise.all(matchEvents.map(event => {
                  const { buyHash, sellHash, maker, taker, price, metadata } = event.args
                  return Order.findOne({where: {hash: {[Op.or]: [buyHash, sellHash]}}}).then(order => {
                    if (order === null) {
                      log.warn({buyHash, sellHash}, 'Could not find order')
                      return
                    }
                    return Settlement.create({
                      transactionHashIndex: event.transactionHash + ':' + event.transactionIndex,
                      orderId: order.hash,
                      timestamp: block.timestamp,
                      maker: maker,
                      taker: taker,
                      price: price.toString(),
                      metadata: metadata
                    }, {transaction: txn})
                  })
                })).then(() => {
                  return Synced.update({blockNumber: blockToSync}, {where: {what: 'matchLogs'}, transaction: txn})
                })
              })
            }).then(() => {
              log.info({blockNumber: blockToSync}, 'Synced match logs')
            })
          }
        }
      })()
    } catch (err) {
      log.warn({err: err.stack}, 'Error syncing match logs')
    }
    setTimeout(syncFunc, 100)
  }
  syncFunc()
}

module.exports = { scanOrderbook, syncLogs, syncAssets }
