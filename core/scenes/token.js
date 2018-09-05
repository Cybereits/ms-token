import BN from 'bignumber.js'

import getConnection from '../../framework/web3'
import { getConnByAddressThenUnlock } from './account'
import { getContractInstance } from './contract'
import { TOKEN_TYPES, CONTRACT_NAMES, STATUS } from '../enums'
import { ContractMetaModel, TxRecordModel } from '../schemas'
import { publishTransaction, publishConfirmInfo } from '../listeners/transaction'
import { confirmBlockLimitation } from '../../config/env.json'

BN.config({ DECIMAL_PLACES: 5 })

// /**
//  * 获取代币总量（调用totalSupply方法）
//  * @param {*} connect web3链接
//  */
// export async function getTotal(connect) {
//   let tokenContract = await getContractInstance(CONTRACT_NAMES.cre)
//   let amount = await tokenContract.methods.totalSupply().call(null)

//   return amount / (10 ** tokenContract.decimal)
// }

// /**
//  * 查询钱包地址下的代币数额及代币总量，占比等信息
//  * @param {*} userAddress 要查询的钱包地址
//  */
// export async function getTokenBalanceFullInfo(userAddress) {
//   let totalPromise = getTotal(getConnection())
//   let balancePromise = getTokenBalance(userAddress)

//   const tokenTotalAmount = await totalPromise
//   const userBalance = await balancePromise

//   return {
//     total: tokenTotalAmount,
//     userAddress,
//     balance: userBalance,
//     proportion: +(+((userBalance / tokenTotalAmount) * 100).toFixed(2)),
//   }
// }

// /**
//  * 估算发送代币所需油费
//  * @param {string} toAddress 转入地址
//  * @param {number} amount 发送代币数额
//  */
// export async function estimateGasOfSendToken(toAddress, amount) {
//   let tokenContract = await getContractInstance(CONTRACT_NAMES.cre)
//   return tokenContract.methods.Transfer(toAddress, amount).estimateGas()
// }

// /**
//  * 通过输入的数值计算得出对应的代币数额
//  * @param {string|number} inputBigNumber 输入的大数值
//  * @param {number} decimal 合约规定的代币精度
//  * @returns {number} 计算所得代币数额
//  */
// export function getTokenAmountByBigNumber(inputBigNumber, decimal) {
//   let _bigNumber = +inputBigNumber
//   let _multiplier = 10 ** decimal
//   if (isNaN(_bigNumber)) {
//     if (typeof inputBigNumber === 'string') {
//       if (inputBigNumber.indexOf('0x') !== 0) {
//         // 默认加上16进制的前缀
//         _bigNumber = +`0x${inputBigNumber}`
//         if (isNaN(_bigNumber)) {
//           // 如果非有效数值则返回 0
//           return 0
//         }
//       }
//     } else {
//       // 不知道传入的是个什么类型,返回 0
//       return 0
//     }
//   }
//   return _bigNumber / _multiplier
// }

// /**
//  * 解析交易记录中的 input 参数
//  * warning: unsafe
//  * @param {string} inputStr input 参数字符串
//  * @param {number} decimal 合约规定的代币精度
//  * @returns {Array} 解析后的参数数组
//  */
// export function decodeTransferInput(inputStr, decimal) {
//   // Transfer转账的数据格式
//   // 0xa9059cbb0000000000000000000000002abe40823174787749628be669d9d9ae4da8443400000000000000000000000000000000000000000000025a5419af66253c0000
//   let str = inputStr.toString()
//   let seperator = '00000000000000000000000'  // 23个0
//   if (str.length >= 10) {
//     let arr = str.split(seperator)
//     // 参数解析后
//     // 第一个参数是函数的id 16进制格式，不需要改变
//     // 第二个参数是转入地址，加 0x 前缀转换成有效地址
//     arr[1] = `0x${arr[1]}`
//     // 第三个参数是交易的代币数额 需要转换成有效数值
//     arr[2] = getTokenAmountByBigNumber(arr[2], decimal)
//     return arr
//   } else {
//     return [str]
//   }
// }

function releasePromEvent(promEvent) {
  if (promEvent) {
    promEvent.off('confirmation')
    promEvent.off('transactionHash')
  }
  promEvent = null
}

/**
 * 获取指定地址的以太代币余额
 * @param {string} address 钱包地址
 * @returns {number} 以太余额
 */
export async function getEthBalance(address) {
  let conn = getConnection()
  let amount = await conn.eth.getBalance(address)
  return conn.eth.extend.utils.fromWei(amount, 'ether')
}

/**
 * 查询钱包地址下的代币数额
 * @param {*} userAddress 要查询的钱包地址
 * @param {string} contractMetaName 合约名称枚举（默认 cre）
 */
export async function getTokenBalance(userAddress, contractMetaName = CONTRACT_NAMES.cre) {
  let tokenContract = await getContractInstance(contractMetaName)
  let amount = await tokenContract.methods.balanceOf(userAddress).call(null)
  return amount / (10 ** tokenContract.decimal)
}

/**
 * 发送代币
 * @param {string} fromAddress 发送代币的钱包地址
 * @param {string} toAddress 接收代币的钱包地址
 * @param {number} amount 发送代币数额（个）
 * @param {object} options 其它配置（可选）
 */
export async function sendToken(fromAddress, toAddress, amount, options = {}) {
  console.log(`send ${amount} token from ${fromAddress} to ${toAddress}`)
  let _from_addr = fromAddress.trim()
  let _to_addr = toAddress.trim()
  let _amount = new BN(amount)
  if (_amount.lessThanOrEqualTo(0)) {
    throw new Error('忽略转账额度小于等于0的请求')
  } else {
    let {
      tokenType = TOKEN_TYPES.cre,
      gasPrice,
      gas,
    } = options

    let contractMetaPromise = ContractMetaModel.findOne({ symbol: tokenType }, { name: 1 })
    let getConnPromise = getConnByAddressThenUnlock(_from_addr)

    let { name } = await contractMetaPromise
    let conn = await getConnPromise

    // if (!gasPrice) {
    //   gasPrice = await conn.eth.getGasPrice()
    // }

    return new Promise(async (resolve, reject) => {
      let tokenContract = await getContractInstance(name, conn)
      let _multiplier = 10 ** tokenContract.decimal
      let _sendAmount = _amount.mul(_multiplier)

      let promEvent = tokenContract
        .methods
        .transfer(_to_addr, _sendAmount)
        .send({ from: _from_addr, gasPrice, gas })

      promEvent
        .on('transactionHash', (txid) => {
          publishTransaction(txid)
          resolve(txid)
        })
        .on('confirmation', (confirmationNumber, receipt) => {
          if (confirmationNumber >= confirmBlockLimitation) {
            let { transactionHash } = receipt
            publishConfirmInfo(transactionHash)
            releasePromEvent(promEvent)
          }
        })
        .catch(reject)
    })
  }
}

/**
 * 发送以太币
 * @param {string} fromAddress 发送 eth 的地址
 * @param {string} toAddress 接收 eth 的地址
 * @param {number} amount 发送数额（个）
 * @param {object} options 其它配置（可选）
 */
export async function sendETH(fromAddress, toAddress, amount, options = {}) {
  console.log(`send ${amount} eth from ${fromAddress} to ${toAddress}`)
  let _from_addr = fromAddress.trim()
  let _to_addr = toAddress.trim()
  let { gasPrice, gas } = options
  let _amount = new BN(amount)
  if (_amount.lessThanOrEqualTo(0)) {
    throw new Error('忽略转账额度小于等于0的请求')
  } else {
    let conn = await getConnByAddressThenUnlock(_from_addr)

    return new Promise((resolve, reject) => {
      let promEvent = conn.eth.sendTransaction({
        from: _from_addr,
        to: _to_addr,
        value: conn.eth.extend.utils.toWei(_amount.toString(10), 'ether'),
        gasPrice,
        gas,
      })

      promEvent
        .on('transactionHash', (txid) => {
          publishTransaction(txid)
          resolve(txid)
        })
        .on('confirmation', (confirmationNumber, receipt) => {
          if (confirmationNumber >= confirmBlockLimitation) {
            let { transactionHash } = receipt
            publishConfirmInfo(transactionHash)
            releasePromEvent(promEvent)
          }
        })
        .catch(reject)
    })
  }
}

/**
 * 将出账地址下的所有以太转移到指定入账地址
 * @param {string} fromAddress 出账地址
 * @param {string} toAddress 入账地址
 * @param {string} taskID 任务ID
 * @param {string} username 任务发起人
 */
export async function transferAllEth(fromAddress, toAddress, taskID, username) {
  let _from_addr = fromAddress.trim()
  let _to_addr = toAddress.trim()

  if (_to_addr === _from_addr) {
    return
  }

  console.assert(_to_addr, '接收地址不能为空!')

  let connect = getConnection()

  let balancePromise = connect.eth.getBalance(_from_addr)
  let gasPricePromise = connect.eth.getGasPrice()
  let gasFeePromise = connect.eth.estimateGas({ from: _from_addr })

  let total = await balancePromise
  let gasPrice = await gasPricePromise
  let gasFee = await gasFeePromise

  total = new BN(total)
  gasPrice = new BN(gasPrice)
  gasFee = new BN(gasFee)

  let txCost = gasPrice.mul(gasFee)
  let transAmount = connect.eth.extend.utils.fromWei(total.minus(txCost).toString(10))

  // 创建转账的交易实体
  return TxRecordModel.create({
    amount: transAmount,
    from: _from_addr,
    to: _to_addr,
    tokenType: TOKEN_TYPES.eth,
    taskid: taskID,
    status: STATUS.pending,
    creator: username,
    gasPrice: gasPrice.toString(10),
    gasFee: gasFee.toString(10),
  })
}

export async function transferAllTokens(fromAddress, toAddress, taskID, username, tokenType) {
  let _from_addr = fromAddress.trim()
  let _to_addr = toAddress.trim()

  if (_to_addr === _from_addr) {
    return
  }

  console.assert(_to_addr, '接收地址不能为空!')

  let contractMetaPromise = ContractMetaModel.findOne({ symbol: tokenType }, { name: 1 })
  let { name } = await contractMetaPromise
  let amount = await getTokenBalance(fromAddress, name)

  return TxRecordModel.create({
    amount,
    from: _from_addr,
    to: _to_addr,
    tokenType,
    taskid: taskID,
    status: STATUS.pending,
    creator: username,
  })
}
