import { createContractEventListener } from '../scenes/listener'
import { checkIsSysThenUpdate } from '../scenes/account'

export default function establishContractListener(contractName, connection) {
  console.info(`启动 ${contractName} 合约转账监听`)
  createContractEventListener(contractName, connection)
    .on('Transfer', async ({ returnValues }) => {
      let { from, to } = returnValues
      console.info(`[Transfer Event] - [${contractName}] from ${from} to ${to}`)
      checkIsSysThenUpdate(from) // 因为要花费油费 所以检查更新发送方的以太账户
      checkIsSysThenUpdate(from, contractName)
      checkIsSysThenUpdate(to, contractName)
    })
    .on('Error', (err) => {
      console.error(`${contractName} 合约转账事件处理失败：${err.message}`)
    })
}
