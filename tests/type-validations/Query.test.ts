import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { Query } from '../../src/actions/query/Query'
import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { InferDynamoItem } from '../../src/types/InferDynamoItem'
import { InferEntity } from '../../src/types/InferEntity'

const table = defineTable({
  name: 'TestTable',
  fields: {
    pk: 'string',
    sk: 'string',
    gsi1pk: 'string',
    gsi1sk: 'number',
    gsi2pk: 'string',
    lsi1sk: 'number'
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk'
  },
  globalIndexes: {
    GSI1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk' },
    GSI2: { hashKey: 'gsi2pk' }
  },
  localIndexes: {
    LSI1: { rangeKey: 'lsi1sk' }
  }
})

const entity = defineEntity(table, {
  name: 'User',
  schema: z.object({
    id: z.string(),
    email: z.string(),
    age: z.number(),
    status: z.string()
  }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
    rangeKey: { fields: ['email'], calculate: ({ email }) => `EMAIL#${email}` }
  },
  globalIndexes: {
    GSI1: {
      hashKey: { fields: ['status'], calculate: ({ status }) => `STATUS#${status}` },
      rangeKey: { fields: ['age'], calculate: ({ age }) => age }
    },
    GSI2: {
      hashKey: { fields: ['email'], calculate: ({ email }) => `EMAIL#${email}` }
    }
  },
  localIndexes: {
    LSI1: {
      rangeKey: { fields: ['age'], calculate: ({ age }) => age }
    }
  }
})

const simpleTable = defineTable({
  name: 'SimpleTable',
  fields: {
    pk: 'string'
  },
  primaryIndex: {
    hashKey: 'pk'
  }
})

const simpleEntity = defineEntity(simpleTable, {
  name: 'SimpleUser',
  schema: z.object({
    id: z.string()
  }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` }
  }
})

const noLsiTable = defineTable({
  name: 'NoLsiTable',
  fields: {
    pk: 'string',
    sk: 'string'
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk'
  }
})

const noLsiEntity = defineEntity(noLsiTable, {
  name: 'NoLsiUser',
  schema: z.object({
    id: z.string(),
    date: z.string()
  }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
    rangeKey: { fields: ['date'], calculate: ({ date }) => date }
  }
})

describe('Query DSL Type Validations', () => {
  const query = new Query().entity(entity)

  test('Primary Query', () => {
    // Valid chain
    query.primary().partitionFrom({ id: '123' }).sortBeginsWith('EMAIL#').exec()
    // @ts-expect-error - exec not allowed before partition key
    query.primary().exec()

    // @ts-expect-error - Options not allowed before partition key
    query.primary().limit(1)

    // @ts-expect-error - exec not allowed before partition key (even with other methods)
    query.primary().consistentRead().exec()

    // Valid with partitionValue
    query.primary().partitionValue('USER#123').exec()

    // Valid with options
    query.primary().partitionValue('USER#123').consistentRead().limit(10).exec()

    // Valid with sort and options
    query.primary().partitionValue('USER#123').sortBeginsWith('EMAIL').limit(5).exec()

    // @ts-expect-error - Cannot apply sort after options
    query.primary().partitionValue('USER#123').limit(5).sortBeginsWith('EMAIL')

    // @ts-expect-error - Cannot apply two sort operations
    query.primary().partitionValue('USER#123').sortBeginsWith('A').sortBeginsWith('B')
  })

  test('GSI Query', () => {
    // Valid chain
    query.gsi('GSI1').partitionValue('STATUS#ACTIVE').sortGreaterThan(18).exec()

    // @ts-expect-error - exec not allowed before partition key
    query.gsi('GSI1').exec()

    // @ts-expect-error - Options not allowed before partition key
    query.gsi('GSI1').limit(1)

    // @ts-expect-error - consistentRead not allowed on GSI
    query.gsi('GSI1').consistentRead()

    // @ts-expect-error - sort ops not allowed on GSI without sort key
    query.gsi('GSI2').sortBeginsWith('foo')

    // Valid GSI without sort key
    query.gsi('GSI2').partitionValue('EMAIL#foo').exec()
  })

  test('LSI Query', () => {
    // Valid chain
    query.lsi('LSI1').partitionFrom({ id: '123' }).sortGreaterThan(18).consistentRead().exec()

    // @ts-expect-error - exec not allowed before partition key
    query.lsi('LSI1').exec()

    // @ts-expect-error - Options not allowed before partition key
    query.lsi('LSI1').limit(1)

    // @ts-expect-error - sort ops restricted to LSI sort key type (number vs string)
    query.lsi('LSI1').sortBeginsWith('foo')
  })

  test('Return Types', async () => {
    const q = query.primary().partitionFrom({ id: '1' })

    const resEntity = await q.exec()
    expectTypeOf(resEntity).toEqualTypeOf<InferEntity<typeof entity>[]>()
    // Verify optionality/absence of internal keys isn't strictly necessary if toEqualTypeOf passes,
    // but we can ensure they aren't accidentally exposed if types change.
    expectTypeOf(resEntity[0]).not.toHaveProperty('pk')

    const resRaw = await q.raw().exec()
    expectTypeOf(resRaw).toEqualTypeOf<InferDynamoItem<typeof entity>[]>()
    // Raw should have internal keys
    expectTypeOf(resRaw[0]).toHaveProperty('pk')
    expectTypeOf(resRaw[0]).toHaveProperty('sk')

    const resSelect = await q.select(['id', 'age']).exec()
    expectTypeOf(resSelect).toEqualTypeOf<Pick<InferEntity<typeof entity>, 'id' | 'age'>[]>()
    // Should strictly not have other fields
    expectTypeOf(resSelect[0]).not.toHaveProperty('email')

    const resCount = await q.count().exec()
    expectTypeOf(resCount).toEqualTypeOf<number>()
  })

  test('Edge Cases: Hash Key Only Table', () => {
    const q = new Query().entity(simpleEntity)

    // Primary query should work with just partition key
    q.primary().partitionFrom({ id: '123' }).exec()

    // Sort operations should be disallowed (result in never argument type)
    // @ts-expect-error - sortBeginsWith not allowed on hash-only table
    q.primary().sortBeginsWith('foo')

    // @ts-expect-error - partitionValue not allowed after state transition (even with limit/modifiers)
    q.primary().partitionFrom({ id: '123' }).limit(1).partitionValue('USER#123').exec()

    // @ts-expect-error - sortBeginsWith not allowed on hash-only table (even after modifiers)
    q.primary().partitionFrom({ id: '123' }).limit(1).sortBeginsWith('foo')

    // @ts-expect-error - Cannot use limit twice
    q.primary().partitionValue('asd').limit(3).limit(5)

    // @ts-expect-error - Cannot use count and raw together
    q.primary().partitionValue('asd').count().raw()

    // @ts-expect-error - Cannot use select and count together
    q.primary().partitionValue('asd').select(['id']).count()

    // LSI query should disallowed entirely (no local indexes)
    // @ts-expect-error - No LSI defined
    q.lsi('any')
  })

  test('Edge Cases: Table without LSI', () => {
    const q = new Query().entity(noLsiEntity)

    // Primary query works normally
    q.primary().partitionFrom({ id: '123' }).sortBeginsWith('2023').exec()

    // LSI query should be disallowed
    // @ts-expect-error - No LSI defined
    q.lsi('any')
  })
})
