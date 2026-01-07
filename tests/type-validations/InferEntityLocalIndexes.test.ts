import { describe, expect, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import {
  InferLocalIndexFields,
  InferLocalIndexNames,
  InferLocalIndexRangeKeyFields
} from '../../src/types/InferEntityKeyFields'

describe('InferEntityLocalIndexes', () => {
  test('infers local index names and fields', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', lsi1sk: 'string', lsi2sk: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'lsi1sk' },
        LSI2: { rangeKey: 'lsi2sk' }
      }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({
        id: z.string(),
        createdAt: z.string(),
        metrics: z.object({ score: z.number() })
      }),
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
            calculate: ({ createdAt }) => createdAt
          }
        },
        LSI2: {
          rangeKey: {
            fields: ['metrics.score'],
            calculate: ({ metrics }) => metrics.score
          }
        }
      }
    })

    type Names = InferLocalIndexNames<typeof entity>
    type IndexFields = InferLocalIndexFields<typeof entity>
    type Lsi1Fields = InferLocalIndexRangeKeyFields<typeof entity, 'LSI1'>
    type Lsi2Fields = InferLocalIndexRangeKeyFields<typeof entity, 'LSI2'>

    const nameOk1: Names = 'LSI1'
    const nameOk2: Names = 'LSI2'
    // @ts-expect-error - LSI3 is not defined
    const nameErr: Names = 'LSI3'

    const indexFieldsOk: IndexFields = {
      LSI1: { createdAt: '1' },
      LSI2: { metrics: { score: 1 } }
    }
    const lsi1Ok: Lsi1Fields = { createdAt: '1' }
    const lsi2Ok: Lsi2Fields = { metrics: { score: 1 } }

    // @ts-expect-error - missing LSI2
    const indexFieldsErr: IndexFields = {
      LSI1: { createdAt: '1' }
    }

    expect(nameOk1).toBeDefined()
    expect(nameOk2).toBeDefined()
    expect(nameErr).toBeDefined()
    expect(indexFieldsOk).toBeDefined()
    expect(lsi1Ok).toBeDefined()
    expect(lsi2Ok).toBeDefined()
    expect(indexFieldsErr).toBeDefined()
  })

  test('infers no local index names when none are defined', () => {
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

    type Names = InferLocalIndexNames<typeof entity>
    type IndexFields = InferLocalIndexFields<typeof entity>

    // @ts-expect-error - no local indexes configured
    const nameErr: Names = 'LSI1'
    expectTypeOf({} as IndexFields).toEqualTypeOf({})

    expect(nameErr).toBeDefined()
  })
})
