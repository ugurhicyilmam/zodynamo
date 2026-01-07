import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { InferDynamoItem } from '~/types/InferDynamoItem'
import { InferEntity } from '~/types/InferEntity'

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
        fields: ['id'],
        calculate: ({ id }) => ({ pk: `USER#${id}` })
      }
    })

    expect(entity.name).toBe('User')
    expect(entity.key.calculate({ id: '123' })).toEqual({ pk: 'USER#123' })
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
        fields: ['postId', 'commentId'],
        calculate: fields => ({
          pk: `POST#${fields.postId}`,
          sk: `COMMENT#${fields.commentId}`
        })
      }
    })

    expect(entity.key.calculate({ postId: '1', commentId: '2' })).toEqual({
      pk: 'POST#1',
      sk: 'COMMENT#2'
    })
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
        fields: ['score'],
        calculate: ({ score }) => ({ pk: score })
      }
    })

    expect(entity.key.calculate({ score: 100 })).toEqual({ pk: 100 })
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
        fields: ['id'],
        calculate: ({ id }) => ({ pk: `USER#${id}` })
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
        fields: ['id'],
        calculate: ({ id }) => ({ pk: `USER#${id}` })
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
        fields: ['id'],
        calculate: ({ id }) =>
          // @ts-expect-error - missing pk
          ({
            wrongKey: id
          })
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
        fields: ['id'],
        calculate: ({ id }) => ({ pk: `USER#${id}`, sk: 'PROFILE' })
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
})
