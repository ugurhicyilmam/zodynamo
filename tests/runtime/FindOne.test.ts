import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expect, it, vi } from 'vitest'

import { FindOne } from '../../src/actions/find-one/FindOne'
import { EntityCompositeAllFeatures } from '../fixtures'

const mockDynamoClient = {
  send: vi.fn()
} as unknown as DynamoDBDocumentClient

describe('FindOne Runtime', () => {
  it('initializes with key', () => {
    const query = new FindOne(mockDynamoClient).entity(EntityCompositeAllFeatures).key({
      id: '1',
      email: 'test@example.com'
    })
    expect(query).toBeDefined()
  })

  it('updates state immutably', () => {
    const q1 = new FindOne(mockDynamoClient).entity(EntityCompositeAllFeatures).key({
      id: '1',
      email: 'test@example.com'
    })
    const q2 = q1.options({ consistent: true })
    const q3 = q2.attributes(['email'])
    const q4 = q3.orThrow()

    expect(q1).not.toBe(q2)
    expect(q2).not.toBe(q3)
    expect(q3).not.toBe(q4)
  })

  // Since actual execution is mocked/not connected to DB, we mainly verify it doesn't crash
  it('executes without error', async () => {
    const query = new FindOne(mockDynamoClient).entity(EntityCompositeAllFeatures).key({
      id: '1',
      email: 'test@example.com'
    })
    const result = await query.exec()
    expect(result).toBeDefined()
  })
})
