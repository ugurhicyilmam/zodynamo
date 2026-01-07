import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { InferDynamoItem } from '../../src/types/InferDynamoItem'

describe('InferDynamoItem', () => {
  test('infers internal dynamo item type correctly', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', type: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      entityTypeField: 'type'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), name: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: value => `USER#${value.id}`
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      },
      entityType: 'USER'
    })

    type Internal = InferDynamoItem<typeof entity>

    expect(true).toBe(true)

    const int: Internal = {
      id: '1',
      name: 'Alice',
      pk: 'USER#1',
      sk: 'PROFILE',
      type: 'USER'
    }

    // @ts-expect-error - missing pk
    const intErr: Internal = { id: '1', name: 'Alice', sk: 'PROFILE', type: 'USER' }
    // @ts-expect-error - missing discriminator
    const intErr2: Internal = { id: '1', name: 'Alice', pk: 'USER#1', sk: 'PROFILE' }
  })
})
