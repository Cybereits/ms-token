import { getGethClientState } from '../web3'
import env from '../../config/env.json'

export async function getServerState() {
  let clients = env.clients
  let result = clients.map(clientUri => getGethClientState(clientUri))
  return Promise.all(result)
}
