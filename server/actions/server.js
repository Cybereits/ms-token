import { BigNumber } from 'bignumber.js'
import { GraphQLList as List } from 'graphql'
import { serverStatesResult } from '../types/plainTypes'
import getConnection from '../../core/web3'
import env from '../../config/env.json'

async function getGethClientState(uri) {
  let conn = getConnection(uri)
  if (!conn) {
    return { uri, enable: false }
  }
  let account = await conn.eth.getCoinbase().catch(ex => null)
  if (!account) {
    return { uri, enable: false }
  }
  let currentBlockHeightPromise = conn.eth.getBlockNumber()
  let gasPricePromise = conn.eth.getGasPrice().then(p => new BigNumber(conn.eth.extend.utils.fromWei(p)))
  // 当前区块高度
  let currentBlockHeight = await currentBlockHeightPromise
  // 当前油价
  let gasPrice = await gasPricePromise

  return {
    uri,
    enable: true,
    currentBlockHeight,
    gasPrice: gasPrice.toString(10),
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
