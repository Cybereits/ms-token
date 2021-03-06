import { getAllTokenContracts } from '../scenes/contract'

import establishEthListener from './eth'
import establishContractListener from './contract'

export default function ohDamnItThatIsSoStupid(connection) {
  // eth 转账事件监听
  establishEthListener(connection)
  // 监听所有已存在的代币合约的转账事件
  getAllTokenContracts()
    .then(res => res.map(({ name }) => name))
    .then((tokenContractNames) => {
      tokenContractNames.forEach((contractName) => {
        establishContractListener(contractName, connection)
      })
    })
}
