import { TaskCapsule, ParallelQueue } from 'async-task-manager'

import { EthAccountModel } from '../schemas'
import { addAccountSyncInfo, removeAccountSyncInfo, getAllAccountSyncInfo } from '../redis/queue'
import { existEternalString } from '../redis/cache'
import { broadcast, EVENT_TYPES } from '../eventsPublisher'
import getConnection from '../web3'
import { getEthBalance, getTokenBalance } from './token'
import { getTokenContractMeta, getAllTokenContracts } from './contract'

export function unlockAccount(connect, unlockAccount, passWord) {
  return connect.eth.personal.unlockAccount(unlockAccount, passWord, 20)
}

export function lockAccount(connect, lockAccount) {
  return connect.eth.personal.lockAccount(lockAccount)
}

/**
 * 获取所有客户端下创建的钱包地址
 * @returns {Array<string>} 所有的钱包地址
 */
export function getAllAccounts() {
  return EthAccountModel
    .find(null, { account: 1 })
    .then(t => t.map(({ account }) => account))
}

/**
 * 获取系统生成的钱包账户信息
 * @param {string} address 钱包地址
 * @returns {ethAccountModel} 钱包账户信息
 */
export async function getAccountInfoByAddress(address) {
  let account = await EthAccountModel
    .findOne({ account: address })
    .catch((ex) => {
      console.err(ex.message)
    })
  if (account) {
    return account
  } else {
    throw new Error(`没有找到指定的钱包信息 [${address}]`)
  }
}

/**
 * 根据账户地址获得其所属钱包客户端链接,并解锁账户
 * @param {object} address 钱包地址
 * @returns {object} 钱包客户端链接
 */
export async function getConnByAddressThenUnlock(address) {
  // 获取出账钱包信息
  let { account, group, secret } = await getAccountInfoByAddress(address)
  let conn = getConnection('ws://172.31.254.95:8546')

  await unlockAccount(conn, account, secret).catch((err) => {
    console.log(`解锁账户失败：${err.message}`)
    throw err
  })

  return conn
}

/**
 * 判断是否是系统地址
 * @param {string} address 钱包地址
 * @returns {Promise<bool>}
 */
export function isSysAccount(address) {
  return existEternalString(address)
}

/**
 * 更新指定钱包的账户余额
 * @param {String} address 钱包地址
 * @param {String} contractName 代币合约名称
 * @param {Boolean} immediately 是否立刻更新
 * @returns {Promise}
 */
export async function sayIWannaUpdateTheBalanceOfSomeAccount(address, contractName = 'eth', immediately = false) {
  if (immediately) {
    return doUpdateBalanceOfAccount(address, contractName)
  } else {
    return addAccountSyncInfo(address, contractName)
  }
}

/**
 * 真正执行更新账户余额的操作
 * @param {String} address 钱包地址
 * @param {String} name 合约类型
 */
export async function doUpdateBalanceOfAccount(address, name) {
  let amount
  let symbol

  if (name === 'eth') {
    symbol = name
    amount = await getEthBalance(address)
  } else {
    amount = await getTokenBalance(address, name).catch(ex => console.error(ex))
    let contractMeta = await getTokenContractMeta(name).catch(ex => console.error(ex))
    symbol = contractMeta.symbol
  }

  let account = await EthAccountModel.findOne({ account: address })

  if (!account.balances) {
    account.balances = {}
  }

  account.balances[symbol] = +amount

  delete account._id

  return EthAccountModel.update({ account: address }, account)
    .then(() => console.log(`[update account balance]: ${address} [${amount}] [${name}]`))
    .catch(ex => console.error(ex))
}

/**
 * 检查是否为系统地址，如果是则更新账户余额
 * @param {String} address 钱包地址
 * @param {String} contractName 代币类型
 * @returns {Promise}
 */
export async function checkIsSysThenUpdate(address, contractName) {
  let result = await isSysAccount(address)
  if (result) {
    broadcast(EVENT_TYPES.txDetected, address)
    return sayIWannaUpdateTheBalanceOfSomeAccount(address, contractName)
  } else {
    return false
  }
}

/**
 * 更新系统下指定代币合约的所有账户
 * @param {String} tokenContractNames 代币合约名称
 */
export async function updateAllAccountsForContract(tokenContractNames) {
  const taskQueue = new ParallelQueue({ limit: 20, span: 500, toleration: 0 })

  let accounts = await getAllAccounts()

  accounts.forEach((address) => {
    taskQueue.add(new TaskCapsule(() => sayIWannaUpdateTheBalanceOfSomeAccount(address, 'eth', true)))
    if (tokenContractNames && tokenContractNames.length > 0) {
      tokenContractNames.forEach((contractName) => {
        taskQueue.add(new TaskCapsule(() => sayIWannaUpdateTheBalanceOfSomeAccount(address, contractName, true)))
      })
    }
  })

  return taskQueue.consume()
}

/**
 * 更新系统支持的代币合约的所有账户
 */
export async function syncAllSysAccounts() {

  console.log('开始同步账户余额')
  const tokenContractNames = await getAllTokenContracts().then(res => res.map(({ name }) => name))

  return updateAllAccountsForContract(tokenContractNames)
    .then(() => {
      console.info('系统账户余额信息更新完成')
      return true
    }).catch((ex) => {
      console.error(ex.message)
      return false
    })
}

/**
 * 获取代币余额总览
 */
export async function getTokenBalanceOverview() {
  let accounts = await EthAccountModel.find(null, { balances: 1 })
  let counter = {}
  accounts.forEach(({ balances }) => {
    if (balances) {
      Object.entries(balances).forEach(([tokenType, amount]) => {
        if (counter[tokenType] === undefined) {
          counter[tokenType] = 0
        }
        counter[tokenType] += amount || 0
      })
    }
  })
  return Object.entries(counter).map(([name, amount]) => ({ name, value: (Math.round(amount * 100) / 100).toFixed(2) }))
}

export async function handlePendingBalanceUpdateJobs() {
  let pendingJobs = await getAllAccountSyncInfo()

  if (pendingJobs && pendingJobs.length > 0) {
    console.log(`处理堆积的账户更新操作，共 ${pendingJobs.length} 条`)
    let queue = new ParallelQueue({
      limit: 30,
      toleration: 0,
    })

    pendingJobs.forEach(([address, type]) =>
      queue.add(
        new TaskCapsule(
          () => doUpdateBalanceOfAccount(address, type).then(() => removeAccountSyncInfo(address, type))
        )
      )
    )

    return queue.consume().then(broadcastBalanceUpdateEvent)
  } else {
    return false
  }
}

// todo: 代币总额 扔到 redis 里维护
export async function broadcastBalanceUpdateEvent() {
  const balances = await getTokenBalanceOverview()
  broadcast(EVENT_TYPES.balanceUpdated, balances)
}
