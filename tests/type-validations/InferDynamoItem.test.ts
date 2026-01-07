import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { InferDynamoItem } from '../../src/types/InferDynamoItem'

describe('InferDynamoItem', () => {
  test('infers internal dynamo item type correctly', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', type: 'string', expireAt: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      entityTypeField: 'type',
      ttl: 'expireAt'
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
      entityType: 'USER',
      ttl: domain => (domain.name.length > 5 ? 3600 : 3800)
    })

    type Internal = InferDynamoItem<typeof entity>

    expect(true).toBe(true)

    const int: Internal = {
      id: '1',
      name: 'Alice',
      pk: 'USER#1',
      sk: 'PROFILE',
      type: 'USER',
      expireAt: 123
    }

    // @ts-expect-error - missing pk
    const intErr: Internal = { id: '1', name: 'Alice', sk: 'PROFILE', type: 'USER' }
    // @ts-expect-error - missing discriminator
    const intErr2: Internal = { id: '1', name: 'Alice', pk: 'USER#1', sk: 'PROFILE' }
  })

  test('uses ttl callback return type for ttl field', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', expireAt: 'number' },
      primaryIndex: { hashKey: 'pk' },
      ttl: 'expireAt'
    })

    const numberOnly = defineEntity(table, {
      name: 'NumberOnly',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `NUMBER#${id}`
        }
      },
      ttl: () => 3600
    })

    type NumberOnlyInternal = InferDynamoItem<typeof numberOnly>

    const numberOnlyOk: NumberOnlyInternal = { id: '1', pk: 'NUMBER#1', expireAt: 3600 }
    // @ts-expect-error - ttl required when return type is number
    const numberOnlyErr: NumberOnlyInternal = { id: '1', pk: 'NUMBER#1' }

    const undefinedOnly = defineEntity(table, {
      name: 'UndefinedOnly',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `UNDEFINED#${id}`
        }
      },
      ttl: () => undefined
    })

    type UndefinedOnlyInternal = InferDynamoItem<typeof undefinedOnly>

    const undefinedOnlyOk: UndefinedOnlyInternal = { id: '1', pk: 'UNDEFINED#1' }
    // @ts-expect-error - ttl cannot be a number when return type is undefined
    const undefinedOnlyErr: UndefinedOnlyInternal = { id: '1', pk: 'UNDEFINED#1', expireAt: 1 }
  })
})
