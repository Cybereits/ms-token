import {
  GraphQLString as str,
  GraphQLInt as int,
  GraphQLBoolean as bool,
  GraphQLList as List,
  GraphQLNonNull as NotNull,
} from 'graphql'

import getConnection from '../../framework/web3'
import { EthAccountModel } from '../../core/schemas'
import { isSysAccount, getAllAccounts } from '../../core/scenes/account'

import { PaginationWrapper, PaginationResult } from '../types/complexTypes'

export const createAccount = {
  type: str,
  description: '创建钱包',
  args: {
    password: {
      type: str,
      description: '钱包密码',
    },
    comment: {
      type: str,
      description: '备注信息',
    },
  },
  resolve(root, { password = '', comment }) {
    let conn = getConnection()
    return conn
      .eth
      .personal
      .newAccount(password)
      // 将生成的钱包信息记录入库再返回
      .then(
        account => EthAccountModel.create({
          account,
          secret: password,
          comment,
          group: conn.__uri,
        }).then(() => account)
      )
  },
}

export const createMultiAccount = {
  type: new List(str),
  description: '批量创建钱包',
  args: {
    count: {
      type: new NotNull(int),
      description: '需要创建的钱包数量',
    },
    password: {
      type: str,
      description: '钱包密码',
    },
    comment: {
      type: str,
      description: '备注信息',
    },
  },
  resolve(root, { count = 1, password = '', comment }) {
    let promises = []
    let addresses = []
    let conn = getConnection()

    for (let index = 0; index < count; index += 1) {
      promises.push(conn.eth.personal.newAccount(password).then((addr) => { addresses.push(addr) }))
    }

    return Promise
      .all(promises)
      .then(() => EthAccountModel
        .insertMany(addresses.map(account => ({
          account,
          secret: password,
          comment,
          group: conn.__uri,
        })))
        .then(() => addresses)
      )
  },
}

export const queryAccountList = {
  type: PaginationWrapper(str),
  description: '查看钱包地址',
  args: {
    pageIndex: {
      type: int,
      description: '页码',
    },
    pageSize: {
      type: int,
      description: '页容',
    },
  },
  async resolve(root, { pageIndex = 0, pageSize = 10 }) {
    let list = await getAllAccounts()
    let total = list.length
    let result = list.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
    return PaginationResult(result, pageIndex, pageSize, total)
  },
}

export const queryIsSysAccount = {
  type: bool,
  description: '查询是否为系统地址',
  args: {
    address: {
      type: new NotNull(str),
      description: '指定地址',
    },
  },
  async resolve(root, { address }) {
    return isSysAccount(address)
  },
}
