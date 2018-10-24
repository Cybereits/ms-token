import { createEthEventListener } from '../scenes/listener'
import { checkIsSysThenUpdate } from '../scenes/account'

export default function establishEthListener() {
  console.info('启动 eth 转账监听')
  // eth 转账事件监听
  createEthEventListener()
    .on('Transaction', ({ from, to }) => {
      console.info(`[Transfer Event] - [Ether] from ${from} to ${to}`)
      checkIsSysThenUpdate(from)
      checkIsSysThenUpdate(to)
    })
    .on('Error', (err) => {
      console.error(`eth 转账事件处理失败：${err.message}`)
    })
}
