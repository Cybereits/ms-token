import { BigNumber } from 'bignumber.js'
import { GraphQLList as List } from 'graphql'
import { serverStatesResult } from '../types/plainTypes'
import getConnection from '../../framework/web3'
import env from '../../config/env.json'

async function getGethClientState(uri) {
  let conn = getConnection(uri)
  if (!conn) {
    return { uri }
  }
  let account = await conn.eth.getCoinbase().catch(ex => null)
  if (!account) {
    return { uri }
  }
  let currentBlockHeightPromise = conn.eth.getBlockNumber()
  let gasPricePromise = conn.eth.getGasPrice().then(p => new BigNumber(conn.eth.extend.utils.fromWei(p)))
  let gasFeePromise = conn.eth.estimateGas({ from: account }).then(f => new BigNumber(f))
  // 当前区块高度
  let currentBlockHeight = await currentBlockHeightPromise
  // 当前油价
  let gasPrice = await gasPricePromise
  // 当前转账手续费
  let gasFee = await gasFeePromise

  return {
    uri,
    currentBlockHeight,
    gasPrice: gasPrice.toString(10),
    gasFee: gasFee.toString(10),
    gasCost: gasFee.mul(gasPrice).toString(10),
  }
}

export const serverStates = {
  type: new List(serverStatesResult),
  description: '服务器状态查询',
  async resolve() {
    let clients = env.clients
    let result = clients.map(clientUri => getGethClientState(clientUri))
    return Promise.all(result)
  },
}
