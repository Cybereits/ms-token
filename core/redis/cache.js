/**
 * 将短时间内可能重复出现的任务（譬如批量发送时更新账户信息）进行列队和覆盖
 * 可以适当减少应用的计算和 IO 消耗
 */
import { tempConnection } from '../../framework/redis'

const CACHE_PREFIX = 'ms_token_redis_cache_'
const ETERNAL_CACHE_TABLE = 'ms_token_eternal_cache_table'
const CACHE_EXPIRED_TIME_IN_SEC = 60 * 60 * 24  // 一天过期时间

function serialize(data) {
  return JSON.stringify(data)
}

function deserialize(str) {
  return JSON.parse(str)
}

/**
 * 添加缓存
 * @param {String} key 存储key
 * @param {Object} value 存储值
 */
export function upsertCacheValue(key, value) {
  return tempConnection.set(`${CACHE_PREFIX}${key}`, serialize(value), 'EX', CACHE_EXPIRED_TIME_IN_SEC)
}

/**
 * 读取缓存
 * @param {String} key 存储key
 */
export function getCacheValue(key) {
  return tempConnection
    .get(`${CACHE_PREFIX}${key}`)
    .then((value) => {
      if (value) {
        return deserialize(value)
      } else {
        return null
      }
    })
}

/**
 * 添加字符串永久缓存
 * @param {String} values 缓存的字符串
 */
export function saveEternalStringCache(...values) {
  return tempConnection.sadd(ETERNAL_CACHE_TABLE, ...values)
}

/**
 * 检查缓存的字符串是否存在
 * @param {String} value 缓存的字符串
 */
export function existEternalString(value) {
  return tempConnection.sismember(ETERNAL_CACHE_TABLE, value)
}
