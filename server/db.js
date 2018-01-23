const Sequelize = require('sequelize')

const log = require('./logging.js')

const sequelize = new Sequelize('wyvernOrderbook', null, null, {
  host: 'localhost',
  dialect: 'sqlite',
  storage: './db.sqlite',
  pool: {max: 10, min: 0, acquire: 30000, idle: 10000},
  operatorsAliases: false,
  logging: (msg) => log.debug({origin: 'sequelize'}, msg)
})

const Order = sequelize.define('order', {
  hash: {type: Sequelize.TEXT, allowNull: false, primaryKey: true},
  metadata: {type: Sequelize.JSON, allowNull: false},
  exchange: {type: Sequelize.TEXT, allowNull: false},
  maker: {type: Sequelize.TEXT, allowNull: false},
  taker: {type: Sequelize.TEXT, allowNull: false},
  makerFee: {type: Sequelize.TEXT, allowNull: false},
  takerFee: {type: Sequelize.TEXT, allowNull: false},
  feeRecipient: {type: Sequelize.TEXT, allowNull: false},
  side: {type: Sequelize.TEXT, allowNull: false},
  saleKind: {type: Sequelize.TEXT, allowNull: false},
  target: {type: Sequelize.TEXT, allowNull: false},
  howToCall: {type: Sequelize.TEXT, allowNull: false},
  calldata: {type: Sequelize.TEXT, allowNull: false},
  replacementPattern: {type: Sequelize.TEXT, allowNull: false},
  metadataHash: {type: Sequelize.TEXT, allowNull: false},
  paymentToken: {type: Sequelize.TEXT, allowNull: false},
  basePrice: {type: Sequelize.TEXT, allowNull: false},
  extra: {type: Sequelize.TEXT, allowNull: false},
  listingTime: {type: Sequelize.TEXT, allowNull: false},
  expirationTime: {type: Sequelize.TEXT, allowNull: false},
  salt: {type: Sequelize.TEXT, allowNull: false},
  v: {type: Sequelize.TEXT, allowNull: false},
  r: {type: Sequelize.TEXT, allowNull: false},
  s: {type: Sequelize.TEXT, allowNull: false}
})

const encodeOrder = (order) => ({
  hash: order.hash,
  metadata: order.metadata,
  exchange: order.exchange,
  maker: order.maker,
  taker: order.taker,
  makerFee: order.makerFee,
  takerFee: order.takerFee,
  feeRecipient: order.feeRecipient,
  side: order.side,
  saleKind: order.saleKind,
  target: order.target,
  howToCall: order.howToCall,
  calldata: order.calldata,
  replacementPattern: order.replacementPattern,
  metadataHash: order.metadataHash,
  paymentToken: order.paymentToken,
  basePrice: order.basePrice,
  extra: order.extra,
  listingTime: order.listingTime,
  expirationTime: order.expirationTime,
  salt: order.salt,
  v: order.v,
  r: order.r,
  s: order.s
})

const decodeOrder = (order) => ({
  hash: order.hash,
  metadata: order.metadata,
  exchange: order.exchange,
  maker: order.maker,
  taker: order.taker,
  makerFee: order.makerFee,
  takerFee: order.takerFee,
  feeRecipient: order.feeRecipient,
  side: order.side,
  saleKind: order.saleKind,
  target: order.target,
  howToCall: order.howToCall,
  calldata: order.calldata,
  replacementPattern: order.replacementPattern,
  metadataHash: order.metadataHash,
  paymentToken: order.paymentToken,
  basePrice: order.basePrice,
  extra: order.extra,
  listingTime: order.listingTime,
  expirationTime: order.expirationTime,
  salt: order.salt,
  v: order.v,
  r: order.r,
  s: order.s
})

module.exports = {
  sequelize: sequelize,
  Order: Order,
  encodeOrder: encodeOrder,
  decodeOrder: decodeOrder
}
