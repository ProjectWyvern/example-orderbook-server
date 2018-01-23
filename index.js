const server = require('./server/index.js')
const Web3 = require('web3')

server.go({
  port: 8080,
  provider: new Web3.providers.HttpProvider('https://rinkeby.infura.io'),
  network: 'rinkeby'
})
