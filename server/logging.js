const bunyan = require('bunyan')

const log = bunyan.createLogger({name: 'server', level: 'debug'})

module.exports = log
