const { WyvernProtocol } = require('wyvern-js')
const { schemas, tokens, encodeBuy, encodeSell } = require('wyvern-schemas')

const { canSettleOrder } = require('./misc.js')

const assertEqual = (a, b, msg) => {
  if (a !== b) throw new Error(msg + ': ' + a + ', ' + b)
}

const validateOrder = async (web3, protocolInstance, order, { network, feeRecipient }) => {
  const now = Date.now() / 1000

  /* Check basic parameters. */
  assertEqual(order.exchange.toLowerCase(), WyvernProtocol.getExchangeContractAddress(network).toLowerCase(), 'Expected exchange contract address to match')
  assertEqual(order.feeRecipient.toLowerCase(), feeRecipient.toLowerCase(), 'Expected feeRecipient to match')
  assertEqual(order.makerRelayerFee, '0', 'Expected makerRelayerFee to be zero')
  assertEqual(order.takerRelayerFee, '0', 'Expected takerRelayerFee to be zero')
  assertEqual(order.makerProtocolFee, '0', 'Expected makerProtocolFee to be zero')
  assertEqual(order.takerProtocolFee, '0', 'Expected takerProtocolFee to be zero')
  const orderHash = WyvernProtocol.getOrderHashHex(order)

  /* Check timestamps. */
  const listingTime = parseInt(order.listingTime)
  const expirationTime = parseInt(order.expirationTime)
  assertEqual(listingTime >= now - 3600, true, 'Expected listingTime to be at or past the current time')
  assertEqual(expirationTime === 0 || expirationTime >= now - 60, true, 'Expected expirationTime to be at or past the current time, or zero')

  /* Check metadata agreement. */
  const schema = schemas[network].filter(s => s.name === order.metadata.schema)[0]
  assertEqual(schema === undefined, false, 'Unrecognized schema: ' + order.metadata.schema)
  const token = ([].concat.apply(tokens[network].canonicalWrappedEther, tokens[network].otherTokens)).filter(t => t.address.toLowerCase() === order.paymentToken)[0]
  assertEqual(token === undefined, false, 'Unrecognized token: ' + order.paymentToken)
  const { target, calldata, replacementPattern } = order.side === '0' ? encodeBuy(schema, order.metadata.asset, order.maker) : encodeSell(schema, order.metadata.asset)
  assertEqual(order.target.toLowerCase(), target.toLowerCase(), 'Expected target to match')
  assertEqual(order.calldata, calldata, 'Expected calldata to match')
  assertEqual(order.replacementPattern, replacementPattern, 'Expected replacementPattern to match')
  assertEqual(order.howToCall, '0', 'Expected howToCall to match')
  assertEqual(order.staticTarget, WyvernProtocol.NULL_ADDRESS, 'Expected staticTarget to match')
  assertEqual(order.staticExtradata, '0x', 'Expected staticExtradata to match')

  /* Check formatted. */
  const formatted = await schema.formatter(order.metadata.asset, web3)

  /* Check if order can be settled. */
  if (order.side === '1') {
    const canSettle = await canSettleOrder(web3, protocolInstance, order)
    assertEqual(canSettle, true, 'Expected to be able to settle order')
  }

  /* Check hash and signature validity. */
  assertEqual(orderHash, order.hash, 'Expected provided order hash to match calculated hash')
  const validSignature = WyvernProtocol.isValidSignature(orderHash, { v: order.v, r: order.r, s: order.s }, order.maker)
  assertEqual(validSignature, true, 'Expected valid order signature')
  const valid = await protocolInstance.wyvernExchange.validateOrder_.callAsync(
    [order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken],
    [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt],
    order.feeMethod,
    order.side,
    order.saleKind,
    order.howToCall,
    order.calldata,
    order.replacementPattern,
    order.staticExtradata,
    order.v,
    order.r || '0x',
    order.s || '0x',
    {from: WyvernProtocol.NULL_ADDRESS})
  assertEqual(valid, true, 'Expected on-contract validation to pass')

  return { schema, formatted, asset: order.metadata.asset }
}

module.exports = { validateOrder }
