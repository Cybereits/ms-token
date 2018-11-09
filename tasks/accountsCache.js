import { getAllAccounts } from '../core/scenes/account'
import { saveEternalStringCache } from '../core/redis/cache'

export default async () => {
  let accounts = await getAllAccounts()
  return saveEternalStringCache(accounts).then(r => true).catch(ex => false)
}
