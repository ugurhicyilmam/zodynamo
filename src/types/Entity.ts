import { ZodSchema, z } from 'zod'

import { Table } from './Table'
import { EntityHashKeyValue, EntityRangeKeyValue } from './EntityKey'
import { FieldPath, PickByPaths } from './FieldPath'

type KeyPartDefinition<
  TSchema extends ZodSchema,
  TKeyFields extends readonly FieldPath<z.infer<TSchema>>[],
  TResult
> = {
  fields: TKeyFields
  calculate: (item: PickByPaths<z.infer<TSchema>, TKeyFields[number]>) => TResult
}

/**
 * Represents a strictly typed entity bound to a specific DynamoDB table.
 *
 * This type captures:
 * - The Zod schema for runtime validation and type inference
 * - The table configuration to ensure key conformance
 * - The key calculation logic
 */
export interface Entity<
  TTable extends Table<any>,
  TName extends string,
  TSchema extends ZodSchema,
  THashKeyFields extends readonly FieldPath<z.infer<TSchema>>[],
  TRangeKeyFields extends readonly FieldPath<z.infer<TSchema>>[],
  TEntityType extends string | undefined
> {
  name: TName
  table: TTable
  schema: TSchema
  key: {
    hashKey: KeyPartDefinition<TSchema, THashKeyFields, EntityHashKeyValue<TTable>>
  } & (TTable['primaryIndex']['rangeKey'] extends string
    ? { rangeKey: KeyPartDefinition<TSchema, TRangeKeyFields, EntityRangeKeyValue<TTable>> }
    : { rangeKey?: never })
  entityType?: TEntityType
}
