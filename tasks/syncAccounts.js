import { syncAllSysAccounts } from '../core/scenes/account'

export default async () => syncAllSysAccounts().then(r => true).catch(e => false)
