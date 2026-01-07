import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'

describe('Entity types', () => {
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

  test('validates nested key field paths', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', type: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      entityTypeField: 'type'
    })

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
