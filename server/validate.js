const { WyvernProtocol } = require('wyvern-js')

const assertEqual = (a, b, msg) => {
  if (a !== b) throw new Error(msg + ': ' + a + ', ' + b)
}

const validateOrder = async (protocolInstance, order) => {
  const orderHash = WyvernProtocol.getOrderHashHex(order)
  assertEqual(orderHash, order.hash, 'Expected provided order hash to match calculated hash')
  const validSignature = WyvernProtocol.isValidSignature(orderHash, { v: order.v, r: order.r, s: order.s }, order.maker)
  assertEqual(validSignature, true, 'Expected valid order signature')
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
    order.r || '0x',
    order.s || '0x')
  assertEqual(valid, true, 'Expected on-contract validation to pass')
}

module.exports = { validateOrder }
