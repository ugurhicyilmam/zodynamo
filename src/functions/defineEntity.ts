import { ZodSchema, z } from 'zod'

import { Entity } from '../types/Entity'
import { Table } from '../types/Table'

export type EntityKey<TTable extends Table<any>> = {
  [K in TTable['primaryIndex']['hashKey']]: TTable['fields'][K] extends 'number' ? number : string
} & (TTable['primaryIndex'] extends { rangeKey: infer RK extends string }
  ? {
      [K in RK]: TTable['fields'][K] extends 'number' ? number : string
    }
  : {})

export function defineEntity<
  TTable extends Table<any>,
  TName extends string,
  TSchema extends ZodSchema,
  const TKeyFields extends readonly (keyof z.infer<TSchema>)[],
  const TEntityType extends string
>(
  table: TTable,
  options: {
    name: TName
    schema: TSchema
    key: {
      fields: TKeyFields
      calculate: (item: Pick<z.infer<TSchema>, TKeyFields[number]>) => EntityKey<TTable>
    }
    entityType?: TTable extends { entityTypeField: string } ? TEntityType : never
  }
): Entity<TTable, TName, TSchema, TKeyFields, TEntityType> {
  return {
    table,
    name: options.name,
    schema: options.schema,
    key: options.key,
    entityType: options.entityType as any
  }
}
