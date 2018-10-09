import { AdminModel } from '../core/schemas'

export default async (username, password, validPassword, role = 1) => {
  if (password !== validPassword) {
    console.log('两次输入密码不一致')
    return false
  }

  let admin = await AdminModel.findOne({ username })
  if (admin) {
    console.log('用户已存在')
    return false
  }

  return new AdminModel({ username, password, role })
    .save()
    .then((newAdmin) => {
      console.log(`add user succ ${newAdmin.username}`)
      return true
    })
    .catch((err) => {
      console.error(err.message)
      return false
    })
}
