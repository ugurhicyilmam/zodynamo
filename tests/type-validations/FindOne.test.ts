import { describe, expectTypeOf, it } from 'vitest'

import { FindOne } from '../../src/actions/find-one/FindOne'
import { InferEntity } from '../../src/types/InferEntity'
import { EntityCompositeAllFeatures, EntityPkString, EntityWithNestedData } from '../fixtures'

describe('FindOne Type Validations', () => {
  describe('Key Validation', () => {
    it('requires exact primary key for entity with PK only', () => {
      // Valid
      new FindOne(EntityPkString).key({ pk: 'USER#1' })

      // @ts-expect-error - Missing PK
      new FindOne(EntityPkString).key({})
      // @ts-expect-error - Extra properties
      new FindOne(EntityPkString).key({ pk: 'USER#1', extra: 'val' })
      // @ts-expect-error - Invalid type
      new FindOne(EntityPkString).key({ pk: 123 })
    })

    it('requires exact primary key for entity with PK and SK', () => {
      // Valid
      new FindOne(EntityCompositeAllFeatures).key({ pk: 'USER#1', sk: 'EMAIL#test' })

      // @ts-expect-error - Missing SK
      new FindOne(EntityCompositeAllFeatures).key({ pk: 'USER#1' })
      // @ts-expect-error - Missing PK
      new FindOne(EntityCompositeAllFeatures).key({ sk: 'EMAIL#test' })
      // @ts-expect-error - Invalid types
      new FindOne(EntityCompositeAllFeatures).key({ pk: 1, sk: 2 })
    })
  })

  describe('Options', () => {
    const query = new FindOne(EntityCompositeAllFeatures).key({ pk: 'USER#1', sk: 'EMAIL#test' })

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
    const query = new FindOne(EntityWithNestedData).key({ pk: 'USER#1', sk: 'EMAIL#test' })

    it('restricts result type based on attributes', async () => {
      const result = await query.attributes(['email', 'metadata.version']).exec()

      const _check:
        | {
            email: string
            metadata: {
              version: number
            }
          }
        | undefined = result.item
      // Prevent unused variable warning
      void _check

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
    const query = new FindOne(EntityPkString).key({ pk: 'USER#1' })

    it('returns item | undefined by default', async () => {
      const result = await query.exec()
      const _check: InferEntity<typeof EntityPkString> | undefined = result.item
      void _check
    })

    it('returns non-nullable item with orThrow()', async () => {
      const result = await query.orThrow().exec()
      const _check: InferEntity<typeof EntityPkString> = result.item
      void _check
      expectTypeOf(result.item).not.toBeUndefined()
    })

    it('combines projection and orThrow', async () => {
      const result = await query.attributes(['id']).orThrow().exec()
      const _check: { id: string } = result.item
      void _check
    })
  })

  describe('Debug', () => {
    it('verifies InferEntity', () => {
      const e = EntityPkString
      type T = InferEntity<typeof e>
      const t: T = { id: '1' }
      void t
    })
  })
})
