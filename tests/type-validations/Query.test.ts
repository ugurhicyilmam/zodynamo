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
    status: z.string(),
    createdAt: z.string()
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

describe('Query DSL Type Validations', () => {
  const query = new Query().entity(entity)

  describe('Primary Query (Composite Key)', () => {
    test('Partition Key', () => {
      // Valid partitionValue
      query.primary().partitionValue('USER#123').exec()
      // Valid partitionFrom
      query.primary().partitionFrom({ id: '123T' }).exec()

      // @ts-expect-error - Invalid partitionKey type
      query.primary().partitionValue(123)
      // @ts-expect-error - Invalid partitionFrom input
      query.primary().partitionFrom({ id: 123 })
      // @ts-expect-error - Missing fields for partitionFrom
      query.primary().partitionFrom({})
    })

    test('Range Conditions (String Key)', () => {
      const q = query.primary().partitionValue('USER#1')

      // eq
      q.range({ eq: 'EMAIL#test' }).exec()
      // @ts-expect-error - invalid type
      q.range({ eq: 123 })

      // beginsWith
      q.range({ beginsWith: 'EMAIL' }).exec()
      // @ts-expect-error - invalid type
      q.range({ beginsWith: 123 })

      // between
      q.range({ between: ['A', 'Z'] }).exec()
      // @ts-expect-error - invalid type
      q.range({ between: ['A', 1] })
      // @ts-expect-error - not an array
      q.range({ between: 'A' })

      // rangeFrom
      q.rangeFrom({ email: 'test' }).exec()
      // @ts-expect-error - invalid input
      q.rangeFrom({ email: 123 })
      // @ts-expect-error - missing field
      q.rangeFrom({})

      // rangeNoCondition
      q.rangeNoCondition().exec()
      q.rangeNoCondition().options({ limit: 10 }).exec()
    })

    test('Options', () => {
      const q = query.primary().partitionValue('USER#1')

      q.options({ limit: 10, consistent: true, order: 'desc' }).exec()
      q.rangeNoCondition().options({ limit: 5 }).exec()

      // @ts-expect-error - invalid option key
      q.options({ invalid: true })
      // @ts-expect-error - invalid limit type
      q.options({ limit: '10' })
    })

    test('State Transitions', () => {
      // Cannot call options before partition
      // @ts-expect-error
      query.primary().options({})

      // Cannot call range before partition
      // @ts-expect-error
      query.primary().range({ eq: 'foo' })

      // Cannot call range after options
      // @ts-expect-error
      query.primary().partitionValue('P').options({ limit: 1 }).range({ eq: 'S' })

      // Cannot call range twice
      // @ts-expect-error
      query.primary().partitionValue('P').range({ eq: 'S' }).range({ eq: 'S' })
    })
  })

  describe('GSI Query (Number Sort Key)', () => {
    const gsi = query.gsi('GSI1')

    test('Range Conditions (Number Key)', () => {
      const q = gsi.partitionValue('STATUS#ACTIVE')

      // eq
      q.range({ eq: 25 }).exec()
      // @ts-expect-error - invalid type (string assigned to number key)
      q.range({ eq: '25' })

      // gt, lt, gte, lte
      q.range({ gt: 18 }).exec()
      q.range({ lte: 100 }).exec()

      // between
      q.range({ between: [18, 65] }).exec()

      // beginsWith - NOT available on number key
      // @ts-expect-error - beginsWith only for string keys
      q.range({ beginsWith: '1' })

      // rangeFrom
      q.rangeFrom({
        id: 'x',
        email: 'test',
        age: 30,
        status: 'active',
        createdAt: '2023-01-01'
      }).exec()
      // @ts-expect-error - invalid input type
      q.rangeFrom({ age: '30' })
    })

    test('Options', () => {
      const q = gsi.partitionValue('S')

      q.options({ limit: 10, order: 'asc' }).exec()

      // @ts-expect-error - consistentRead NOT allowed on GSI
      q.options({ consistent: true })
    })
  })

  describe('LSI Query', () => {
    const lsi = query.lsi('LSI1')

    test('Structure', () => {
      // Partition key comes from table's PK (hash only part of it? No, table PK is used)
      // Wait, LSI shares partition key with table.
      // query.lsi('LSI1').partitionValue takes... the table's PK.
      lsi.partitionValue('USER#1').range({ eq: 20 }).exec()

      // Options (consistent read IS allowed on LSI)
      lsi.partitionValue('USER#1').options({ consistent: true }).exec()
    })
  })

  describe('Simple Table (Hash Only)', () => {
    const simpleQ = new Query().entity(simpleEntity)

    test('No Range Operations', () => {
      simpleQ.primary().partitionValue('USER#1').exec()

      // @ts-expect-error - range not allowed
      simpleQ.primary().partitionValue('USER#1').range({ eq: 'x' })
      // @ts-expect-error - rangeFrom not allowed
      simpleQ.primary().partitionValue('USER#1').rangeFrom({ id: '1' })
      // @ts-expect-error - rangeNoCondition not allowed
      simpleQ.primary().partitionValue('USER#1').rangeNoCondition()
    })
  })

  describe('Return Types', () => {
    const q = query.primary().partitionValue('U')

    test('Entity', async () => {
      const res = await q.exec()
      expectTypeOf(res).toEqualTypeOf<InferEntity<typeof entity>[]>()
    })

    test('Raw', async () => {
      const res = await q.raw().exec()
      expectTypeOf(res).toEqualTypeOf<InferDynamoItem<typeof entity>[]>()
    })

    test('Count', async () => {
      const res = await q.count().exec()
      expectTypeOf(res).toEqualTypeOf<number>()
    })

    test('Select', async () => {
      const res = await q.select(['email', 'age']).exec()
      expectTypeOf(res).toEqualTypeOf<Pick<InferEntity<typeof entity>, 'email' | 'age'>[]>()
      expectTypeOf(res[0]).toHaveProperty('email')
      expectTypeOf(res[0]).not.toHaveProperty('id')
    })

    test('Chaining Output Ops', () => {
      // count().raw() -> Error
      // @ts-expect-error
      q.count().raw()
      // select().count() -> Error
      // @ts-expect-error
      q.select(['id']).count()
    })
  })
})
