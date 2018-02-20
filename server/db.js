const Sequelize = require('sequelize')
const _ = require('lodash')

const log = require('./logging.js')

module.exports = (config) => {
  const sequelize = new Sequelize(config.db_name, config.db_user, config.db_pass, {
    host: config.db_host,
    dialect: 'postgres',
    pool: {max: 25, min: 0, acquire: 30000, idle: 10000},
    operatorsAliases: false,
    logging: (msg) => log.debug({origin: 'sequelize'}, msg)
  })

  const Synced = sequelize.define('synced', {
    what: {type: Sequelize.TEXT, allowNull: false, primaryKey: true},
    blockNumber: {type: Sequelize.DECIMAL, allowNull: false}
  })

  const Asset = sequelize.define('asset', {
    hash: {type: Sequelize.TEXT, allowNull: false, primaryKey: true},
    owner: {type: Sequelize.TEXT, allowNull: true},
    schema: {type: Sequelize.TEXT, allowNull: false},
    schemaVersion: {type: Sequelize.INTEGER, allowNull: false},
    asset: {type: Sequelize.JSONB, allowNull: false},
    formatted: {type: Sequelize.JSONB, allowNull: false}
  }, {
    indexes: [
      {name: 'assets_owner_index', method: 'BTREE', fields: ['owner']},
      {name: 'assets_schema_index', method: 'BTREE', fields: ['schema']},
      {name: 'assets_createdAt_index', method: 'BTREE', fields: ['createdAt']},
      {name: 'assets_updatedAt_index', method: 'BTREE', fields: ['updatedAt']}
    ],
    version: true
  })

  const Settlement = sequelize.define('settlement', {
    transactionHashIndex: {type: Sequelize.TEXT, allowNull: false, primaryKey: true},
    timestamp: {type: Sequelize.INTEGER, allowNull: false},
    maker: {type: Sequelize.TEXT, allowNull: false},
    taker: {type: Sequelize.TEXT, allowNull: false},
    price: {type: Sequelize.TEXT, allowNull: false},
    metadata: {type: Sequelize.TEXT, allowNull: false}
  }, {
    indexes: [
      {name: 'settlements_timestamp_index', method: 'BTREE', fields: ['timestamp']},
      {name: 'settlements_maker_index', method: 'BTREE', fields: ['maker']},
      {name: 'settlements_taker_index', method: 'BTREE', fields: ['taker']},
      {name: 'settlements_price_index', method: 'BTREE', fields: ['price']}
    ]
  })

  const Order = sequelize.define('order', {
    hash: {type: Sequelize.TEXT, allowNull: false, primaryKey: true},
    metadata: {type: Sequelize.JSONB, allowNull: false},
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
    staticTarget: {type: Sequelize.TEXT, allowNull: false},
    staticExtradata: {type: Sequelize.TEXT, allowNull: false},
    paymentToken: {type: Sequelize.TEXT, allowNull: false},
    basePrice: {type: Sequelize.TEXT, allowNull: false},
    extra: {type: Sequelize.TEXT, allowNull: false},
    listingTime: {type: Sequelize.TEXT, allowNull: false},
    expirationTime: {type: Sequelize.TEXT, allowNull: false},
    salt: {type: Sequelize.TEXT, allowNull: false},
    v: {type: Sequelize.TEXT, allowNull: false},
    r: {type: Sequelize.TEXT, allowNull: false},
    s: {type: Sequelize.TEXT, allowNull: false},
    cancelledOrFinalized: {type: Sequelize.BOOLEAN, allowNull: false},
    markedInvalid: {type: Sequelize.BOOLEAN, allowNull: false}
  }, {
    indexes: [
      {name: 'orders_listingTime_index', method: 'BTREE', fields: ['listingTime']},
      {name: 'orders_expirationTime_index', method: 'BTREE', fields: ['expirationTime']},
      {name: 'orders_maker_index', method: 'BTREE', fields: ['maker']},
      {name: 'orders_taker_index', method: 'BTREE', fields: ['taker']},
      {name: 'orders_createdAt_index', method: 'BTREE', fields: ['createdAt']},
      {name: 'orders_updatedAt_index', method: 'BTREE', fields: ['updatedAt']}
    ],
    version: true
  })

  Asset.hasMany(Order, { as: 'orders', foreignKey: { name: 'assetId', allowNull: false }, onDelete: 'CASCADE' })
  Order.belongsTo(Asset, { as: 'asset', foreignKey: { name: 'assetId', allowNull: false }, onDelete: 'CASCADE' })
  Order.hasOne(Settlement, { as: 'settlement', foreignKey: { name: 'orderId', allowNull: false }, onDelete: 'CASCADE' })
  Settlement.belongsTo(Order, { as: 'order', foreignKey: { name: 'orderId', allowNull: false }, onDelete: 'CASCADE' })

  /* Enforce immutability rules, just to be safe. */
  const afterSync = async () => {
    await sequelize.query('CREATE OR REPLACE RULE assets_append_only AS ON DELETE TO assets DO INSTEAD NOTHING')
    await sequelize.query('CREATE OR REPLACE RULE settlements_append_only AS ON DELETE TO settlements DO INSTEAD NOTHING')
    await sequelize.query('CREATE OR REPLACE RULE settlements_immutable AS ON UPDATE TO settlements DO INSTEAD NOTHING')
    await sequelize.query('CREATE OR REPLACE RULE orders_append_only AS ON DELETE TO orders DO INSTEAD NOTHING')
  }

  const encodeOrder = (order, assetHash) => _.merge(order, {cancelledOrFinalized: false, markedInvalid: false, assetId: assetHash})

  var decodeAsset
  var decodeSettlement
  var decodeOrder

  decodeAsset = asset => {
    asset = _.omit((asset.toJSON ? asset.toJSON() : asset), ['createdAt', 'updatedAt', 'version'])
    if (asset.orders) {
      asset.orders = asset.orders.map(decodeOrder)
    }
    return asset
  }

  decodeSettlement = settlement => {
    settlement = _.omit((settlement.toJSON ? settlement.toJSON() : settlement), ['createdAt', 'updatedAt', 'orderId'])
    if (settlement.order) {
      settlement.order = decodeOrder(settlement.order)
    }
    return settlement
  }

  decodeOrder = (order) => {
    order = _.omit((order.toJSON ? order.toJSON() : order), ['createdAt', 'updatedAt', 'assetId', 'version'])
    if (order.asset) {
      order.asset = decodeAsset(order.asset)
    }
    if (order.settlement) {
      order.settlement = _.omit(decodeSettlement(order.settlement), ['orderId'])
    }
    return order
  }

  return {
    sequelize,
    Sequelize,
    Op: Sequelize.Op,
    afterSync,
    Synced,
    Asset,
    Settlement,
    Order,
    encodeOrder,
    decodeOrder,
    decodeAsset,
    decodeSettlement
  }
}
