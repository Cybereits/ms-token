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

// 开启 web 服务
require('./app')
// 开启合约监听
require('../core/listeners')
// 同步一次交易状态
require('../core/scenes/transaction').syncTransactionState()
