/**
 * 由于 geth 钱包的 dev 模式经常会短线并丢失已部署的合约数据
 * 所以创建一个 dev 模式下的启动任务
 * 构造一个纯净的开发环境
*/
import getConnection from '../core/web3'
import { tempConnection } from '../framework/redis/index'
import { saveEternalStringCache } from '../core/redis/cache'
import { EthAccountModel, BatchTransactinTaskModel, TxRecordModel, TxLogModel, ContractMetaModel } from '../core/schemas/index'
import syncAccounts from './syncAllAccounts'

export default async function () {
  let conn = getConnection()
  if (conn) {
    let accounts = await conn.eth.getAccounts()
    let account = accounts[0]
    if (account) {
      console.log('清空以前的记录')
      await Promise.all([
        EthAccountModel.remove({}),
        ContractMetaModel.remove({}),
        BatchTransactinTaskModel.remove({}),
        TxRecordModel.remove({}),
        TxLogModel.remove({}),
      ])

      await tempConnection.del('ms_token_eternal_cache_table')
      await tempConnection.del('ms_token_sync_task_queue')
      await tempConnection.del('tracked_transactions')

      let checksumAddress = conn.eth.extend.utils.toChecksumAddress(account)
      saveEternalStringCache([checksumAddress])

      console.log('创建数据库记录')
      await EthAccountModel.create({
        account: checksumAddress,
        comment: '矿工钱包',
        group: conn.__uri,
      })

      // 最后同步一下账户信息
      return syncAccounts()
    } else {
      return false
    }
  } else {
    return false
  }
}
