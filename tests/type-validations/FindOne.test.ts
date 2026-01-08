import { describe, expectTypeOf, it } from 'vitest'

import { EntityCompositeAllFeatures, EntityPkString, EntityWithNestedData } from '../fixtures'

describe('FindOne Type Validations', () => {
  describe('Key Validation', () => {
    it('requires exact primary key for entity with PK only', () => {
      // Valid
      EntityPkString.findOne({ pk: 'USER#1' })

      // @ts-expect-error - Missing PK
      EntityPkString.findOne({})
      // @ts-expect-error - Extra properties
      EntityPkString.findOne({ pk: 'USER#1', extra: 'val' })
      // @ts-expect-error - Invalid type
      EntityPkString.findOne({ pk: 123 })
    })

    it('requires exact primary key for entity with PK and SK', () => {
      // Valid
      EntityCompositeAllFeatures.findOne({ pk: 'USER#1', sk: 'EMAIL#test' })

      // @ts-expect-error - Missing SK
      EntityCompositeAllFeatures.findOne({ pk: 'USER#1' })
      // @ts-expect-error - Missing PK
      EntityCompositeAllFeatures.findOne({ sk: 'EMAIL#test' })
      // @ts-expect-error - Invalid types
      EntityCompositeAllFeatures.findOne({ pk: 1, sk: 2 })
    })
  })

  describe('Options', () => {
    const query = EntityCompositeAllFeatures.findOne({ pk: 'USER#1', sk: 'EMAIL#test' })

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
    const query = EntityWithNestedData.findOne({ pk: 'USER#1', sk: 'EMAIL#test' })

    it('restricts result type based on attributes', async () => {
      const result = await query.attributes(['email', 'metadata.version']).exec()

      expectTypeOf(result.item).toEqualTypeOf<
        | {
            email: string
            metadata: {
              version: number
            }
          }
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
    const query = EntityPkString.findOne({ pk: 'USER#1' })

    it('returns item | undefined by default', async () => {
      const result = await query.exec()
      expectTypeOf(result.item).toEqualTypeOf<
        (typeof EntityPkString.schema)['_output'] | undefined
      >()
    })

    it('returns non-nullable item with orThrow()', async () => {
      const result = await query.orThrow().exec()
      expectTypeOf(result.item).toEqualTypeOf<(typeof EntityPkString.schema)['_output']>()
      expectTypeOf(result.item).not.toBeUndefined()
    })

    it('combines projection and orThrow', async () => {
      const result = await query.attributes(['id']).orThrow().exec()
      expectTypeOf(result.item).toEqualTypeOf<{ id: string }>()
    })
  })
})
