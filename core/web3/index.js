import Web3 from 'web3'
import { clients } from '../../config/env.json'
import { broadcast, EVENT_TYPES } from '../eventsPublisher'
import ohDamnItThatIsSoStupid from '../listeners'

const RECONNECT_DELAY = 8
const STATE_CHECK_INTERVAL = 15
const BLOCK_SYNC_DELAY_TOLERATION = 2000

/**
 * 因为只需要给一个钱包建立事件监听即可
 * 所以我们需要一个标识
 */
let hasEstablishedEventListener = false

class EstablishedConnection {

  constructor(uri) {
    this.__uri = uri
    this.isDisabled = false
    this.disable_reason = null
    this.buildConn()
  }

  buildConn() {
    this.conn = new Web3(new Web3.providers.WebsocketProvider(this.__uri))
    this.conn.__uri = this.__uri
    this.conn.currentProvider.on('end', this.onClosed.bind(this))
    this.conn.currentProvider.on('connect', this.onConnected.bind(this))
  }

  usable() {
    return !this.isDisabled
  }

  disable(reason) {
    console.warn(reason)
    this.isDisabled = true
    this.disable_reason = reason
  }

  enable() {
    this.isDisabled = false
    this.disable_reason = null
    broadcast(EVENT_TYPES.clientEnable, this.conn.__uri)
  }

  onClosed() {
    this.disable(`[${this.__uri}] 钱包客户端连接失败，${RECONNECT_DELAY} 秒后尝试重连...`)
    setTimeout(this.buildConn.bind(this), RECONNECT_DELAY * 1000)
    hasEstablishedEventListener = false
  }

  onConnected() {
    this.enable()
    if (!hasEstablishedEventListener) {
      ohDamnItThatIsSoStupid(this.conn)
      hasEstablishedEventListener = true
    }
  }

  getConn() {
    if (this.isDisabled) {
      console.warn(`调用失败：${this.disable_reason}`)
      return null
    } else {
      return this.conn
    }
  }
}

let ec_pool = clients.map(clientUri => new EstablishedConnection(clientUri))
let curr_index = 0
let curr_block_number = 0

function clientSyncStateCheck() {
  ec_pool.forEach(async (ec) => {
    let conn = ec.conn
    let clientBlockNumber = await conn.eth.getBlockNumber().catch(ex => false)
    if (clientBlockNumber === false) {
      // 此时的客户端链接应该是已经断开的状态 所以不需要再做额外的处理
      return false
    } else if (clientBlockNumber < curr_block_number - BLOCK_SYNC_DELAY_TOLERATION) {
      if (ec.usable()) {
        let reason = `${conn.__uri} 客户端区块同步高度为 ${clientBlockNumber} 落后于当前链上区块高度 ${curr_block_number}`
        ec.disable(reason)
        broadcast(EVENT_TYPES.clientError, [conn.__uri, reason])
      }
    } else {
      if (clientBlockNumber > curr_block_number) {
        curr_block_number = clientBlockNumber
      }
      if (ec.isDisabled) {
        ec.enable()
      }
    }
  })
}

/**
 * 获取钱包客户端链接
 * @param {string|null} 客户端套接字链接地址
 * @returns {object} 钱包客户端链接
 */
function getConnection(uri) {
  if (uri) {
    let _matched = ec_pool.filter(c => c.__uri === uri)[0]
    // 查找当前链接池中是否有对应的钱包链接
    if (_matched) {
      // 如果有则返回对应链接
      return _matched.getConn()
    } else {
      // 如果没有 则新建链接
      return new EstablishedConnection(uri).getConn()
    }
  } else {
    let len = ec_pool.length
    if (len > 0) {
      curr_index = (curr_index + 1) % len
      if (ec_pool[curr_index].usable()) {
        return ec_pool[curr_index].getConn()
      } else {
        let retryTimes = 1
        while (retryTimes < len) {
          curr_index = (curr_index + 1) % len
          if (ec_pool[curr_index].usable()) {
            return ec_pool[curr_index].getConn()
          }
        }
        throw new Error('没有可用的钱包链接...')
      }
    } else {
      throw new Error('没有可用的钱包链接...')
    }
  }
}

clientSyncStateCheck()

setInterval(clientSyncStateCheck, 1000 * STATE_CHECK_INTERVAL)

export default getConnection
