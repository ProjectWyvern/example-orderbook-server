const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')

const Web3 = require('web3')
const { WyvernProtocol } = require('wyvern-js')
const { schemas } = require('wyvern-schemas')

const { validateOrder } = require('./validate.js')
const log = require('./logging.js')
const { scanOrderbook, syncLogs, syncAssets } = require('./scan.js')

var protocolInstance
var web3Provider
var web3

const fail = (req, res, status, err) => {
  log.warn({error: err.stack, origin: 'express', path: req.path}, 'Error processing request')
  res.status(status)
  res.json({result: false, error: err.message})
}

const go = (config) => {
  const { Sequelize, sequelize, Op, afterSync, Synced, Asset, Settlement, Order, encodeOrder, decodeOrder, decodeAsset, decodeSettlement } = require('./db.js')(config)

  const { startBlockNumber, port, provider, network } = config

  const app = express()
  app.use(helmet())
  app.use(bodyParser.json())
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://exchange.projectwyvern.com')
    next()
  })

  const router = express.Router()

  router.get('/check', (req, res) => {
    res.json({result: true, error: null})
  })

  const parseLimitOffset = req => {
    var limit = req.query.limit ? parseInt(req.query.limit) : 20
    limit = Math.min(1000, Math.max(0, limit))
    var offset = req.query.offset ? parseInt(req.query.offset) : 0
    return { limit, offset }
  }

  const assetInclude = [{model: Order, as: 'orders', include: [{model: Settlement, as: 'settlement'}]}]
  const assetOrderOrder = [{model: Order, as: 'orders'}, 'createdAt', 'DESC']
  const settlementInclude = [{model: Order, as: 'order', include: [{model: Asset, as: 'asset'}]}]
  const orderInclude = [{model: Asset, as: 'asset'}, {model: Settlement, as: 'settlement'}]

  router.get('/assets', (req, res) => {
    var where = {}
    if (req.query.schema) {
      where.schema = req.query.schema
    }
    if (req.query.owner) {
      where.owner = req.query.owner
    }
    var order = [['updatedAt', 'DESC']]
    const { limit, offset } = parseLimitOffset(req)
    var query = { where, order, limit, offset }
    return Asset.findAll(query).then(assets => {
      res.json({result: assets.map(decodeAsset), error: null})
    }).catch(err => {
      fail(req, res, 404, err)
    })
  })

  router.get('/assets/:hash', (req, res) => {
    return Asset.findOne({where: {hash: req.params.hash}, order: [assetOrderOrder], include: assetInclude}).then(asset => {
      res.json({result: decodeAsset(asset), error: null})
    }).catch(err => {
      fail(req, res, 404, err)
    })
  })

  router.post('/assets/track', (req, res) => {
  })

  router.get('/settlements', (req, res) => {
    var where = {}
    if (req.query.maker) {
      where.maker = req.query.maker
    }
    if (req.query.taker) {
      where.taker = req.query.taker
    }
    if (req.query.account) {
      where[Op.or] = [{maker: req.query.account}, {taker: req.query.account}]
    }
    var order = [['timestamp', 'DESC']]
    const { limit, offset } = parseLimitOffset(req)
    var query = { where, order, limit, offset, include: settlementInclude }
    return Settlement.findAll(query).then(settlements => {
      res.json({result: settlements.map(decodeSettlement), error: null})
    }).catch(err => {
      fail(req, res, 500, err)
    })
  })

  router.get('/settlements/:transactionHashIndex', (req, res) => {
    return Settlement.findOne({where: {transactionHashIndex: req.params.transactionHashIndex}, include: settlementInclude}).then(settlement => {
      res.json({result: decodeSettlement(settlement), error: null})
    }).catch(err => {
      fail(req, res, 404, err)
    })
  })

  router.get('/orders', (req, res) => {
    var where = {
      markedInvalid: req.query.markedInvalid === '1',
      cancelledOrFinalized: req.query.cancelledOrFinalized === '1'
    }
    if (req.query.maker) {
      where.maker = req.query.maker
    }
    if (req.query.taker) {
      where.taker = req.query.taker
    }
    if (req.query.paymentToken) {
      where.paymentToken = req.query.paymentToken
    }
    if (req.query.side) {
      where.side = req.query.side
    }
    if (req.query.schema) {
      where.schema = req.query.schema
    }
    if (req.query.saleKind) {
      where.saleKind = req.query.saleKind
    }
    if (req.query.filter) {
      where.title = [Op.like, req.query.filter]
    }
    if (req.query.createdSince) {
      where.createdAt = [Op.ge, parseInt(req.query.createdSince)]
    }
    var order = [['createdAt', 'DESC']]
    if (req.query.order) {
      switch (req.query.order) {
        case '1': order = [['createdAt', 'DESC']]; break
        case '2': order = [['createdAt', 'ASC']]; break
        case '3': order = [['basePrice', 'DESC']]; break
        case '4': order = [['basePrice', 'ASC']]; break
      }
    }
    const { limit, offset } = parseLimitOffset(req)
    const query = { where, order, limit, offset, include: orderInclude }
    return Order.findAll(query).then(orders => {
      res.json({result: orders.map(decodeOrder), error: null})
    }).catch(err => {
      fail(req, res, 500, err)
    })
  })

  router.get('/orders/:hash', (req, res) => {
    return Order.findOne({where: {hash: req.params.hash}, include: orderInclude}).then(order => {
      res.json({result: decodeOrder(order), error: null})
    }).catch(err => {
      fail(req, res, 404, err)
    })
  })

  router.post('/orders/post', (req, res) => {
    const order = req.body
    return validateOrder(web3, protocolInstance, order, config).then(({schema, formatted, asset}) => {
      const hash = WyvernProtocol.getAssetHashHex(schema.hash(asset), schema.name)
      return Asset.upsert({
        hash,
        schema: schema.name,
        schemaVersion: schema.version,
        asset,
        formatted
      }).then(() => {
        return Order.create(encodeOrder(order, hash)).then(() => {
          res.json({result: true, error: null})
        })
      })
    }).catch(err => {
      fail(req, res, 400, err)
    })
  })

  router.post('/orders/validate', (req, res) => {
    const order = req.body
    return validateOrder(web3, protocolInstance, order, config).then(() => {
      res.json({result: true, error: null})
    }).catch(err => fail(req, res, 400, err))
  })

  app.use('/v0', router)

  web3Provider = new Web3.providers.HttpProvider(provider)
  web3 = new Web3(web3Provider)
  protocolInstance = new WyvernProtocol(web3Provider, { network })
  sequelize
    .sync()
    .then(async () => {
      await afterSync()
      if (process.env.WYVERN_SYNC_ORDERBOOK) {
        scanOrderbook(web3, protocolInstance, network, { Order })
      } else if (process.env.WYVERN_SYNC_LOGS) {
        syncLogs(web3, protocolInstance, { sequelize, Sequelize, Op, Synced, Settlement, Order, startBlockNumber })
        schemas[network].filter(s => s.events.transfer).map(s => syncAssets(s, web3, protocolInstance, { sequelize, Sequelize, Synced, Asset }))
      } else {
        app.listen(port, () => {
          log.info('Listening on port ' + port)
        })
      }
    }).catch(err => {
      log.warn({err: err.stack}, 'Error starting')
      process.exit(1)
    })
}

module.exports = { go }
