const bunyan = require('bunyan')

const log = bunyan.createLogger({name: 'server', level: 'info'})

module.exports = log
