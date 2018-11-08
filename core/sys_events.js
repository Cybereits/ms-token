import socketIO from 'socket.io'
import socketRedis from '../framework/redis/socket'

let establishedSocketService = null

const EVENT_TYPES = {
  txDetected: 'txDetected',
  txConfirmed: 'txConfirmed',
  txError: 'txError',
  balanceUpdated: 'balanceUpdated',
  clientError: 'clientError',
}

function startSocketService(server) {
  establishedSocketService = new Promise((resolve) => {
    // 建立套接字服务器
    const io = socketIO(server, { path: '/io' })

    // 挂接 redis adapter
    io.adapter(socketRedis)

    // 监听链接事件
    io.on('connection', (socket) => {
      console.info('socket connection established')
      socket.emit('connected')
    })

    resolve(io)
  })
}

function broadcast(event_name, data) {
  establishedSocketService.then(async service => service.emit(event_name, data))
}

export {
  startSocketService,
  broadcast,
}
