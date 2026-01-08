import { describe, expectTypeOf, it, test } from 'vitest'
import { z } from 'zod'

import { Query } from '../../src/actions/query/Query'
import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { InferDynamoItem } from '../../src/types/InferDynamoItem'
import { InferEntity } from '../../src/types/InferEntity'
import { AssertExactKeys } from './utils/AssetExactKeys'

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

const tableWithGsi = defineTable({
  name: 'GsiTable',
  fields: { pk: 'string', sk: 'string', gsiPk: 'string' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  globalIndexes: { GSI: { hashKey: 'gsiPk' } }
})
const entityWithGsi = defineEntity(tableWithGsi, {
  name: 'GsiUser',
  schema: z.object({ id: z.string(), email: z.string(), gsiVal: z.string() }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => id },
    rangeKey: { fields: ['email'], calculate: ({ email }) => email }
  },
  globalIndexes: { GSI: { hashKey: { fields: ['gsiVal'], calculate: ({ gsiVal }) => gsiVal } } }
})

const tableWithLsi = defineTable({
  name: 'LsiTable',
  fields: { pk: 'string', sk: 'string', lsiSk: 'number' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  localIndexes: { LSI: { rangeKey: 'lsiSk' } }
})
const entityWithLsi = defineEntity(tableWithLsi, {
  name: 'LsiUser',
  schema: z.object({ id: z.string(), date: z.string(), score: z.number() }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => id },
    rangeKey: { fields: ['date'], calculate: ({ date }) => date }
  },
  localIndexes: { LSI: { rangeKey: { fields: ['score'], calculate: ({ score }) => score } } }
})

describe('Query DSL Type Validations', () => {
  const query = new Query().entity(entity)

  describe('Primary Query (Composite Key)', () => {
    test('Partition Key', () => {
      // Valid partitionValue
      query.primary().partitionValue('USER#123').rangeNoCondition().exec()
      // Valid partitionFrom
      query.primary().partitionFrom({ id: '123T' }).rangeNoCondition().exec()

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

    test('Options and State Transitions', () => {
      // Valid with options (requires rangeNoCondition if sort key exists)
      query
        .primary()
        .partitionValue('USER#123')
        .rangeNoCondition()
        .options({ consistent: true, limit: 10 })
        .exec()

      // Valid with sort and options
      query
        .primary()
        .partitionValue('USER#123')
        .range({ beginsWith: 'EMAIL' })
        .options({ limit: 5 })
        .exec()

      // @ts-expect-error - Cannot options before range
      query.primary().partitionValue('USER#123').options({ limit: 5 })

      // Cannot apply two sort operations
      query
        .primary()
        .partitionValue('USER#123')
        .range({ beginsWith: 'A' })
        // @ts-expect-error
        .range({ beginsWith: 'B' })

      // Cannot call options before partition
      query
        .primary()
        // @ts-expect-error
        .options({})

      // Cannot call range before partition
      query
        .primary()
        // @ts-expect-error
        .range({ eq: 'foo' })

      // Cannot call range after options
      query
        .primary()
        .partitionValue('P')
        .rangeNoCondition()
        .options({ limit: 1 })
        // @ts-expect-error
        .range({ eq: 'S' })
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

    test('Options and Strictness', () => {
      const q = gsi.partitionValue('S')

      q.rangeNoCondition().options({ limit: 10, order: 'asc' }).exec()

      // @ts-expect-error - consistentRead NOT allowed on GSI
      q.rangeNoCondition().options({ consistent: true })

      // @ts-expect-error - options not allowed before range (GSI has sort key)
      gsi.partitionValue('S').options({ limit: 1 })
    })
  })

  describe('LSI Query', () => {
    const lsi = query.lsi('LSI1')

    test('Structure', () => {
      lsi.partitionValue('USER#1').range({ eq: 20 }).exec()
      // Options (consistent read IS allowed on LSI)
      lsi.partitionValue('USER#1').rangeNoCondition().options({ consistent: true }).exec()
    })

    test('Strictness', () => {
      // @ts-expect-error - Options not allowed before range
      lsi.partitionValue('USER#1').options({ limit: 1 })
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
    const q = query.primary().partitionValue('U').rangeNoCondition()

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

  describe('State Transitions', () => {
    it('initial state', () => {
      const query = new Query().entity(entity)
      const simpleQuery = new Query().entity(simpleEntity)
      const gsiQuery = new Query().entity(entityWithGsi)
      const lsiQuery = new Query().entity(entityWithLsi)

      expectTypeOf<AssertExactKeys<typeof query, 'primary' | 'lsi' | 'gsi'>>().toEqualTypeOf<true>()
      expectTypeOf<AssertExactKeys<typeof simpleQuery, 'primary'>>().toEqualTypeOf<true>()
      expectTypeOf<AssertExactKeys<typeof gsiQuery, 'primary' | 'gsi'>>().toEqualTypeOf<true>()
      expectTypeOf<AssertExactKeys<typeof lsiQuery, 'primary' | 'lsi'>>().toEqualTypeOf<true>()
    })

    it('primary state', () => {
      const q1 = new Query().entity(entity).primary() // Has Sort Key
      const q2 = new Query().entity(entityWithGsi).gsi('GSI')
      const q3 = new Query().entity(entityWithLsi).lsi('LSI')
      const q4 = new Query().entity(simpleEntity).primary() // No Sort Key

      // Initial Primary State: Only Partition Key setters
      expectTypeOf<
        AssertExactKeys<typeof q1, 'partitionFrom' | 'partitionValue'>
      >().toEqualTypeOf<true>()
      expectTypeOf<
        AssertExactKeys<typeof q2, 'partitionFrom' | 'partitionValue'>
      >().toEqualTypeOf<true>()
      expectTypeOf<
        AssertExactKeys<typeof q3, 'partitionFrom' | 'partitionValue'>
      >().toEqualTypeOf<true>()
      expectTypeOf<
        AssertExactKeys<typeof q4, 'partitionFrom' | 'partitionValue'>
      >().toEqualTypeOf<true>()
    })

    it('range state', () => {
      // 1. Entity with Sort Key (Primary)
      const q1 = new Query().entity(entity).primary().partitionValue('USER#1')
      // Expect range operations
      expectTypeOf<
        AssertExactKeys<typeof q1, 'range' | 'rangeFrom' | 'rangeNoCondition'>
      >().toEqualTypeOf<true>()

      // 2. Entity with Sort Key (GSI)
      const q2 = new Query().entity(entity).gsi('GSI1').partitionValue('STATUS#1')
      // Expect range operations
      expectTypeOf<
        AssertExactKeys<typeof q2, 'range' | 'rangeFrom' | 'rangeNoCondition'>
      >().toEqualTypeOf<true>()

      // 3. Entity with Sort Key (LSI)
      const q3 = new Query().entity(entityWithLsi).lsi('LSI').partitionValue('USER#1')
      // Expect range operations
      expectTypeOf<
        AssertExactKeys<typeof q3, 'range' | 'rangeFrom' | 'rangeNoCondition'>
      >().toEqualTypeOf<true>()

      // 4. Entity WITHOUT Sort Key (Primary)
      const q4 = new Query().entity(simpleEntity).primary().partitionValue('USER#1')
      // Expect options/exec state (skip range)
      expectTypeOf<
        AssertExactKeys<typeof q4, 'options' | 'raw' | 'select' | 'count' | 'exec'>
      >().toEqualTypeOf<true>()

      // 5. Entity WITHOUT Sort Key (GSI)
      const q5 = new Query().entity(entityWithGsi).gsi('GSI').partitionValue('STATUS#1')
      // Expect options/exec state (skip range)
      expectTypeOf<
        AssertExactKeys<typeof q5, 'options' | 'raw' | 'select' | 'count' | 'exec'>
      >().toEqualTypeOf<true>()
    })

    it('options state', () => {
      const q1 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .options({})
      expectTypeOf<
        AssertExactKeys<typeof q1, 'raw' | 'select' | 'count' | 'exec'>
      >().toEqualTypeOf<true>()

      const q2 = new Query()
        .entity(entity)
        .gsi('GSI1')
        .partitionValue('STATUS#1')
        .rangeNoCondition()
        .options({})
      expectTypeOf<
        AssertExactKeys<typeof q2, 'raw' | 'select' | 'count' | 'exec'>
      >().toEqualTypeOf<true>()

      const q3 = new Query()
        .entity(entityWithLsi)
        .lsi('LSI')
        .partitionValue('USER#1')
        .rangeNoCondition()
        .options({})
      expectTypeOf<
        AssertExactKeys<typeof q3, 'raw' | 'select' | 'count' | 'exec'>
      >().toEqualTypeOf<true>()

      const q4 = new Query().entity(simpleEntity).primary().partitionValue('USER#1').options({})
      expectTypeOf<
        AssertExactKeys<typeof q4, 'raw' | 'select' | 'count' | 'exec'>
      >().toEqualTypeOf<true>()

      const q5 = new Query().entity(entityWithGsi).gsi('GSI').partitionValue('STATUS#1').options({})
      expectTypeOf<
        AssertExactKeys<typeof q5, 'raw' | 'select' | 'count' | 'exec'>
      >().toEqualTypeOf<true>()
    })

    it('output state', () => {
      const q1 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .raw()
      expectTypeOf<AssertExactKeys<typeof q1, 'exec'>>().toEqualTypeOf<true>()

      const q2 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .select(['email'])
      expectTypeOf<AssertExactKeys<typeof q2, 'exec'>>().toEqualTypeOf<true>()

      const q3 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .count()
      expectTypeOf<AssertExactKeys<typeof q3, 'exec'>>().toEqualTypeOf<true>()

      const q4 = new Query().entity(simpleEntity).primary().partitionValue('USER#1').raw()
      expectTypeOf<AssertExactKeys<typeof q4, 'exec'>>().toEqualTypeOf<true>()

      const q5 = new Query().entity(entityWithGsi).gsi('GSI').partitionValue('STATUS#1').count()
      expectTypeOf<AssertExactKeys<typeof q5, 'exec'>>().toEqualTypeOf<true>()

      // options -> output state
      const q6 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .options({})
        .raw()
      expectTypeOf<AssertExactKeys<typeof q6, 'exec'>>().toEqualTypeOf<true>()

      const q7 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .options({})
        .select(['email'])
      expectTypeOf<AssertExactKeys<typeof q7, 'exec'>>().toEqualTypeOf<true>()

      const q8 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .options({})
        .count()
      expectTypeOf<AssertExactKeys<typeof q8, 'exec'>>().toEqualTypeOf<true>()

      const q9 = new Query()
        .entity(entity)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .options({})

      // exec should also be possible directly after options
      expectTypeOf(q9.exec).toBeFunction()
    })
  })
})
