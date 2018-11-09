import socketIO from 'socket.io'
import socketRedis from '../framework/redis/socket'
import { broadcastBalanceUpdateEvent } from './scenes/account'

let socketService = null

export const EVENT_TYPES = {
  txDetected: 'txDetected',
  txConfirmed: 'txConfirmed',
  txError: 'txError',
  gethError: 'gethError',
  gethEnable: 'gethEnable',
  serverState: 'serverState',
  balanceUpdated: 'balanceUpdated',
  connected: 'connected',
}

function startSocketService(server) {
  // 建立套接字服务器
  socketService = socketIO(server, { path: '/io' })

  // 挂接 redis adapter
  socketService.adapter(socketRedis)

  // 监听链接事件
  socketService.on('connection', (socket) => {
    console.info('socket connection established')
    socket.emit(EVENT_TYPES.connected, 'Connected Ò.Ò')
    // 这个地方应该好好整理一下，现在将就着这么做了
    // 首先这样会产生循环依赖，publisher 不应该引用场景下的实现
    // 其次这里是广播 不合理 应该是针对 socket 的 emit
    broadcastBalanceUpdateEvent()
  })

  return socketService
}

function broadcast(event_name, data) {
  let payload = data
  if (typeof payload === 'object') {
    payload = JSON.stringify(payload)
  }
  if (socketService) {
    socketService.emit(event_name, payload)
  }
}

export {
  startSocketService,
  broadcast,
}
