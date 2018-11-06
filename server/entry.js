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
// 我就是想要少点重复的查询而已
// 妈蛋 我就是不装 node-schedule
// 真蛋疼 我tm都笑了
setInterval(handlePendingBalanceUpdateJobs, 1000 * 60 * 2)
