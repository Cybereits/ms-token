import fetch from 'isomorphic-fetch'

export const getGasPriceFromEtherscan = () =>
  fetch(
    'https://api-cn.etherscan.com/api?module=gastracker&action=gasoracle&apikey=GKKVYS15XJBAWTRKK6BBKZ4BJSYCTDMXEB',
  )
    .then((res) => res.json())
    .then((res) => {
      if (res.status === '1') {
        const { FastGasPrice } = result
        return (+FastGasPrice * 10 ** 9).toString()
      } else {
        throw new Error('从 etherscan 获取 gasPrice 失败')
      }
    })
