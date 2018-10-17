// web3 need ^1.0.0-beta.24
import Web3 from 'web3'
import { clients } from '../../config/env.json'

const RECONNECT_DELAY = 2
const STATE_CHECK_INTERVAL = 5
const BLOCK_SYNC_DELAY_TOLERATION = 1000

let ec_pool = []
let curr_index = 0
let curr_block_number = 0

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
    this.conn.currentProvider.on('end', this.onClonse.bind(this))
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
    console.log(`重新启用客户端 [${this.__uri}]`)
  }

  onClonse() {
    console.warn(`[${this.__uri}] 钱包客户端连接失败，${RECONNECT_DELAY} 秒后尝试重连...`)
    setTimeout(this.buildConn.bind(this), RECONNECT_DELAY * 1000)
  }

  onConnected() {
    console.info(`[${this.__uri}] 钱包客户端连接成功!`)
  }

  getConn() {
    if (this.isDisabled) {
      throw new Error(this.disable_reason)
    } else {
      return this.conn
    }
  }
}

ec_pool = clients.map(clientUri => new EstablishedConnection(clientUri))

function clientSyncStateCheck() {
  ec_pool.forEach(async (ec) => {
    let conn = ec.getConn()
    let clientBlockNumber = await conn.eth.getBlockNumber()
    if (clientBlockNumber < curr_block_number - BLOCK_SYNC_DELAY_TOLERATION) {
      ec.disable(`${conn.__uri} 客户端区块同步高度为 ${clientBlockNumber} 落后于当前链上区块高度 ${curr_block_number}`)
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

setInterval(clientSyncStateCheck, 1000 * STATE_CHECK_INTERVAL)

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
      console.log(`使用链接池中的链接 [${uri}]`)
      return _matched.getConn()
    } else {
      // 如果没有 则新建链接
      console.log(`新建临时链接 [${uri}]`)
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

export default getConnection
