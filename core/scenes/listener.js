import { EventEmitter } from 'events'

import { getContractInstance, subscribeContractAllEvents } from './contract'

const LISTENERS = {}

/**
 * 创建合约事件监听器
 * @param {string} contractMetaName 合约名称枚举
 * @param {object} connection geth 客户端
 * @returns {EventEmitter} 事件监听器
 */
export function createContractEventListener(contractMetaName, connection) {
  let eventBus = new EventEmitter()

  getContractInstance(contractMetaName, connection)
    .then((tokenContract) => {
      subscribeContractAllEvents(tokenContract, (error, result) => {
        if (error) {
          console.log(`contract error : \n${JSON.stringify(error, null, 2)}`)
          throw error
        } else if (result) {
          eventBus.emit(result.event, result, tokenContract.decimal)
        }
      })
    })

  return eventBus
}

/**
 * 创建 eth 事件监听器
 * @returns {EventEmitter} 事件监听器
 */
export function createEthEventListener(connection) {
  let eventBus = new EventEmitter()

  connection
    .eth
    .subscribe('newBlockHeaders')
    .on('data', async ({ hash: blockHash }) => {
      let { transactions } = await connection.eth.getBlock(blockHash)
      if (transactions && transactions.length > 0) {
        // 将异步的任务放在串行队列中处理
        transactions
          .map(txid => () => connection.eth.getTransaction(txid)
            .then((transaction) => {
              if (transaction) {
                let { from, to, value } = transaction
                eventBus.emit('Transaction', {
                  from: connection.eth.extend.utils.toChecksumAddress(from),
                  to: connection.eth.extend.utils.toChecksumAddress(to),
                  value: value,
                })
              }
            }))
          .reduce((prev, next) => prev.then(next), Promise.resolve())
      }
    })

  return eventBus
}

/**
 * 获取监听器对象
 * @param {String} listenerName 监听器名称
 * @return {EventEmitter}
 */
export function getListener(listenerName) {
  if (!LISTENERS[listenerName]) {
    LISTENERS[listenerName] = new EventEmitter()
  }
  return LISTENERS[listenerName]
}
