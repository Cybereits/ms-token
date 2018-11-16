import { createContractEventListener } from '../scenes/listener'
import { checkIsSysThenUpdate } from '../scenes/account'
import { saveTxLog } from '../scenes/transaction'
import getConnection from '../web3'

export default function establishContractListener(contractName, connection) {
  if (!connection) {
    connection = getConnection()
  }
  createContractEventListener(contractName, connection)
    .on('Transfer', async ({ returnValues }, contractDecimal) => {
      let { from, to, value } = returnValues
      console.info(`[Transfer Event] - [${contractName}] from ${from} to ${to} value ${value}`)
      saveTxLog(from, to, contractName, (+value / (10 ** +contractDecimal)))
      checkIsSysThenUpdate(from, contractName)
      checkIsSysThenUpdate(to, contractName)
    })
    .on('Error', (err) => {
      console.error(`${contractName} 合约转账事件处理失败：${err.message}`)
    })
  console.info(`启动 ${contractName} 合约转账监听`)
}
