const { WyvernProtocol } = require('wyvern-js')

const assertEqual = (a, b, msg) => {
  if (a !== b) throw new Error(msg + ': ' + a + ', ' + b)
}

const validateOrder = async (order) => {
  const orderHash = WyvernProtocol.getOrderHashHex(order)
  assertEqual(orderHash, order.hash, 'Expected provided order hash to match calculated hash')
  const validSignature = WyvernProtocol.isValidSignature(orderHash, { v: order.v, r: order.r, s: order.s }, order.maker)
  assertEqual(validSignature, true, 'Expected valid order signature')
}

module.exports = { validateOrder }
