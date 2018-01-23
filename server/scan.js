const { WyvernProtocol } = require('wyvern-js')

const { Order } = require('./db.js')
const log = require('./logging.js')

const scan = (provider, network) => {
  const protocolInstance = new WyvernProtocol(provider, { network })
  const scanFunc = () => {
    Order.findAll().then(orders => {
      orders.map(async order => {
        const valid = await protocolInstance.wyvernExchange.validateOrder_.callAsync(
          [order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.paymentToken],
          [order.makerFee, order.takerFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt],
          order.side,
          order.saleKind,
          order.howToCall,
          order.calldata,
          order.replacementPattern,
          order.metadataHash,
          parseInt(order.v),
          order.r,
          order.s)
        if (!valid) {
          order.destroy().then(() => {
            log.info('Order ' + order.hash + ' is invalid, removed from orderbook')
          })
        }
      })
    })
  }
  setInterval(scanFunc, 1000)
}

module.exports = scan
