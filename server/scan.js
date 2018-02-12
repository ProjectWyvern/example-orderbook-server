const Web3 = require('web3')
const { WyvernProtocol } = require('wyvern-js')

const { Order } = require('./db.js')
const log = require('./logging.js')

const scan = (provider, network) => {
  const protocolInstance = new WyvernProtocol(new Web3.providers.HttpProvider(provider), { network })
  const web3 = new Web3(new Web3.providers.HttpProvider(provider))
  const scanFunc = async () => {
    const start = Date.now() / 1000
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
        const proxyABI = {'constant': false, 'inputs': [{'name': 'dest', 'type': 'address'}, {'name': 'howToCall', 'type': 'uint8'}, {'name': 'calldata', 'type': 'bytes'}], 'name': 'proxy', 'outputs': [{'name': 'success', 'type': 'bool'}], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}
        const proxy = await protocolInstance.wyvernProxyRegistry.proxies.callAsync(order.maker)
        const contract = (web3.eth.contract([proxyABI])).at(proxy)
        return contract.proxy.call(order.target, order.howToCall, order.calldata, {from: order.maker}, (_, res) => {
          if (!res) {
            order.markedInvalid = true
            order.save().then(() => {
              log.info('Order ' + order.hash + ' marked invalid')
            })
          }
        })
      }))
    })
    const end = Date.now() / 1000
    const dt = Math.round((end - start) * 1000) / 1000
    log.info({dt: dt + 's'}, 'Orderbook scan completed')
    setTimeout(scanFunc, 5000)
  }
  scanFunc()
}

module.exports = scan
