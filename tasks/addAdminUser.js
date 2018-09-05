import { AdminModel } from '../core/schemas'

export default async (username, password, validPassword, role = 1) => {
  if (password !== validPassword) {
    console.log('两次输入密码不一致')
    process.exit()
  }

  let admin = await AdminModel.findOne({ username })
  if (admin) {
    console.log('用户已存在')
    process.exit()
  }

  new AdminModel({ username, password, role })
    .save()
    .then((newAdmin) => {
      console.log(`add user succ ${newAdmin.username}`)
      process.exit()
    })
    .catch((err) => {
      console.error(err)
      process.exit()
    })
}
