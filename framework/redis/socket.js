import socketRedis from 'socket.io-redis'
import { longConnection } from './index'

export default socketRedis({ pubClient: longConnection, subClient: longConnection })
