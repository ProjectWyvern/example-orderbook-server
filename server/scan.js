const Web3 = require('web3')
const { encodeCall } = require('wyvern-schemas')
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
          /*
          if (order.side === '1') {
            const proxyABI = {'constant': false, 'inputs': [{'name': 'dest', 'type': 'address'}, {'name': 'howToCall', 'type': 'uint8'}, {'name': 'calldata', 'type': 'bytes'}], 'name': 'proxy', 'outputs': [{'name': 'success', 'type': 'bool'}], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}
            const calldata = encodeCall(proxyABI, [order.target, order.howToCall, order.calldata])
            const proxy = await protocolInstance.wyvernProxyRegistry.proxies.callAsync(order.maker)
            web3.eth.call({
              from: order.maker,
              to: proxy,
              data: calldata
            }, (err, res) => {
              console.log(err, res)
            })
          }
          */
        }
      })
    })
  }
  setInterval(scanFunc, 1000)
}

module.exports = scan
