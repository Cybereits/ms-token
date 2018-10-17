import { tempConnection } from '../../framework/redis'

const TRACKED_TX_SET_NAME = 'tracked_transactions'

/**
 * 添加需要跟踪的交易
 * @param {String} txid 交易hash
 */
export function addTrackedTransaction(txid) {
  if (txid) {
    return tempConnection.sadd(TRACKED_TX_SET_NAME, txid)
  }
}

/**
 * 移除需要跟踪的交易
 * @param {String} txid 交易hash
 */
export function removeTrackedTransaction(txid) {
  if (txid) {
    return tempConnection.srem(TRACKED_TX_SET_NAME, txid)
  }
}

/**
 * 获取需要跟踪的交易
 */
export function getTrackedTransactions() {
  return tempConnection.smembers(TRACKED_TX_SET_NAME)
}
