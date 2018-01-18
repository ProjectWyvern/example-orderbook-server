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
  hash: {type: Sequelize.TEXT, allowNull: false, unique: true},
  metadata: {type: Sequelize.JSON, allowNull: false},
  exchange: {type: Sequelize.TEXT, allowNull: false},
  initiator: {type: Sequelize.TEXT, allowNull: false},
  side: {type: Sequelize.INTEGER.UNSIGNED, allowNull: false},
  saleKind: {type: Sequelize.INTEGER.UNSIGNED, allowNull: false},
  target: {type: Sequelize.TEXT, allowNull: false},
  howToCall: {type: Sequelize.INTEGER.UNSIGNED, allowNull: false},
  calldata: {type: Sequelize.TEXT, allowNull: false},
  replacementPattern: {type: Sequelize.TEXT, allowNull: false},
  metadataHash: {type: Sequelize.TEXT, allowNull: false},
  paymentToken: {type: Sequelize.TEXT, allowNull: false},
  basePrice: {type: Sequelize.TEXT, allowNull: false},
  extra: {type: Sequelize.TEXT, allowNull: false},
  listingTime: {type: Sequelize.TEXT, allowNull: false},
  expirationTime: {type: Sequelize.TEXT, allowNull: false},
  frontend: {type: Sequelize.TEXT, allowNull: false},
  salt: {type: Sequelize.TEXT, allowNull: false}
})

const encodeOrder = (order) => ({
  hash: order.hash,
  metadata: order.metadata,
  exchange: order.exchange,
  initiator: order.initiator,
  side: order.side,
  saleKind: order.saleKind,
  target: order.target,
  howToCall: order.howToCall,
  calldata: order.calldata,
  replacementPattern: order.replacementPattern,
  metadataHash: order.metadataHash,
  paymentToken: order.paymentToken,
  basePrice: JSON.stringify(order.basePrice),
  extra: JSON.stringify(order.extra),
  listingTime: JSON.stringify(order.listingTime),
  expirationTime: JSON.stringify(order.expirationTime),
  frontend: order.frontend,
  salt: JSON.stringify(order.salt)
})

const decodeOrder = (order) => ({
  hash: order.hash,
  metadata: order.metadata,
  exchange: order.exchange,
  initiator: order.initiator,
  side: order.side,
  saleKind: order.saleKind,
  target: order.target,
  howToCall: order.howToCall,
  calldata: order.calldata,
  replacementPattern: order.replacementPattern,
  metadataHash: order.metadataHash,
  paymentToken: order.paymentToken,
  basePrice: JSON.parse(order.basePrice),
  extra: JSON.parse(order.extra),
  listingTime: JSON.parse(order.listingTime),
  expirationTime: JSON.parse(order.expirationTime),
  frontend: order.frontend,
  salt: JSON.parse(order.salt)
})

module.exports = {
  sequelize: sequelize,
  Order: Order,
  encodeOrder: encodeOrder,
  decodeOrder: decodeOrder
}
