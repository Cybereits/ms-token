import { createEthEventListener } from '../scenes/listener'
import { checkIsSysThenUpdate } from '../scenes/account'

export default function establishEthListener(connection) {
  console.info('启动 eth 转账监听')
  createEthEventListener(connection)
    .on('Transaction', ({ from, to, value }) => {
      checkIsSysThenUpdate(from)
      checkIsSysThenUpdate(to)
    })
    .on('Error', (err) => {
      console.error(`eth 转账事件处理失败：${err.message}`)
    })
}
