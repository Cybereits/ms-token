import { syncTransactionState } from '../core/scenes/transaction'

export default async () => syncTransactionState().then(r => true).catch(e => false)
