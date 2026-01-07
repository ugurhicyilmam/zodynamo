import { describe, expect, test } from 'vitest'
import { z } from 'zod'

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

  test('entity with local secondary index', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', lsi1sk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'lsi1sk' }
      }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), createdAt: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        },
        rangeKey: {
          fields: ['id'],
          calculate: ({ id }) => `PROFILE#${id}`
        }
      },
      localIndexes: {
        LSI1: {
          rangeKey: {
            fields: ['createdAt'],
            calculate: ({ createdAt }) => `CREATED#${createdAt}`
          }
        }
      }
    })

    expect(entity.localIndexes?.LSI1.rangeKey.calculate({ createdAt: '1' })).toEqual('CREATED#1')
  })
  test('entity with global secondary index', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', gsi1pk: 'string', gsi1sk: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      globalIndexes: {
        GSI1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk' }
      }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), score: z.number() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        },
        rangeKey: {
          fields: ['id'],
          calculate: ({ id }) => `PROFILE#${id}`
        }
      },
      globalIndexes: {
        GSI1: {
          hashKey: {
            fields: ['id'],
            calculate: ({ id }) => `USER#${id}`
          },
          rangeKey: {
            fields: ['score'],
            calculate: ({ score }) => score
          }
        }
      }
    })

    expect(entity.globalIndexes.GSI1.hashKey.calculate({ id: '1', score: 0 })).toEqual('USER#1')
    expect(entity.globalIndexes.GSI1.rangeKey.calculate({ score: 10, id: '1' })).toEqual(10)
  })

  test('entity with conditional TTL', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    const entity = defineEntity(table, {
      name: 'Score',
      schema: z.object({ id: z.string(), score: z.number() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `SCORE#${id}`
        }
      },
      ttl: domain => (domain.score > 15 ? 3600 : undefined)
    })

    expect(entity.ttl).toBeDefined()
    expect(entity.ttl!({ id: '1', score: 20 })).toBe(3600)
    expect(entity.ttl!({ id: '2', score: 10 })).toBeUndefined()
  })

  test('entity without TTL', () => {
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
      }
    })

    expect(entity.ttl).toBeUndefined()
  })
})
