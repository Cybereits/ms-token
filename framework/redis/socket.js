import redis from 'redis'
import socketRedis from 'socket.io-redis'
import { redis as redisConfig } from '../../config/env.json'

const pub = redis.createClient(redisConfig.port, redisConfig.host, { auth_pass: redisConfig.pwd, db: redisConfig.database })
const sub = redis.createClient(redisConfig.port, redisConfig.host, { auth_pass: redisConfig.pwd, db: redisConfig.database })

export default socketRedis({ pubClient: pub, subClient: sub })
