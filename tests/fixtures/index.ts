import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'

export const TableCompositeAllFeatures = defineTable({
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

export const EntityCompositeAllFeatures = defineEntity(TableCompositeAllFeatures, {
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

export const EntityWithNestedData = defineEntity(TableCompositeAllFeatures, {
  name: 'UserWithNested',
  schema: z.object({
    id: z.string(),
    email: z.string(),
    meta: z.record(z.string()),
    metadata: z.object({
      tags: z.array(z.string()),
      version: z.number()
    }),
    history: z.array(
      z.object({
        action: z.string(),
        timestamp: z.number()
      })
    )
  }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
    rangeKey: { fields: ['email'], calculate: ({ email }) => `EMAIL#${email}` }
  }
})

export const TablePkString = defineTable({
  name: 'SimpleTable',
  fields: {
    pk: 'string'
  },
  primaryIndex: {
    hashKey: 'pk'
  }
})

export const EntityPkString = defineEntity(TablePkString, {
  name: 'SimpleUser',
  schema: z.object({
    id: z.string()
  }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` }
  }
})

export const TableCompositeGsiString = defineTable({
  name: 'GsiTable',
  fields: { pk: 'string', sk: 'string', gsiPk: 'string' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  globalIndexes: { GSI: { hashKey: 'gsiPk' } }
})

export const EntityCompositeGsiString = defineEntity(TableCompositeGsiString, {
  name: 'GsiUser',
  schema: z.object({ id: z.string(), email: z.string(), gsiVal: z.string() }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => id },
    rangeKey: { fields: ['email'], calculate: ({ email }) => email }
  },
  globalIndexes: { GSI: { hashKey: { fields: ['gsiVal'], calculate: ({ gsiVal }) => gsiVal } } }
})

export const TableCompositeLsiNumber = defineTable({
  name: 'LsiTable',
  fields: { pk: 'string', sk: 'string', lsiSk: 'number' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  localIndexes: { LSI: { rangeKey: 'lsiSk' } }
})

export const EntityCompositeLsiNumber = defineEntity(TableCompositeLsiNumber, {
  name: 'LsiUser',
  schema: z.object({ id: z.string(), date: z.string(), score: z.number() }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => id },
    rangeKey: { fields: ['date'], calculate: ({ date }) => date }
  },
  localIndexes: { LSI: { rangeKey: { fields: ['score'], calculate: ({ score }) => score } } }
})

export const TableCompositeSkNumber = defineTable({
  name: 'TableSkNumber',
  fields: { pk: 'string', sk: 'number' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' }
})

export const EntityCompositeSkNumber = defineEntity(TableCompositeSkNumber, {
  name: 'UserSkNumber',
  schema: z.object({ id: z.string(), timestamp: z.number() }),
  key: {
    hashKey: { fields: ['id'], calculate: ({ id }) => id },
    rangeKey: { fields: ['timestamp'], calculate: ({ timestamp }) => timestamp }
  }
})
