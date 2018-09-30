import agendaClient from '../../framework/jobsManager'
import updateSysAccount from './updateSysAccount'

const TASKS = {
  updateAccount: 'update system account',
}

agendaClient.define(TASKS.updateAccount, updateSysAccount)

// 添加定时任务
agendaClient
  .on('ready', () => {
    agendaClient.every('120 minutes', TASKS.updateAccount).unique({ updateAccount: true })  // 同步账户信息
    agendaClient.start()
  })
  .on('error', (ex) => {
    console.log(`schedule task error: ${ex.message}`)
  })
