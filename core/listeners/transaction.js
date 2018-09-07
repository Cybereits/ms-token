import { getListener } from '../scenes/listener'
import { addTrackedTransaction, removeTrackedTransaction } from '../redis/transaction'
import { confirmTransactionByTxid, failedTransactionByTxid } from '../scenes/transaction'

const LISTENER_NAME = '__transaction_listener'

const EVENTS = {
  sendTransaction: 'sendTx',
  confirm: 'confirm',
  failed: 'failed',
}

let txListener = null

export default function establishTransactionListener() {
  txListener = getListener(LISTENER_NAME)

  txListener.on(EVENTS.sendTransaction, (txid) => {
    addTrackedTransaction(txid)
    console.log(`[transaction sent]: ${txid}`)
  })

  txListener.on(EVENTS.confirm, (txid) => {
    removeTrackedTransaction(txid)
    confirmTransactionByTxid(txid)
    console.log(`[transaction confirmed]: ${txid}`)
  })

  txListener.on(EVENTS.failed, ([txid, msg]) => {
    removeTrackedTransaction(txid)
    failedTransactionByTxid(txid, msg || '交易失败，请到 etherscan.io 手动查询出错原因')
    console.log(`[transaction failed]: ${txid}`)
  })
}

export function publishConfirmInfo(txid) {
  txListener.emit(EVENTS.confirm, txid)
}

export function publishTransaction(txid) {
  txListener.emit(EVENTS.sendTransaction, txid)
}

export function publishFailedInfo(txid, msg) {
  txListener.emit(EVENTS.failed, [txid, msg])
}
