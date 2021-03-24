import mongoose from 'mongoose'

import { mongo } from '../../config/env.json'

mongoose.Promise = Promise
const { ip, name, port, username, password } = mongo

const db = mongoose
  .createConnection(ip, name, port, {
    user: username,
    pass: password,
    server: {
      auto_reconnect: true,
      poolSize: 10,
    },
  })
  // 成功链接数据库
  .once('open', () => console.log('mongodb has open!'))
  // 链接数据库失败
  .on('error', err => console.error(`mongodb connect error ${err}`))

export default db
