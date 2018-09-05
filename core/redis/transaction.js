import { tempConnection } from '../../framework/redis'

const SET_NAMES = {
  trackedTx: 'tracked_transactions',
}

export function addTrackedTransaction(txid) {
  if (txid) {
    return tempConnection.sadd(SET_NAMES.trackedTx, txid)
  }
}

export function removeTrackedTransaction(txid) {
  if (txid) {
    return tempConnection.srem(SET_NAMES.trackedTx, txid)
  }
}

export function getTrackedTransactions() {
  return tempConnection.smembers(SET_NAMES.trackedTx)
}
