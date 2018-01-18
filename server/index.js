const express = require('express')
const bodyParser = require('body-parser')

const { sequelize } = require('./db.js')
const log = require('./logging.js')

const app = express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  log.debug({path: req.path, method: req.method, ip: req.headers['X-Forwarded-For']}, 'Request received')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

const go = ({ port }) => {
  sequelize
    .sync()
    .then(() => {
      app.listen(port, () => {
        log.debug({port: port}, 'Server started')
      })
    })
}

module.exports = {
  go: go
}
