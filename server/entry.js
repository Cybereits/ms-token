require('babel-register')({
  presets: [
    [
      'env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
})

require('bignumber.js').BigNumber.config({ DECIMAL_PLACES: 20 })

// 开启 web 服务
require('./app')

const syncTransactionState =
  require('../core/scenes/transaction').syncTransactionState

const handlePendingBalanceUpdateJobs =
  require('../core/scenes/account').handlePendingBalanceUpdateJobs

handlePendingBalanceUpdateJobs()
// 每 25 秒检测一下堆积的账户同步任务
setInterval(handlePendingBalanceUpdateJobs, 1000 * 25)

syncTransactionState()
// 每 60 秒同步一次交易状态
setInterval(syncTransactionState, 1000 * 60)
