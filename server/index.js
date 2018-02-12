const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const { WyvernProtocol } = require('wyvern-js')

const { sequelize, Order, encodeOrder, decodeOrder } = require('./db.js')
const log = require('./logging.js')
const scan = require('./scan.js')

const assertEqual = (a, b, msg) => {
  if (a !== b) throw new Error(msg + ': ' + a + ', ' + b)
}

const fail = (req, res, status, err) => {
  log.warn({error: err.message, origin: 'express', path: req.path}, 'Error processing request')
  res.status(status)
  res.json({result: false, error: err.message})
}

const app = express()
app.use(helmet())
app.use(bodyParser.json())
app.use((req, res, next) => {
  const start = Date.now() / 1000
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
  const end = Date.now() / 1000
  log.debug({origin: 'express', diff: end - start, path: req.path, method: req.method, ip: req.headers['X-Forwarded-For']}, 'Request handled')
})

const router = express.Router()

router.get('/orders', (req, res) => {
  return Order.findAll({where: {cancelledOrFinalized: false}}).then(orders => {
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

const validateOrder = async (order) => {
  const orderHash = WyvernProtocol.getOrderHashHex(order)
  assertEqual(orderHash, order.hash, 'Expected provided order hash to match calculated hash')
}

router.post('/orders/post', (req, res) => {
  const order = req.body
  return validateOrder(order).then(() => {
    return Order.create(encodeOrder(order)).then(() => {
      res.json({result: true, error: null})
    })
  }).catch(err => {
    fail(req, res, 400, err)
  })
})

router.post('/orders/validate', (req, res) => {
  const order = req.body
  return validateOrder(order).then(() => {
    res.json({result: true, error: null})
  }).catch(err => fail(req, res, 400, err))
})

app.use('/v1', router)

const go = ({ port, provider, network, production }) => {
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
