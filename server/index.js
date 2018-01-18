const express = require('express')
const bodyParser = require('body-parser')
// const helmet = require('helmet')

const { sequelize, Order, encodeOrder, decodeOrder } = require('./db.js')
const log = require('./logging.js')

const app = express()
// app.use(helmet())
app.use(bodyParser.json())
app.use((req, res, next) => {
  log.debug({path: req.path, method: req.method, ip: req.headers['X-Forwarded-For']}, 'Request received')
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

const router = express.Router()

router.get('/orders', (req, res) => {
  Order.findAll().then(orders => {
    res.json(orders.map(decodeOrder))
  })
})

router.get('/orders/:hash', (req, res) => {
  Order.findOne({hash: req.params.hash}).then(order => {
    res.json(decodeOrder(order))
  })
})

router.post('/orders/post', (req, res) => {
  const order = req.body
  Order.create(encodeOrder(order)).then(() => {
    res.json({result: true, errors: []})
  })
})

router.post('/orders/validate', (req, res) => {
  res.json({result: true, errors: []})
})

app.use('/v1', router)

const go = ({ port }) => {
  sequelize
    .sync()
    .then(() => {
      app.listen(port, () => {
        log.debug({origin: 'express', port: port}, 'Server started')
      })
    })
}

module.exports = {
  go: go
}
