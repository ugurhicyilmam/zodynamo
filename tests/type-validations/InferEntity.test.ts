import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { InferEntity } from '../../src/types/InferEntity'

describe('InferEntity', () => {
  test('infers external entity type correctly', () => {
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
        hashKey: {
          fields: ['id'],
          calculate: value => `USER#${value.id}`
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      },
      entityType: 'USER'
    })

    type External = InferEntity<typeof entity>

    // runtime check just to satisfy test runner
    expect(true).toBe(true)

    const ext: External = { id: '1', name: 'Alice' }

    // @ts-expect-error - missing schema field
    const extErr: External = { id: '1' }

    // @ts-expect-error - extra field
    const extErr2: External = { id: '1', name: 'Alice', extra: 'field' }
  })
})
