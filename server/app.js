import http from 'http'
import Koa from 'koa'
import cors from 'koa2-cors'
import session from 'koa-session'
import serve from 'koa-static'
import bodyParser from 'koa-bodyparser'

import router from './routes'
import { port, keys, origin } from '../config/env.json'
import { startSocketService } from '../core/eventsPublisher'

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

server.listen(port, () => { console.info(`---Server established on port: ${port}---`) })
