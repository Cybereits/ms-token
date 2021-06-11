import BN from 'bignumber.js'

import getConnection from '../web3'
import { addTrackedTransaction } from '../redis/transaction'
import { getConnByAddressThenUnlock } from './account'
import { getContractInstance } from './contract'
import {
  confirmTransactionByTxid,
  failedTransactionByTxid,
} from './transaction'
import { TOKEN_TYPES, CONTRACT_NAMES, STATUS } from '../enums'
import { ContractMetaModel, TxRecordModel } from '../schemas'
import { confirmBlockLimitation } from '../../config/env.json'
import { getGasPriceFromEtherscan } from '../etherscan'

function confirmTx(txid) {
  confirmTransactionByTxid(txid)
  console.log(`[transaction confirmed]: ${txid}`)
}

function sendTx(txid) {
  addTrackedTransaction(txid)
  console.log(`[transaction sent]: ${txid}`)
}

function rejectTx(txid, msg) {
  failedTransactionByTxid(
    txid,
    msg || '交易失败，请到 etherscan.io 手动查询出错原因',
  )
  console.log(`[transaction failed]: ${txid}`)
}

function releasePromEvent(promEvent) {
  if (promEvent) {
    promEvent.off('confirmation')
    promEvent.off('transactionHash')
  }
  promEvent = null
}

function onConfirmationWithEvent(promEvent) {
  return async (confirmationNumber, receipt) => {
    let { transactionHash, status } = receipt

    if (confirmationNumber % 4 === 0) {
      console.log(
        `txid ${transactionHash} was confirmed by ${
          confirmationNumber + 1
        } blocks, status: ${status}`,
      )
    }

    if (!status) {
      // 执行失败
      rejectTx(transactionHash)
      releasePromEvent(promEvent)
    } else if (confirmationNumber >= confirmBlockLimitation) {
      confirmTx(transactionHash)
      releasePromEvent(promEvent)
    }
    // else: still waiting for confirmation...
  }
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
export async function getTokenBalance(
  userAddress,
  contractMetaName = CONTRACT_NAMES.cre,
) {
  let tokenContract = await getContractInstance(contractMetaName)
  let amount = await tokenContract.methods.balanceOf(userAddress).call(null)
  return amount / 10 ** tokenContract.decimal
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
  let _amount = new BN(amount.toString(10))
  let { tokenType = TOKEN_TYPES.cre, gasPrice, gas } = options

  let contractMetaPromise = ContractMetaModel.findOne(
    { symbol: tokenType },
    { name: 1 },
  )
  let getConnPromise = getConnByAddressThenUnlock(_from_addr)

  // 本地获取的 gasPrice 不准确，用 etherscan 的最优 gasPrice
  gasPrice = await getGasPriceFromEtherscan()

  let { name } = await contractMetaPromise
  let conn = await getConnPromise

  return new Promise(async (resolve, reject) => {
    let tokenContract = await getContractInstance(name, conn)
    let _multiplier = 10 ** tokenContract.decimal
    let _sendAmount = _amount.mul(_multiplier)

    let promEvent = tokenContract.methods
      .transfer(_to_addr, _sendAmount.toString(10))
      .send({ from: _from_addr, gasPrice, gas })

    promEvent
      .on('transactionHash', (txid) => {
        sendTx(txid)
        resolve(txid)
      })
      .on('confirmation', onConfirmationWithEvent(promEvent))
      .catch(reject)
  })
}

/**
 * 发送以太币
 * @param {string} fromAddress 发送 eth 的地址
 * @param {string} toAddress 接收 eth 的地址
 * @param {number} amount 发送数额（个）
 * @param {object} options 其它配置（可选）
 */
export async function sendETH(fromAddress, toAddress, amount, options) {
  let _from_addr = fromAddress.trim()
  let _to_addr = toAddress.trim()
  let { gasPrice, gas } = options
  let _amount = new BN(amount.toString(10))
  let conn = await getConnByAddressThenUnlock(_from_addr)

  // 本地获取的 gasPrice 不准确，用 etherscan 的最优 gasPrice
  gasPrice = await getGasPriceFromEtherscan()

  console.log(
    `send ${amount} eth from ${fromAddress} to ${toAddress}, gasPrice ${gasPrice}, gas ${gas}`,
  )

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
        sendTx(txid)
        resolve(txid)
      })
      .on('confirmation', onConfirmationWithEvent(promEvent))
      .catch(reject)
  })
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
  let gasPricePromise = getGasPriceFromEtherscan()
  let gasFeePromise = connect.eth.estimateGas({ from: _from_addr })

  let total = await balancePromise
  let gasPrice = await gasPricePromise
  let gasFee = await gasFeePromise

  total = new BN(total)
  gasPrice = new BN(gasPrice)
  gasFee = new BN(gasFee)

  let txCost = gasPrice.mul(gasFee)
  let transAmount = connect.eth.extend.utils.fromWei(
    total.minus(txCost).toString(10),
  )

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

export async function transferAllTokens(
  fromAddress,
  toAddress,
  taskID,
  username,
  tokenType,
) {
  let _from_addr = fromAddress.trim()
  let _to_addr = toAddress.trim()

  if (_to_addr === _from_addr) {
    return
  }

  console.assert(_to_addr, '接收地址不能为空!')

  let contractMetaPromise = ContractMetaModel.findOne(
    { symbol: tokenType },
    { name: 1 },
  )
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
