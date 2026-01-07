import { describe, expect, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { InferDynamoItem } from '~/types/InferDynamoItem'
import { InferEntity } from '~/types/InferEntity'
import { InferHashKeyFields, InferKeyFields, InferRangeKeyFields } from '~/types/InferEntityKeyFields'

import { defineEntity } from '../src/functions/defineEntity'
import { defineTable } from '../src/functions/defineTable'

describe('defineEntity', () => {
  test('basic entity with just hash key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), name: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      }
    })

    expect(entity.name).toBe('User')
    expect(entity.key.hashKey.calculate({ id: '123' })).toEqual('USER#123')
  })

  test('entity with hash and range key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' }
    })

    const entity = defineEntity(table, {
      name: 'Comment',
      schema: z.object({ postId: z.string(), commentId: z.string(), age: z.number() }),
      key: {
        hashKey: {
          fields: ['postId'],
          calculate: ({ postId }) => `POST#${postId}`
        },
        rangeKey: {
          fields: ['commentId'],
          calculate: ({ commentId }) => `COMMENT#${commentId}`
        }
      }
    })

    expect(entity.key.hashKey.calculate({ postId: '1' })).toEqual('POST#1')
    expect(entity.key.rangeKey.calculate({ commentId: '2' })).toEqual('COMMENT#2')
  })

  test('entity with numeric key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'number' },
      primaryIndex: { hashKey: 'pk' }
    })

    const entity = defineEntity(table, {
      name: 'Score',
      schema: z.object({ id: z.string(), score: z.number() }),
      key: {
        hashKey: {
          fields: ['score'],
          calculate: ({ score }) => score
        }
      }
    })

    expect(entity.key.hashKey.calculate({ score: 100 })).toEqual(100)
  })

  test('requires entityType when configured on table', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', type: 'string' },
      primaryIndex: { hashKey: 'pk' },
      entityTypeField: 'type'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      },
      entityType: 'USER'
    })

    expect(entity.entityType).toBe('USER')
  })

  test('forbids entityType when NOT configured on table', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      },
      // @ts-expect-error
      entityType: 'USER'
    })

    expect(entity).toBeDefined()
  })

  test('enforces strict key return type', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: () =>
            // @ts-expect-error - must return string pk
            123
        }
      }
    })
  })

  test('requires rangeKey definition when table has range key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      // @ts-expect-error - rangeKey required for this table
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      }
    })
  })

  test('forbids rangeKey definition when table has no range key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        },
        // @ts-expect-error - no rangeKey on this table
        rangeKey: {
          fields: ['id'],
          calculate: (item: { id: string }) => `USER#${item.id}`
        }
      }
    })
  })

  test('infers entity and dynamo item types', () => {
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

    type External = InferEntity<typeof entity>
    type Internal = InferDynamoItem<typeof entity>

    expect(true).toBe(true) // Runtime dummy check

    // Type-level checks
    const ext: External = { id: '1', name: 'Alice' }
    // @ts-expect-error - missing schema field
    const extErr: External = { id: '1' }

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

  test('supports nested field paths in key fields', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', type: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      entityTypeField: 'type'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        address: z.object({ street: z.string() })
      }),
      key: {
        hashKey: {
          fields: ['id', 'address.street'],
          calculate: value => `USER#${value.id}#${value.address.street}`
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      },
      entityType: 'USER'
    })

    type HashFields = InferHashKeyFields<typeof entity>
    type RangeFields = InferRangeKeyFields<typeof entity>
    type AllFields = InferKeyFields<typeof entity>

    expectTypeOf({} as HashFields).toEqualTypeOf<{ id: string; address: { street: string } }>()
    expectTypeOf({} as RangeFields).toEqualTypeOf<{ }>()
    expectTypeOf({} as AllFields).toEqualTypeOf<{ id: string; address: { street: string } }>()

    const hashOk: HashFields = { id: '1', address: { street: 'Main' } }
    const rangeOk: RangeFields = {}
    const allOk: AllFields = { id: '1', address: { street: 'Main' } }

    // @ts-expect-error - missing nested field
    const hashErr: HashFields = { id: '1' }

    expect(hashOk).toBeDefined()
    expect(rangeOk).toBeDefined()
    expect(allOk).toBeDefined()

    expect(entity.key.hashKey.calculate({ id: '1', address: { street: 'Main' } })).toEqual('USER#1#Main')

    defineEntity(table, {
      name: 'User',
      schema: z.object({
        id: z.string(),
        address: z.object({ street: z.string() })
      }),
      key: {
        hashKey: {
          // @ts-expect-error - invalid nested path
          fields: ['address.nope'],
          calculate: () => 'USER#1'
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      }
    })
  })
})
