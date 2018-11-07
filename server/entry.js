require('babel-register')({
  presets: [
    [
      'env',
      {
        'targets': {
          'node': 'current',
        },
      },
    ],
  ],
})

require('bignumber.js').BigNumber.config({ DECIMAL_PLACES: 20 })

// 开启 web 服务
require('./app')
// 开启合约监听
require('../core/listeners')
// 同步一次交易状态
require('../core/scenes/transaction').syncTransactionState()

const handlePendingBalanceUpdateJobs = require('../core/scenes/account').handlePendingBalanceUpdateJobs
// 每 25 秒检测一下堆积的账户同步任务
setInterval(handlePendingBalanceUpdateJobs, 1000 * 25)
