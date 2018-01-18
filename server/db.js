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
})

module.exports = {
  sequelize: sequelize,
  Order: Order
}
