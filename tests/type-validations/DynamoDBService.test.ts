import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expectTypeOf, it } from 'vitest'

import { DynamoDBService } from '../../src/actions/DynamoDBService'
import { FindOne, FindOneBuilder } from '../../src/actions/find-one/FindOne'
import { Put, PutBuilder } from '../../src/actions/put/Put'
import { Query } from '../../src/actions/query/Query'
import { EntityCompositeAllFeatures } from '../fixtures'

const dynamo = {} as DynamoDBDocumentClient
const service = new DynamoDBService({ dynamo })

describe('DynamoDBService Type Validations', () => {
  it('infers FindOneBuilder type correctly', () => {
    const action = service.run(FindOne).entity(EntityCompositeAllFeatures)
    expectTypeOf(action).toEqualTypeOf<FindOneBuilder<typeof EntityCompositeAllFeatures>>()
  })

  it('infers PutBuilder type correctly', () => {
    const action = service.run(Put).entity(EntityCompositeAllFeatures)
    expectTypeOf(action).toEqualTypeOf<PutBuilder<typeof EntityCompositeAllFeatures>>()
  })

  it('infers QuerySelector type correctly', () => {
    const selector = service.run(Query).entity(EntityCompositeAllFeatures)
    // Query.entity() returns QuerySelector
    expectTypeOf(selector).toHaveProperty('primary')
    expectTypeOf(selector).toHaveProperty('gsi')
  })
})
