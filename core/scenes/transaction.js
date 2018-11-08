import { TaskCapsule, ParallelQueue } from 'async-task-manager'

import getConnection from '../../framework/web3'
import { TxRecordModel, BatchTransactinTaskModel } from '../schemas'
import { STATUS } from '../enums'
import { removeTrackedTransaction } from '../redis/transaction'
import { confirmBlockLimitation, confirmTimeoutHours } from '../../config/env.json'

export function editTransaction(transaction, from, to, amount, creator) {
  // 只有交易状态是待处理和失败时才可以编辑
  if (
    transaction.status === STATUS.pending ||
    transaction.status === STATUS.failure
  ) {
    transaction.from = from
    transaction.to = to
    transaction.amount = amount
    transaction.creator = creator
    return transaction.save()
  } else {
    throw new Error('当前转账的状态不支持编辑')
  }
}

export async function deleteTransaction(transaction) {
  if (transaction.status === STATUS.pending) {
    if (transaction.taskid) {
      let task = await BatchTransactinTaskModel.findOne({ _id: transaction.taskid })
      task.count -= 1
      if (task.count <= 0) {
        return Promise.all([transaction.remove(), task.remove()])
      } else {
        return Promise.all([transaction.remove(), task.save()])
      }
    } else {
      return transaction.remove()
    }
  } else {
    throw new Error('只能删除待处理的发送任务')
  }
}

export async function deleteBatchTransactions(txs, taskid) {
  let promises = []
  if (txs && txs.length > 0) {
    txs.forEach((transaction) => {
      if (transaction.status === STATUS.pending) {
        promises.push(transaction.remove())
      }
    })
  }
  if (promises.length > 0) {
    await Promise.all(promises)
  }

  if (taskid) {
    let task = await BatchTransactinTaskModel.findOne({ _id: taskid })
    task.count = await TxRecordModel.count({ taskid })
    if (task.count === 0) {
      return task.remove()
    } else {
      return task.save()
    }
  }

  return true
}

export function sendingTransaction(transaction, txid, username) {
  transaction.status = STATUS.sending
  transaction.txid = txid
  transaction.sendTime = new Date()
  transaction.executer = username
  console.log(`${username} sent ${txid}`)
  return transaction.save()
}

export function confirmTransaction(transaction) {
  removeTrackedTransaction(transaction.txid)
  transaction.status = STATUS.success
  transaction.confirmTime = new Date()
  transaction.exceptionMsg = null
  return transaction.save()
}

export function errorTransaction(transaction, msg) {
  removeTrackedTransaction(transaction.txid)
  transaction.status = STATUS.error
  transaction.exceptionMsg = msg
  console.log(`${transaction.from} to ${transaction.to} tx error: ${msg}`)
  return transaction.save()
}

export function failTransaction(transaction, msg) {
  removeTrackedTransaction(transaction.txid)
  transaction.status = STATUS.failure
  transaction.exceptionMsg = msg
  console.log(`${transaction.from} to ${transaction.to} tx failed: ${msg}`)
  return transaction.save()
}

export async function confirmTransactionByTxid(txid) {
  let transaction = await TxRecordModel.findOne({ txid })
  return confirmTransaction(transaction)
}

export async function failedTransactionByTxid(txid, msg) {
  let transaction = await TxRecordModel.findOne({ txid })
  return failTransaction(transaction, msg)
}

/**
 * 在服务器运行过程中，会对发出的 transaction 的事件进行监听，
 * 理论上来说是不会出现运行过程中没有被追踪的交易
 * 但是也存在着监听过程中服务器重启的可能
 * 所以需要在服务器启动时手动同步一下交易状态
 */
export async function syncTransactionState() {

  let conn = getConnection()

  // 当前区块高度
  let currBlockNumber = await conn.eth.getBlockNumber()

  // 有效区块高度
  let blockHeightLimitation = currBlockNumber - confirmBlockLimitation

  // 需要跟踪的发送中的交易
  let sendingTxs = await TxRecordModel.find({
    status: { $in: [STATUS.sending, STATUS.error] },
  }).catch((ex) => { console.error(`交易状态同步失败 ${ex}`) })

  if (sendingTxs.length > 0) {
    console.log(`将 ${sendingTxs.length} 比交易信息添加到同步队列`)
    // 创建任务队列
    let queue = new ParallelQueue({
      limit: 50,
      toleration: 0,
      span: 100,
    })

    sendingTxs.forEach((transaction) => {
      queue.add(new TaskCapsule(() => new Promise(async (resolve, reject) => {
        let { txid } = transaction
        if (txid) {
          let conn = getConnection()
          console.log(`同步 [${txid}] 的状态`)
          let txReceipt = await conn.eth.getTransactionReceipt(txid).catch(() => false)
          if (txReceipt && txReceipt.blockNumber && txReceipt.blockNumber <= blockHeightLimitation) {
            console.log(`[${txid}] 查询到交易详情 block: [${txReceipt.blockNumber}] status: [${txReceipt.status}]`)
            if (!txReceipt.status) {
              // 发送失败
              failTransaction(transaction, '交易失败，请到 etherscan.io 手动查询出错原因').then(resolve).catch(reject)
            } else if (txReceipt.status) {
              // 确认成功
              confirmTransaction(transaction).then(resolve).catch(reject)
            } else {
              errorTransaction(transaction, `交易发送成功，但执行结果状态码为 ${txReceipt.status}，请到 etherscan.io 手动查询出错原因`).then(resolve).catch(reject)
            }
          } else if (Date.now() - ((1000 * 60 * 60) * confirmTimeoutHours) > new Date(transaction.sendTime)) {
            errorTransaction(transaction, `交易发布 ${confirmTimeoutHours} 小时内没有被确认，请手动校验发送结果`)
          } else {
            // 尚未确认
            resolve()
          }
        } else {
          // 交易失败 没有 txid 却被置为 sending
          errorTransaction(transaction, '缺失 transaction hash 却被标记为 sending').then(resolve).catch(reject)
        }
      })))
    })

    // 消费任务队列
    return queue.consume()
      .then(() => { console.log('交易状态同步完毕') })
      .catch((ex) => { console.error(`交易状态同步失败 ${ex}`) })
  } else {
    console.log('没有需要同步的交易状态')
    return Promise.resolve(true)
  }
}
