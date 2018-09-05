import mongoose from 'mongoose'

import connection from '../../framework/dbProviders/mongo'
import { STATUS } from '../enums'

// 交易操作记录
const transactionRecord = mongoose.Schema({
  // 转账数额
  amount: {
    type: Number,
    required: true,
  },
  // 转出地址
  from: {
    type: String,
    index: true,
    required: true,
  },
  // 转入地址
  to: {
    type: String,
    index: true,
    required: true,
  },
  // 发放状态
  status: {
    type: Number,
    default: STATUS.pending,
    required: true,
  },
  // 代币类型
  tokenType: String,
  // 关联任务 ID
  taskid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'batchTransactionTask',
  },
  // transaction hash
  txid: String,
  // 油价
  gasPrice: String,
  // 油费
  gasFee: String,
  // 交易创建人
  creator: String,
  // 交易发送人
  executer: String,
  // 备注
  comment: String,
  // 异常信息
  exceptionMsg: String,
  // 创建时间
  createAt: {
    type: Date,
    default: () => new Date(),
  },
  // 交易发送时间
  sendTime: Date,
  // 交易确认时间
  confirmTime: Date,
})

export default connection.model('transactionRecord', transactionRecord)
