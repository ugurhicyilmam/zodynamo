import { expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { Put } from '../../src/actions/put/Put'
import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'

const table = defineTable({
  name: 'TestTable',
  fields: {
    pk: 'string',
    sk: 'string'
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk'
  }
})

const entity = defineEntity(table, {
  name: 'TestEntity',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    age: z.number().optional(),
    withDefault: z.string().default('default')
  }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => `#ID#${id}` },
    rangeKey: { fields: ['name'], calculate: ({ name }) => `#NAME#${name}` }
  }
})

test('Put Action Type Checks', () => {
  // 1. Initial State
  const put = new Put(entity)
  expectTypeOf(put.item).toBeCallableWith({ id: '1', name: 'test' })
  expectTypeOf(put.item).toBeCallableWith({ id: '1', name: 'test', age: 25 })
  // @ts-expect-error - missing required field
  expectTypeOf(put.item).toBeCallableWith({ name: 'test' })
  // @ts-expect-error - wrong type
  expectTypeOf(put.item).toBeCallableWith({ id: 1, name: 'test', age: 123 })

  // 2. Item Set State
  const itemSet = put.item({ id: '1', name: 'test' })

  // Available methods
  expectTypeOf(itemSet).toHaveProperty('options')
  expectTypeOf(itemSet).toHaveProperty('exec')

  // Unavailable methods
  // @ts-expect-error - item already set
  itemSet.item({ id: '1', name: 'new' })

  // 3. Options
  expectTypeOf(itemSet.options).toBeCallableWith({
    returnValues: 'ALL_OLD',
    tableName: 'OtherTable'
  })

  expectTypeOf(itemSet.options).toBeCallableWith({
    condition: { attr: 'age', gt: 18 }
  })

  // @ts-expect-error - invalid option value
  expectTypeOf(itemSet.options).toBeCallableWith({ returnValues: 'INVALID' })
  // @ts-expect-error - invalid condition field
  expectTypeOf(itemSet.options).toBeCallableWith({ condition: { attr: 'invalid', eq: 1 } })

  // 4. Exec
  expectTypeOf(itemSet.exec).returns.resolves.toBeAny()
})

test('Put Action with Transform', () => {
  const table = defineTable({
    name: 'TransformTable',
    fields: { pk: 'string', val: 'string' },
    primaryIndex: { hashKey: 'pk' }
  })

  const entity = defineEntity(table, {
    name: 'TransformEntity',
    schema: z.object({
      id: z.string(),
      count: z.number()
    }),
    key: {
      hashKey: { fields: ['id'], calculate: ({ id }) => id }
    },
    transform: {
      encode: (data: { id: string; count: number }) => ({
        pk: data.id,
        val: data.count.toString()
      }),
      decode: (data: { pk: string; val: string }) => ({
        id: data.pk,
        count: parseInt(data.val)
      })
    }
  })

  const put = new Put(entity)

  // Should accept External Input
  expectTypeOf(put.item).toBeCallableWith({ id: '1', count: 10 })

  // Should NOT accept Internal Type
  // @ts-expect-error - Internal type mismatch
  expectTypeOf(put.item).toBeCallableWith({ pk: '1', val: '10' })
})
