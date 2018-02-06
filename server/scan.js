const Web3 = require('web3')
const { WyvernProtocol } = require('wyvern-js')

const { Order } = require('./db.js')
const log = require('./logging.js')

const scan = (provider, network) => {
  const protocolInstance = new WyvernProtocol(provider, { network })
  const web3 = new Web3(provider)
  const scanFunc = () => {
    Order.findAll({where: {cancelledOrFinalized: false}}).then(orders => {
      orders.map(async order => {
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
          order.save().then(() => {
            log.info('Order ' + order.hash + ' marked cancelled or finalized')
          })
        } else {
          if (order.side === '1') {
            const proxyABI = {'constant': false, 'inputs': [{'name': 'dest', 'type': 'address'}, {'name': 'howToCall', 'type': 'uint8'}, {'name': 'calldata', 'type': 'bytes'}], 'name': 'proxy', 'outputs': [{'name': 'success', 'type': 'bool'}], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}
            const proxy = await protocolInstance.wyvernProxyRegistry.proxies.callAsync(order.maker)
            const contract = (web3.eth.contract([proxyABI])).at(proxy)
            contract.proxy.call(order.target, order.howToCall, order.calldata, {from: order.maker}, (_, res) => {
              if (!res) {
                order.destroy().then(() => {
                  log.info('Order ' + order.hash + ' could not be executed, deleted')
                })
              }
            })
          }
        }
      })
    })
  }
  setInterval(scanFunc, 1000)
}

module.exports = scan
