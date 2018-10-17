/**
 * 将短时间内可能重复出现的任务（譬如批量发送时更新账户信息）进行列队和覆盖
 * 可以适当减少应用的计算和 IO 消耗
 */
import { tempConnection } from '../../framework/redis'

const SEPERATOR = '@'
const SYNC_QUEUE_SET_NAME = 'ms_token_sync_task_queue'

function serialize(address, type) {
  return [address, type].join(SEPERATOR)
}

function deserialize(str) {
  return str.split(SEPERATOR)
}

/**
 * 添加需要同步任务的钱包信息
 * @param {String} address 钱包地址
 * @param {String} type 代币类型
 */
export function addAccountSyncInfo(address, type) {
  return tempConnection.sadd(SYNC_QUEUE_SET_NAME, serialize(address, type))
}

/**
 * 移除需要同步任务的钱包信息
 * @param {String} address 钱包地址
 * @param {String} type 代币类型
 */
export function removeAccountSyncInfo(address, type) {
  return tempConnection.srem(SYNC_QUEUE_SET_NAME, serialize(address, type))
}

/**
 * 获取需要同步的钱包信息
 * @returns {Array<[String,String]>}
 */
export async function getAllAccountSyncInfo() {
  const set = await tempConnection.smembers(SYNC_QUEUE_SET_NAME)
  return set.map(deserialize)
}
