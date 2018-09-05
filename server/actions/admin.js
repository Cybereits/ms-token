import {
  GraphQLString as str,
  GraphQLNonNull as NotNull,
  GraphQLInt as int,
  GraphQLBoolean as bool,
} from 'graphql'

import {
  adminInfo,
  adminDetailInfo,
} from '../types/plainTypes'

import { PaginationWrapper, PaginationResult } from '../types/complexTypes'
import { validSecret, saveUserSecret, getOptAuthUrl } from '../../core/scenes/authentication'
import { AdminModel } from '../../core/schemas'

async function register(username, password, validPassword, role) {
  if (password !== validPassword) {
    return new Error('两次输入的密码不一致')
  }
  let res = {}

  let admin = await AdminModel.findOne({ username })
  if (admin) {
    throw new Error('用户名已存在')
  } else {
    admin = new AdminModel({ username, password, role })
    return admin.save()
      .then((newAdmin) => {
        res.username = newAdmin.username
        res.role = newAdmin.role
        return res
      })
  }
}

async function login(username, password, token, ctx) {
  if (ctx.session && ctx.session.admin) {
    let { username, role } = ctx.session.admin
    return {
      username,
      role,
    }
  }

  let res = {}
  let admin = await AdminModel.findOne({ username })
  if (!admin) {
    return new Error('用户不存在')
  } else {
    return admin
      .comparePassword(password, admin.password)
      .then((isMath) => {
        if (!isMath) {
          throw new Error('密码错误')
        } else {
          if (!admin.authSecret || validSecret(admin.authSecret, token)) {
            ctx.session.admin = {
              username: admin.username,
              role: admin.role,
            }
            res.username = admin.username
            res.role = admin.role
            return res
          } else {
            throw new Error('请输入正确的双向验证码')
          }
        }
      })
  }
}

async function logout(ctx) {
  ctx.session = null
  return { result: true }
}

export const createAdmin = {
  type: adminInfo,
  description: '创建管理员',
  args: {
    username: {
      type: new NotNull(str),
    },
    password: {
      type: new NotNull(str),
    },
    validPassword: {
      type: new NotNull(str),
    },
  },
  resolve(root, { username, password, validPassword }, ctx) {
    let { session } = ctx
    if (!session || !session.admin || session.admin.role !== 1) {
      throw new Error('您没有权限创建用户，请联系超级管理员')
    } else {
      return register(username, password, validPassword, 2)
    }
  },
}

export const adminLogin = {
  type: adminInfo,
  description: '管理员登录',
  args: {
    username: {
      type: new NotNull(str),
      description: '用户名',
    },
    password: {
      type: new NotNull(str),
      description: '用户登录密码',
    },
    token: {
      type: str,
      description: '用户双向验证的校验码',
    },
  },
  resolve(root, { username, password, token }, ctx) {
    return login(username, password, token, ctx)
  },
}

export const adminLogout = {
  type: bool,
  description: '管理员注销',
  resolve(root, _, ctx) {
    return logout(ctx)
  },
}

export const changePwd = {
  type: adminInfo,
  description: '更改密码',
  args: {
    originPassword: {
      type: new NotNull(str),
      description: '原始密码',
    },
    newPassword: {
      type: new NotNull(str),
      description: '新密码',
    },
    validPassword: {
      type: new NotNull(str),
      description: '确认密码',
    },
  },
  async resolve(root, { originPassword, newPassword, validPassword }, ctx) {
    let { session } = ctx
    if (!session || !session.admin) {
      return new Error('您还没有登录')
    } else {
      let username = session.admin.username
      if (newPassword !== validPassword) {
        return new Error('两次输入的密码不一致')
      }
      let admin = await AdminModel.findOne({ username })
      if (!admin) {
        return new Error('无效的身份')
      } else {
        let isMatch = await admin.comparePassword(originPassword, admin.password)
        if (!isMatch) {
          throw new Error('用户名或者密码不匹配')
        } else {
          admin.password = newPassword
          return admin.save().then(() => ({
            username: admin.username,
            role: admin.role,
          }))
        }
      }
    }
  },
}

export const queryAdminList = {
  type: PaginationWrapper(adminInfo),
  description: '管理员列表',
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
    let total = await AdminModel.count()
    let list = await AdminModel.find().skip(pageSize * pageIndex).limit(pageSize)
    return PaginationResult(list, pageIndex, pageSize, total)
  },
}

export const getTwoFactorAuthUrl = {
  type: str,
  description: '获取双向验证的 AuthUrl',
  async resolve(root, _, ctx) {
    let { session } = ctx
    if (!session || !session.admin) {
      return new Error('您还没有登录')
    } else {
      let { base32, otpauth_url } = getOptAuthUrl()
      session.admin.auth_secret = base32
      return otpauth_url
    }
  },
}

export const bindTwoFactorAuth = {
  type: str,
  description: '绑定谷歌双向认证',
  args: {
    token: {
      type: str,
      description: '用户双向验证的校验码',
    },
  },
  async resolve(root, { token }, ctx) {
    let { session } = ctx
    if (!session || !session.admin) {
      return new Error('您还没有登录')
    } else if (!session.admin.auth_secret) {
      return new Error('无效的双向验证密钥')
    } else {
      let { username, auth_secret } = session.admin
      if (validSecret(auth_secret, token)) {
        return saveUserSecret(username, auth_secret).then(() => 'success')
      } else {
        throw new Error('无效的校验码')
      }
    }
  },
}

export const getAdminInfo = {
  type: adminDetailInfo,
  description: '获取管理员信息',
  async resolve(root, _, ctx) {
    if (ctx.session && ctx.session.admin) {
      let { username } = ctx.session.admin
      let admin = await AdminModel.findOne({ username })
      if (admin) {
        return admin
      } else {
        throw new Error('没有找到对应的管理员信息')
      }
    } else {
      throw new Error('您还没有登录')
    }
  },
}

export const resetPwd = {
  type: str,
  description: '重置密码',
  args: {
    username: {
      type: str,
      description: '用户名',
    },
    newPassword: {
      type: str,
      description: '新密码',
    },
    validPassword: {
      type: str,
      description: '确认密码',
    },
    token: {
      type: str,
      description: '谷歌验证码',
    },
  },
  async resolve(root, { username, newPassword, validPassword, token }, ctx) {
    if (newPassword !== validPassword) {
      return new Error('两次输入的密码不一致')
    }
    if (newPassword.length <= 5) {
      return new Error('密码强度太弱，请输入6位以上数字、字母组合')
    }

    let admin = await AdminModel.findOne({ username })
    if (!admin) {
      return new Error('无效的身份')
    } else {
      if (!admin.authSecret) {
        return new Error('用户尚未绑定谷歌验证码，无法重置密码')
      } else if (!validSecret(admin.authSecret, token)) {
        return new Error('谷歌验证码不正确')
      } else {
        admin.password = newPassword
        return admin.save().then(() => 'success')
      }
    }
  },
}
