import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expectTypeOf, it } from 'vitest'

import { FindOne } from '../../src/actions/find-one/FindOne'
import { InferEntity } from '../../src/types/InferEntity'
import { Prettify } from '../../src/types/utils'
import { EntityCompositeAllFeatures, EntityPkString, EntityWithNestedData } from '../fixtures'

const dynamo = {} as DynamoDBDocumentClient

describe('FindOne Type Validations', () => {
  describe('Key Validation', () => {
    it('requires exact primary key for entity with PK only', () => {
      // Valid
      new FindOne(dynamo).entity(EntityPkString).key({ id: '1' })

      // @ts-expect-error - Missing PK
      new FindOne(dynamo).entity(EntityPkString).key({})
      // @ts-expect-error - Extra properties
      new FindOne(dynamo).entity(EntityPkString).key({ id: '1', extra: 'val' })
      // @ts-expect-error - Invalid type
      new FindOne(dynamo).entity(EntityPkString).key({ id: 123 })
    })

    it('requires exact primary key for entity with PK and SK', () => {
      // Valid
      new FindOne(dynamo)
        .entity(EntityCompositeAllFeatures)
        .key({ id: '1', email: 'test@example.com' })

      // @ts-expect-error - Missing SK
      new FindOne(dynamo).entity(EntityCompositeAllFeatures).key({ id: '1' })
      // @ts-expect-error - Missing PK
      new FindOne(dynamo).entity(EntityCompositeAllFeatures).key({ email: 'test@example.com' })
      // @ts-expect-error - Invalid types
      new FindOne(dynamo).entity(EntityCompositeAllFeatures).key({ id: 1, email: 2 })
    })
  })

  describe('Options', () => {
    const query = new FindOne(dynamo).entity(EntityCompositeAllFeatures).key({
      id: '1',
      email: 'test@example.com'
    })

    it('validates option types', () => {
      query.options({ consistent: true })
      query.options({ capacity: 'TOTAL' })

      // @ts-expect-error - Invalid option
      query.options({ invalid: true })
      // @ts-expect-error - Invalid capacity value
      query.options({ capacity: 'INVALID' })
    })
  })

  describe('Attributes Projection', () => {
    const query = new FindOne(dynamo)
      .entity(EntityWithNestedData)
      .key({ id: '1', email: 'test@example.com' })

    it('restricts result type based on attributes', async () => {
      const result = await query.attributes(['email', 'metadata.version']).exec()

      expectTypeOf(result.item).toMatchTypeOf<
        | Prettify<{
            email: string
            metadata: {
              version: number
            }
          }>
        | undefined
      >()

      // @ts-expect-error - property not selected
      result.item?.id
    })

    it('validates attribute paths', () => {
      query.attributes(['email', 'metadata'])
      // @ts-expect-error - Invalid path
      query.attributes(['invalid.path'])
    })
  })

  describe('Return Types and Modifiers', () => {
    const query = new FindOne(dynamo).entity(EntityPkString).key({ id: '1' })

    it('returns item | undefined by default', async () => {
      const result = await query.exec()
      expectTypeOf(result.item).toMatchTypeOf<
        Prettify<InferEntity<typeof EntityPkString>> | undefined
      >()
    })

    it('returns non-nullable item with orThrow()', async () => {
      const result = await query.orThrow().exec()
      expectTypeOf(result.item).toMatchTypeOf<Prettify<InferEntity<typeof EntityPkString>>>()
      expectTypeOf(result.item).not.toBeUndefined()
    })

    it('combines projection and orThrow', async () => {
      const result = await query.attributes(['id']).orThrow().exec()
      expectTypeOf(result.item).toMatchTypeOf<{ id: string }>()
    })
  })
})
