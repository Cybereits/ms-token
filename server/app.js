import http from 'http'
import Koa from 'koa'
import cors from 'koa2-cors'
import session from 'koa-session'
import serve from 'koa-static'
import bodyParser from 'koa-bodyparser'

import router from './routes'
import { port, keys, origin } from '../config/env.json'
import { startSocketService } from '../core/sys_events'

const app = new Koa()
const server = http.createServer(app.callback())

app.use(cors({ origin, credentials: true }))

app.use(bodyParser({ enableTypes: ['json', 'form', 'text'] }))
app.keys = keys // koa-session need this
app.use(session({ key: 'sess', httpOnly: false }, app))

// 静态资源不需要身份验证
app.use(serve(`${__dirname}/../static`))

// 身份验证只留给数据路由
app.use(router.routes())

// 开启套接字服务
startSocketService(server)

app
  .on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error
    }

    let bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`)
        process.exit(1)
        break
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`)
        process.exit(1)
        break
      default:
        console.error(error.code)
        break
    }
  })
  .listen(port, () => { console.info(`Listening on ${port}`) })
