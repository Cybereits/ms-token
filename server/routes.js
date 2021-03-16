import Router from 'koa-router'
import { graphqlKoa, graphiqlKoa } from 'apollo-server-koa'

import { defaultSchema } from './graphql'

const router = new Router()

router.post('/graphql', (ctx, next) =>
  graphqlKoa({ schema: defaultSchema, context: ctx })(ctx, next),
)

router.get('/data', (ctx, next) =>
  graphiqlKoa({ endpointURL: '/graphql', context: ctx })(ctx, next),
)

export default router
