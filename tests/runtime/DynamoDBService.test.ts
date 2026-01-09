import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DynamoDBService } from '../../src/actions/DynamoDBService'
import { FindOne } from '../../src/actions/find-one/FindOne'
import { Put } from '../../src/actions/put/Put'
import { Query } from '../../src/actions/query/Query'
import { EntityCompositeAllFeatures } from '../fixtures'

describe('DynamoDBService', () => {
  let mockDynamoClient: DynamoDBDocumentClient
  let dynamoDBService: DynamoDBService

  beforeEach(() => {
    mockDynamoClient = {
      send: vi.fn()
    } as unknown as DynamoDBDocumentClient

    dynamoDBService = new DynamoDBService({
      dynamo: mockDynamoClient
    })
  })

  it('runs FindOne action', () => {
    const action = dynamoDBService.run(FindOne).entity(EntityCompositeAllFeatures)
    expect(action).toBeDefined()
    expect((action as any).dynamo).toBe(mockDynamoClient)
  })

  it('runs Put action', () => {
    const action = dynamoDBService.run(Put).entity(EntityCompositeAllFeatures)
    expect(action).toBeDefined()
    expect((action as any).dynamo).toBe(mockDynamoClient)
  })

  it('runs Query action', () => {
    const action = dynamoDBService.run(Query).entity(EntityCompositeAllFeatures)
    expect(action).toBeDefined()
    expect((action as any).dynamo).toBe(mockDynamoClient)
  })
})
