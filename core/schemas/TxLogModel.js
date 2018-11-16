import mongoose from 'mongoose'

import connection from '../../framework/dbProviders/mongo'

// 交易日志
const txLogs = mongoose.Schema({
  // 交易发送方
  from: {
    type: String,
    required: true,
  },
  // 交易接收方
  to: {
    type: String,
    required: true,
  },
  // 发送代币数量
  amount: {
    type: Number,
    required: true,
  },
  // 代币类型
  type: {
    type: String,
    required: true,
  },
  // 任务创建时间
  createAt: {
    type: Date,
    default: () => new Date(),
  },
})

export default connection.model('txLogs', txLogs)
