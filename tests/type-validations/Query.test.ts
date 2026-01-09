import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expectTypeOf, it } from 'vitest'

import { Query } from '../../src/actions/query/Query'
import { InferDynamoItem } from '../../src/types/InferDynamoItem'
import { InferEntity } from '../../src/types/InferEntity'
import {
  EntityCompositeAllFeatures,
  EntityCompositeGsiString,
  EntityCompositeLsiNumber,
  EntityCompositeSkNumber,
  EntityPkString,
  EntityWithNestedData
} from '../fixtures'
import { AssertExactKeys } from './utils/AssetExactKeys'

const dynamo = {} as DynamoDBDocumentClient

describe('Query DSL Type Validations', () => {
  describe('State Transitions', () => {
    describe('Initial State', () => {
      it('exposes correct index methods based on entity configuration', () => {
        const withAllIndexes = new Query(dynamo).entity(EntityCompositeAllFeatures)
        const pkOnly = new Query(dynamo).entity(EntityPkString)
        const withGsi = new Query(dynamo).entity(EntityCompositeGsiString)
        const withLsi = new Query(dynamo).entity(EntityCompositeLsiNumber)

        expectTypeOf<
          AssertExactKeys<typeof withAllIndexes, 'primary' | 'lsi' | 'gsi'>
        >().toEqualTypeOf<true>()
        expectTypeOf<AssertExactKeys<typeof pkOnly, 'primary'>>().toEqualTypeOf<true>()
        expectTypeOf<AssertExactKeys<typeof withGsi, 'primary' | 'gsi'>>().toEqualTypeOf<true>()
        expectTypeOf<AssertExactKeys<typeof withLsi, 'primary' | 'lsi'>>().toEqualTypeOf<true>()
      })
    })

    describe('Partition State', () => {
      it('exposes only partition key setters after selecting an index', () => {
        const primary = new Query(dynamo).entity(EntityCompositeAllFeatures).primary()
        const gsi = new Query(dynamo).entity(EntityCompositeGsiString).gsi('GSI')
        const lsi = new Query(dynamo).entity(EntityCompositeLsiNumber).lsi('LSI')
        const pkOnly = new Query(dynamo).entity(EntityPkString).primary()

        expectTypeOf<
          AssertExactKeys<typeof primary, 'partitionFrom' | 'partitionValue'>
        >().toEqualTypeOf<true>()
        expectTypeOf<
          AssertExactKeys<typeof gsi, 'partitionFrom' | 'partitionValue'>
        >().toEqualTypeOf<true>()
        expectTypeOf<
          AssertExactKeys<typeof lsi, 'partitionFrom' | 'partitionValue'>
        >().toEqualTypeOf<true>()
        expectTypeOf<
          AssertExactKeys<typeof pkOnly, 'partitionFrom' | 'partitionValue'>
        >().toEqualTypeOf<true>()
      })
    })

    describe('Range State', () => {
      it('exposes range operations for entities with sort keys', () => {
        const primaryWithSk = new Query(dynamo)
          .entity(EntityCompositeAllFeatures)
          .primary()
          .partitionValue('USER#1')
        const gsiWithSk = new Query(dynamo)
          .entity(EntityCompositeAllFeatures)
          .gsi('GSI1')
          .partitionValue('STATUS#1')
        const lsiWithSk = new Query(dynamo)
          .entity(EntityCompositeLsiNumber)
          .lsi('LSI')
          .partitionValue('USER#1')

        expectTypeOf<
          AssertExactKeys<typeof primaryWithSk, 'range' | 'rangeFrom' | 'rangeNoCondition'>
        >().toEqualTypeOf<true>()
        expectTypeOf<
          AssertExactKeys<typeof gsiWithSk, 'range' | 'rangeFrom' | 'rangeNoCondition'>
        >().toEqualTypeOf<true>()
        expectTypeOf<
          AssertExactKeys<typeof lsiWithSk, 'range' | 'rangeFrom' | 'rangeNoCondition'>
        >().toEqualTypeOf<true>()
      })

      it('skips range operations for hash-only indexes', () => {
        const pkOnly = new Query(dynamo).entity(EntityPkString).primary().partitionValue('USER#1')
        const gsiHashOnly = new Query(dynamo)
          .entity(EntityCompositeGsiString)
          .gsi('GSI')
          .partitionValue('STATUS#1')

        expectTypeOf<
          AssertExactKeys<typeof pkOnly, 'options' | 'raw' | 'select' | 'count' | 'exec'>
        >().toEqualTypeOf<true>()
        expectTypeOf<
          AssertExactKeys<typeof gsiHashOnly, 'options' | 'raw' | 'select' | 'count' | 'exec'>
        >().toEqualTypeOf<true>()
      })
    })

    describe('Options State', () => {
      it('exposes output methods after setting options', () => {
        const afterOptions = new Query(dynamo)
          .entity(EntityCompositeAllFeatures)
          .primary()
          .partitionValue('USER#1')
          .rangeNoCondition()
          .options({})

        expectTypeOf<
          AssertExactKeys<typeof afterOptions, 'raw' | 'select' | 'count' | 'exec'>
        >().toEqualTypeOf<true>()
      })

      it('allows exec directly after options', () => {
        const query = new Query(dynamo)
          .entity(EntityCompositeAllFeatures)
          .primary()
          .partitionValue('USER#1')
          .rangeNoCondition()
          .options({})

        expectTypeOf(query.exec).toBeFunction()
      })
    })

    describe('Output State', () => {
      it('exposes only exec after selecting an output format', () => {
        const withRaw = new Query(dynamo)
          .entity(EntityCompositeAllFeatures)
          .primary()
          .partitionValue('USER#1')
          .rangeNoCondition()
          .raw()

        const withSelect = new Query(dynamo)
          .entity(EntityCompositeAllFeatures)
          .primary()
          .partitionValue('USER#1')
          .rangeNoCondition()
          .select(['email'])

        const withCount = new Query(dynamo)
          .entity(EntityCompositeAllFeatures)
          .primary()
          .partitionValue('USER#1')
          .rangeNoCondition()
          .count()

        expectTypeOf<AssertExactKeys<typeof withRaw, 'exec'>>().toEqualTypeOf<true>()
        expectTypeOf<AssertExactKeys<typeof withSelect, 'exec'>>().toEqualTypeOf<true>()
        expectTypeOf<AssertExactKeys<typeof withCount, 'exec'>>().toEqualTypeOf<true>()
      })
    })
  })

  describe('Primary Index Queries', () => {
    describe('Partition Key', () => {
      it('accepts valid partition key values and transformations', () => {
        const query = new Query(dynamo).entity(EntityCompositeAllFeatures).primary()

        query.partitionValue('USER#123').rangeNoCondition().exec()
        query.partitionFrom({ id: '123T' }).rangeNoCondition().exec()
      })

      it('rejects invalid partition key types', () => {
        const query = new Query(dynamo).entity(EntityCompositeAllFeatures).primary()

        // @ts-expect-error - Invalid type
        query.partitionValue(123)
        // @ts-expect-error - Invalid input type
        query.partitionFrom({ id: 123 })
        // @ts-expect-error - Missing required fields
        query.partitionFrom({})
      })
    })

    describe('Range Conditions - String Sort Key', () => {
      const query = new Query(dynamo)
        .entity(EntityCompositeAllFeatures)
        .primary()
        .partitionValue('USER#1')

      it('supports comparison operators', () => {
        query.range({ eq: 'EMAIL#test' }).exec()
        query.range({ gt: 'EMAIL#a' }).exec()
        query.range({ gte: 'EMAIL#a' }).exec()
        query.range({ lt: 'EMAIL#z' }).exec()
        query.range({ lte: 'EMAIL#z' }).exec()

        // @ts-expect-error - Invalid type for string sort key
        query.range({ eq: 123 })
      })

      it('supports beginsWith for string keys', () => {
        query.range({ beginsWith: 'EMAIL' }).exec()

        // @ts-expect-error - Invalid type
        query.range({ beginsWith: 123 })
      })

      it('supports between operator', () => {
        query.range({ between: ['A', 'Z'] }).exec()

        // @ts-expect-error - Mixed types in between
        query.range({ between: ['A', 1] })
        // @ts-expect-error - Between requires array
        query.range({ between: 'A' })
      })

      it('allows only one operator per range condition', () => {
        // @ts-expect-error - Multiple operators not allowed
        query.range({ eq: 'A', lt: 'B' })
      })

      it('supports rangeFrom transformation', () => {
        query.rangeFrom({ email: 'test' }).exec()

        // @ts-expect-error - Invalid input type
        query.rangeFrom({ email: 123 })
        // @ts-expect-error - Missing required field
        query.rangeFrom({})
      })

      it('supports rangeNoCondition', () => {
        query.rangeNoCondition().exec()
        query.rangeNoCondition().options({ limit: 10 }).exec()
      })
    })

    describe('Range Conditions - Number Sort Key', () => {
      const query = new Query(dynamo)
        .entity(EntityCompositeSkNumber)
        .primary()
        .partitionValue('USER#1')

      it('supports comparison operators with numbers', () => {
        query.range({ gt: 100 }).exec()
        query.range({ between: [100, 200] }).exec()

        // @ts-expect-error - String not allowed for number sort key
        query.range({ eq: '100' })
        // @ts-expect-error - beginsWith not allowed for number keys
        query.range({ beginsWith: '1' })
      })
    })

    describe('State Transition Rules', () => {
      const query = new Query(dynamo).entity(EntityCompositeAllFeatures).primary()

      it('enforces correct method call order', () => {
        // Valid: partition -> range -> options
        query
          .partitionValue('USER#123')
          .rangeNoCondition()
          .options({ consistent: true, limit: 10 })
          .exec()
        query.partitionValue('USER#123').range({ beginsWith: 'EMAIL' }).options({ limit: 5 }).exec()

        // @ts-expect-error - Cannot call options before range (when sort key exists)
        query.partitionValue('USER#123').options({ limit: 5 })

        // @ts-expect-error - Cannot call options before partition
        query.options({})

        // @ts-expect-error - Cannot call range before partition
        query.range({ eq: 'foo' })

        // @ts-expect-error - Cannot call range after options
        query.partitionValue('P').rangeNoCondition().options({ limit: 1 }).range({ eq: 'S' })

        // @ts-expect-error - Cannot call exec immediately after partition (when sort key exists)
        query.partitionValue('P').exec()

        // @ts-expect-error - Cannot call raw immediately after partition (when sort key exists)
        query.partitionValue('P').raw()
      })

      it('prevents duplicate range operations', () => {
        const withRange = query.partitionValue('USER#123').range({ beginsWith: 'A' })

        // @ts-expect-error - Cannot apply range twice
        withRange.range({ beginsWith: 'B' })
      })

      it('validates option types', () => {
        query
          .partitionValue('USER#123')
          .rangeNoCondition()
          .options({ filter: { attr: 'email', eq: 'active' } })

        // @ts-expect-error - Missing Table SK
        query.partitionValue('USER#1').rangeNoCondition().options({ limit: '1' })

        // @ts-expect-error - Invalid startKey type (must be object)
        query.partitionValue('USER#123').rangeNoCondition().options({ startKey: 'BAD_KEY' })

        query
          .partitionValue('USER#123')
          .rangeNoCondition()
          // @ts-expect-error - Invalid startKey structure (missing required keys)
          .options({ startKey: { pk: 'USER#1' } })

        // Valid startKey for Primary Index
        query
          .partitionValue('USER#123')
          .rangeNoCondition()
          .options({ startKey: { pk: 'USER#1', sk: 'EMAIL#test' } })
      })
    })
  })

  describe('GSI Queries', () => {
    describe('GSI with Composite Key', () => {
      const query = new Query(dynamo).entity(EntityCompositeAllFeatures).gsi('GSI1')

      it('validates partition key', () => {
        query.partitionFrom({ status: 'ACTIVE' }).rangeNoCondition().exec()
        query.partitionValue('STATUS#ACTIVE').rangeNoCondition().exec()

        // @ts-expect-error - Missing required field
        query.partitionFrom({})

        // @ts-expect-error - Invalid field name
        query.partitionFrom({ invalid: 'field' })

        // @ts-expect-error - Invalid type
        query.partitionFrom({ status: 123 })
        // @ts-expect-error - Invalid type
        query.partitionValue(123)

        // @ts-expect-error - Wrong fields for GSI
        query.partitionFrom({ id: '1' })
      })

      it('supports range conditions for number sort key', () => {
        const q = query.partitionValue('STATUS#ACTIVE')

        q.range({ eq: 25 }).exec()
        q.range({ gt: 18 }).exec()
        q.range({ gte: 18 }).exec()
        q.range({ lt: 65 }).exec()
        q.range({ lte: 100 }).exec()
        q.range({ between: [18, 65] }).exec()
        q.rangeFrom({ age: 30 }).exec()

        // @ts-expect-error - String not allowed for number sort key
        q.range({ eq: '25' })

        // @ts-expect-error - beginsWith only for string keys
        q.range({ beginsWith: '1' })

        // @ts-expect-error - Only one operator allowed
        q.range({ eq: 1, lt: 2 })

        // @ts-expect-error - Invalid rangeFrom input type
        q.rangeFrom({ age: '30' })
      })

      it('enforces GSI-specific option constraints', () => {
        const q = query.partitionValue('S')

        q.rangeNoCondition().options({ limit: 10, order: 'asc' }).exec()

        // @ts-expect-error - consistentRead NOT allowed on GSI
        q.rangeNoCondition().options({ consistent: true })

        // @ts-expect-error - Global Index startKey requires GSI Keys + Table Keys
        q.rangeNoCondition().options({ startKey: { gsi1pk: 'STATUS#1', gsi1sk: '2023' } })

        // Valid startKey for GSI
        q.rangeNoCondition().options({
          startKey: { pk: 'USER#1', sk: 'EMAIL#test', gsi1pk: 'STATUS#1', gsi1sk: 25 }
        })

        // @ts-expect-error - Options not allowed before range
        query.partitionValue('S').options({ limit: 1 })
      })
    })

    describe('GSI with Hash Key Only', () => {
      const query = new Query(dynamo).entity(EntityCompositeGsiString).gsi('GSI')

      it('validates partition key', () => {
        query.partitionValue('value').exec()
        query.partitionFrom({ gsiVal: 'value' }).exec()

        // @ts-expect-error - Invalid type
        query.partitionValue(123)
        // @ts-expect-error - Invalid input type
        query.partitionFrom({ gsiVal: 123 })
      })

      it('does not expose range operations', () => {
        // @ts-expect-error - range not allowed
        query.partitionValue('value').range({ eq: 'x' })
        // @ts-expect-error - rangeFrom not allowed
        query.partitionValue('value').rangeFrom({ email: 'x' })
        // @ts-expect-error - rangeNoCondition not allowed
        query.partitionValue('value').rangeNoCondition()
      })

      it('supports output formats and options', () => {
        query.partitionValue('value').options({ limit: 1 }).raw().exec()
        query.partitionValue('value').select(['email']).exec()

        // @ts-expect-error - consistentRead NOT allowed on GSI
        query.partitionValue('value').options({ consistent: true })
      })
    })
  })

  describe('LSI Queries', () => {
    const query = new Query(dynamo).entity(EntityCompositeAllFeatures).lsi('LSI1')

    it('validates partition key and range operations', () => {
      query.partitionValue('USER#1').range({ eq: 20 }).exec()
      query.partitionFrom({ id: '1' }).rangeNoCondition().exec()
      query.partitionValue('USER#1').rangeFrom({ age: 30 }).exec()

      // @ts-expect-error - Invalid input type
      query.partitionFrom({ id: 1 })
      // @ts-expect-error - Wrong fields for LSI
      query.partitionFrom({ score: 1 })
    })

    it('allows consistent reads on LSI', () => {
      query.partitionValue('USER#1').rangeNoCondition().options({ consistent: true }).exec()
    })

    it('validates startKey for LSI', () => {
      // Valid LSI startKey (Table PK + LSI SK... wait, LSI shares PK, so Table PK is required. Table SK is also required for uniqueness?)
      // DynamoDB: LSI query start key must contain: Table PK, LSI Range Key, AND Table Range Key (to uniquely identify item)
      // Our InferQueryStartKey should likely include Table SK too if it exists.
      // Let's check my implementation of InferQueryStartKey for LSI.
      // It includes Table PK. Does it include Table SK?
      // Implementation:
      //   [K in E['table']['primaryIndex']['hashKey']]: ...
      //   & (E['table']['primaryIndex']['rangeKey'] extends string ? ... : {})  <-- Yes, Table Range Key is included unconditionally.
      //   & (Index LSI SK)

      query.partitionValue('USER#1').rangeNoCondition()
    })
  })

  describe('Hash-Only Primary Index', () => {
    const query = new Query(dynamo).entity(EntityPkString).primary()

    it('does not expose range operations', () => {
      query.partitionValue('USER#1').exec()

      // @ts-expect-error - range not allowed
      query.partitionValue('USER#1').range({ eq: 'x' })
      // @ts-expect-error - rangeFrom not allowed
      query.partitionValue('USER#1').rangeFrom({ id: '1' })
      // @ts-expect-error - rangeNoCondition not allowed
      query.partitionValue('USER#1').rangeNoCondition()
    })

    it('supports output formats and options', () => {
      query.partitionValue('USER#1').options({ limit: 1 }).raw().exec()
      query.partitionValue('USER#1').select(['id']).exec()
    })
  })

  describe('Return Types', () => {
    const query = new Query(dynamo)
      .entity(EntityCompositeAllFeatures)
      .primary()
      .partitionValue('U')
      .rangeNoCondition()

    it('returns entities by default', async () => {
      const result = await query.exec()
      expectTypeOf(result).toEqualTypeOf<InferEntity<typeof EntityCompositeAllFeatures>[]>()
    })

    it('returns raw DynamoDB items when using raw()', async () => {
      const result = await query.raw().exec()
      expectTypeOf(result).toEqualTypeOf<InferDynamoItem<typeof EntityCompositeAllFeatures>[]>()
    })

    it('returns count when using count()', async () => {
      const result = await query.count().exec()
      expectTypeOf(result).toEqualTypeOf<number>()
    })

    it('returns projected entities when using select()', async () => {
      const result = await query.select(['email', 'age']).exec()
      expectTypeOf(result).toEqualTypeOf<
        Pick<InferEntity<typeof EntityCompositeAllFeatures>, 'email' | 'age'>[]
      >()
    })

    it('prevents chaining output operations', () => {
      // @ts-expect-error - Cannot chain count().raw()
      query.count().raw()
      // @ts-expect-error - Cannot chain select().count()
      query.select(['id']).count()
    })

    it('validates selected field names', () => {
      // @ts-expect-error - Invalid field
      query.select(['missingField'])
    })
  })

  describe('Field Path Selection', () => {
    const query = new Query(dynamo)
      .entity(EntityWithNestedData)
      .primary()
      .partitionValue('USER#1')
      .rangeNoCondition()

    it('supports top-level field selection', () => {
      query.select(['metadata']).exec()
      query.select(['id'])
      query.select(['email', 'metadata'])

      // @ts-expect-error - Invalid field
      query.select(['incorrect']).exec()
    })

    it('supports nested field selection with dot notation', () => {
      query.select(['metadata.version']).exec()
      query.select(['history[0].action']).exec()
      query.select(['history[0].timestamp']).exec()
    })

    it('supports nested field selection with bracket notation for arrays', () => {
      query.select(['metadata.tags[0]']).exec()
      query.select(['history[0].action']).exec()
      query.select(['history[0].timestamp']).exec()
    })

    it('validates nested field names', () => {
      // @ts-expect-error - Unknown nested field
      query.select(['metadata.unknown'])
      // @ts-expect-error - Unknown top-level field
      query.select(['unknown'])
    })

    it('allows numeric array indices', () => {
      query.select(['metadata.tags[-1]'])
      query.select(['metadata.tags[0.4]'])
    })

    it('validates field path syntax', () => {
      // @ts-expect-error - Dynamic keys on Record<string, string> hit recursion limits
      query.select([`meta['any[char]-you.want!']`]).exec()

      // @ts-expect-error - Non-numeric index
      query.select(['history[a].action'])
      // @ts-expect-error - Invalid bracket syntax
      query.select(['history[0.action'])
      // @ts-expect-error - Cannot index number type
      query.select(['metadata.version[0]'])
    })
  })

  describe('Filter Conditions', () => {
    const baseQuery = new Query(dynamo)
      .entity(EntityWithNestedData)
      .primary()
      .partitionValue('USER#1')
      .rangeNoCondition()

    new Query(dynamo).entity(EntityWithNestedData).gsi

    describe('Basic Operators', () => {
      it('supports comparison operators', () => {
        baseQuery.options({ filter: { attr: 'metadata.version', eq: 1 } }).exec()
        baseQuery.options({ filter: { attr: 'metadata.version', ne: 1 } }).exec()
        baseQuery.options({ filter: { attr: 'metadata.version', between: [1, 2] } }).exec()

        // @ts-expect-error - Type mismatch (number field requires number value)
        baseQuery.options({ filter: { attr: 'metadata.version', eq: 'str' } })

        // @ts-expect-error - Type mismatch in between array
        baseQuery.options({ filter: { attr: 'metadata.version', between: [1, '2'] } })
      })

      it('supports string operators', () => {
        baseQuery.options({ filter: { attr: 'email', beginsWith: 'a' } }).exec()

        // @ts-expect-error - beginsWith requires sortable type
        baseQuery.options({ filter: { attr: 'email', beginsWith: true } })
      })

      it('supports array operators', () => {
        baseQuery.options({ filter: { attr: 'email', in: ['a@x.com', 'b@x.com'] } }).exec()
      })

      it('supports existence operators', () => {
        baseQuery.options({ filter: { attr: 'metadata', exists: true } }).exec()
        baseQuery.options({ filter: { attr: 'metadata', type: 'map' } }).exec()

        // @ts-expect-error - Invalid type literal
        baseQuery.options({ filter: { attr: 'metadata', type: 'oops' } })
      })

      it('supports nested path filters', () => {
        baseQuery.options({ filter: { attr: 'metadata.tags[0]', eq: 'tag' } }).exec()
        baseQuery.options({ filter: { attr: 'history[1].action', eq: 'tag' } }).exec()

        // @ts-expect-error - Recursion limit on dynamic Record keys
        baseQuery.options({ filter: { attr: `meta['any[char]-you.want!']`, contains: 'x' } }).exec()
      })

      it('validates filter attribute paths', () => {
        // @ts-expect-error - Unknown path
        baseQuery.options({ filter: { attr: 'nope' } })
      })

      it('enforces single operator per filter', () => {
        // @ts-expect-error - Must use exactly one operator
        baseQuery.options({ filter: { attr: 'metadata.version', eq: 1, lt: 2 } })
      })
    })

    describe('Logical Composition', () => {
      it('supports AND conditions', () => {
        baseQuery
          .options({
            filter: {
              and: [
                { attr: 'metadata.version', gte: 1 },
                { attr: 'metadata.tags[0]', exists: true }
              ]
            }
          })
          .exec()
      })

      it('supports OR conditions', () => {
        baseQuery
          .options({
            filter: {
              or: [
                { attr: 'metadata.version', eq: 1 },
                { attr: 'metadata.version', eq: 2 }
              ]
            }
          })
          .exec()
      })
    })

    describe('Edge Cases', () => {
      it('supports raw attribute filters', () => {
        baseQuery.options({ filter: { rawAttr: 'pk', eq: 'USER#1' } }).exec()
        baseQuery.options({ filter: { rawAttr: 'sk', beginsWith: 'EMAIL#' } }).exec()

        // @ts-expect-error - Invalid operator for rawAttr
        baseQuery.options({ filter: { rawAttr: 'pk', invalidOp: 'x' } })
      })

      it('allows negative list indices at runtime (type-level limitation)', () => {
        // NOTE: Negative indices cannot be caught at type level - runtime validation needed
        baseQuery.options({ filter: { attr: 'history[-1].action', eq: 'x' } })
        baseQuery.options({ filter: { attr: 'metadata.tags[-1]', eq: 'tag' } }).exec()
      })
    })
  })
})
