const server = require('./server/index.js')
const config = require('./config.json')

server.go(config)
