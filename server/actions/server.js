import { BigNumber } from 'bignumber.js'
import { serverStatesResult } from '../types/plainTypes'
import getConnection from '../../framework/web3'

BigNumber.config({
  DECIMAL_PLACES: 20,
})

export const serverStates = {
  type: serverStatesResult,
  description: '代币类型枚举类型',
  async resolve() {
    let conn = getConnection()
    let accounts = await conn.eth.getAccounts()
    let currentBlockHeightPromise = conn.eth.getBlockNumber()
    let gasPricePromise = conn.eth.getGasPrice().then(p => new BigNumber(conn.eth.extend.utils.fromWei(p)))
    let gasFeePromise = conn.eth.estimateGas({ from: accounts[0] }).then(f => new BigNumber(f))
    // 当前区块高度
    let currentBlockHeight = await currentBlockHeightPromise
    // 当前油价
    let gasPrice = await gasPricePromise
    // 当前转账手续费
    let gasFee = await gasFeePromise

    console.log(typeof gasFee)
    console.log(typeof gasPrice)

    return {
      currentBlockHeight,
      gasPrice: gasPrice.toString(10),
      gasFee: gasFee.toString(10),
      gasCost: gasFee.mul(gasPrice).toString(10),
    }
  },
}
