const canSettleOrder = async (web3, protocolInstance, order) => {
  const proxyABI = {'constant': false, 'inputs': [{'name': 'dest', 'type': 'address'}, {'name': 'howToCall', 'type': 'uint8'}, {'name': 'calldata', 'type': 'bytes'}], 'name': 'proxy', 'outputs': [{'name': 'success', 'type': 'bool'}], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}
  const proxy = await protocolInstance.wyvernProxyRegistry.proxies.callAsync(order.maker)
  const contract = (web3.eth.contract([proxyABI])).at(proxy)
  return new Promise((resolve, reject) => {
    contract.proxy.call(order.target, order.howToCall, order.calldata, {from: order.maker}, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

module.exports = { canSettleOrder }
