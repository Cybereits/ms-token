// web3 need ^1.0.0-beta.24
import Web3 from 'web3'
import { clients } from '../../config/env.json'

const reconnectDelay = 2

let _index = 0
let _pool = []

class EstablishedConnection {

  constructor(uri) {
    this.__uri = uri
    this.buildConn()
  }

  buildConn() {
    this.conn = new Web3(new Web3.providers.WebsocketProvider(this.__uri))
    this.conn.currentProvider.on('end', this.onClonse.bind(this))
    this.conn.currentProvider.on('connect', this.onConnected.bind(this))
  }

  onClonse() {
    console.warn(`[${this.__uri}] 钱包客户端连接失败，${reconnectDelay} 秒后尝试重连...`)
    setTimeout(this.buildConn.bind(this), reconnectDelay * 1000)
  }

  onConnected() {
    console.info(`[${this.__uri}] 钱包客户端连接成功!`)
  }

  getConn() {
    return this.conn
  }
}

_pool = clients.map(clientUri => new EstablishedConnection(clientUri))

/**
 * 获取钱包客户端链接
 * @param {string|null} 客户端套接字链接地址
 * @returns {object} 钱包客户端链接
 */
function getConnection(uri) {
  if (uri) {
    let _matched = _pool.filter(c => c.__uri === uri)[0]
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
    let len = _pool.length
    if (len > 0) {
      _index = (_index + 1) % len
      return _pool[_index].getConn()
    } else {
      throw new Error('没有可用的钱包链接...')
    }
  }
}

export default getConnection
