const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')

const Web3 = require('web3')
const { WyvernProtocol } = require('wyvern-js')

const { validateOrder } = require('./validate.js')
const log = require('./logging.js')
const scan = require('./scan.js')

var protocolInstance

const fail = (req, res, status, err) => {
  log.warn({error: err.message, origin: 'express', path: req.path}, 'Error processing request')
  res.status(status)
  res.json({result: false, error: err.message})
}

const go = (config) => {
  const { sequelize, Op, Order, encodeOrder, decodeOrder } = require('./db.js')(config)

  const { port, provider, network } = config

  const app = express()
  app.use(helmet())
  app.use(bodyParser.json())

  const router = express.Router()

  router.get('/check', (req, res) => {
    res.json({result: true, error: null})
  })

  router.get('/orders', (req, res) => {
    var where = {
      markedInvalid: req.query.markedInvalid === '1',
      cancelledOrFinalized: req.query.cancelledOrFinalized === '1'
    }
    if (req.query.maker) {
      where.maker = req.query.maker
    }
    if (req.query.taker) {
      where.taker = req.query.taker
    }
    if (req.query.paymentToken) {
      where.paymentToken = req.query.paymentToken
    }
    if (req.query.side) {
      where.side = req.query.side
    }
    if (req.query.schema) {
      where.schema = req.query.schema
    }
    if (req.query.saleKind) {
      where.saleKind = req.query.saleKind
    }
    if (req.query.filter) {
      where.title = [Op.like, req.query.filter]
    }
    if (req.query.createdSince) {
      where.createdAt = [Op.ge, parseInt(req.query.createdSince)]
    }
    var order = [['createdAt', 'DESC']]
    if (req.query.order) {
      switch (req.query.order) {
        case '1': order = [['createdAt', 'DESC']]; break
        case '2': order = [['createdAt', 'ASC']]; break
        case '3': order = [['basePrice', 'DESC']]; break
        case '4': order = [['basePrice', 'ASC']]; break
      }
    }
    var limit = req.query.limit ? parseInt(req.query.limit) : 20
    limit = Math.min(100, Math.max(0, limit))
    var offset = req.query.offset ? parseInt(req.query.offset) : 0
    var query = { where, order, limit, offset }
    return Order.findAll(query).then(orders => {
      res.json({result: orders.map(decodeOrder), error: null})
    }).catch(err => {
      fail(req, res, 500, err)
    })
  })

  router.get('/orders/:hash', (req, res) => {
    return Order.findOne({where: {hash: req.params.hash}}).then(order => {
      res.json({result: decodeOrder(order), error: null})
    }).catch(err => {
      fail(req, res, 404, err)
    })
  })

  router.post('/orders/post', (req, res) => {
    const order = req.body
    return validateOrder(protocolInstance, order).then(() => {
      return Order.create(encodeOrder(order)).then(() => {
        res.json({result: true, error: null})
      })
    }).catch(err => {
      fail(req, res, 400, err)
    })
  })

  router.post('/orders/validate', (req, res) => {
    const order = req.body
    return validateOrder(protocolInstance, order).then(() => {
      res.json({result: true, error: null})
    }).catch(err => fail(req, res, 400, err))
  })

  app.use('/v0', router)

  protocolInstance = new WyvernProtocol(new Web3.providers.HttpProvider(provider), { network })
  sequelize
    .sync()
    .then(() => {
      scan(provider, network)
      app.listen(port, () => {
        log.info('Listening on port ' + port)
      })
    })
}

module.exports = { go }
