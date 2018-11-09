import socketIO from 'socket.io'
import socketRedis from '../framework/redis/socket'

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
