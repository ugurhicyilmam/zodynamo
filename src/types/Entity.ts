import { ZodSchema, z } from 'zod'

import { Table } from './Table'
import {
  EntityHashKeyValue,
  EntityLocalIndexRangeKeyValue,
  EntityRangeKeyValue,
  LocalIndexName
} from './EntityKey'
import { FieldPath, PickByPaths } from './FieldPath'

type KeyPartDefinition<
  TSchema extends ZodSchema,
  TKeyFields extends readonly FieldPath<z.infer<TSchema>>[],
  TResult
> = {
  fields: TKeyFields
  calculate: (item: PickByPaths<z.infer<TSchema>, TKeyFields[number]>) => TResult
}

export type EntityLocalIndexesDefinition<
  TTable extends Table<any>,
  TSchema extends ZodSchema,
  TLocalIndexRangeKeyFields extends Partial<
    Record<LocalIndexName<TTable>, readonly FieldPath<z.infer<TSchema>>[]>
  >
> = {
  [K in keyof TLocalIndexRangeKeyFields]: {
    rangeKey: KeyPartDefinition<
      TSchema,
      Exclude<TLocalIndexRangeKeyFields[K], undefined>,
      EntityLocalIndexRangeKeyValue<TTable, Extract<K, LocalIndexName<TTable>>>
    >
  }
}

type EntityLocalIndexesOption<
  TTable extends Table<any>,
  TSchema extends ZodSchema,
  TLocalIndexRangeKeyFields extends Partial<
    Record<LocalIndexName<TTable>, readonly FieldPath<z.infer<TSchema>>[]>
  >
> = LocalIndexName<TTable> extends never
  ? never
  : EntityLocalIndexesDefinition<TTable, TSchema, TLocalIndexRangeKeyFields>

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
  TLocalIndexRangeKeyFields extends Partial<
    Record<LocalIndexName<TTable>, readonly FieldPath<z.infer<TSchema>>[]>
  >,
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
  localIndexes?: EntityLocalIndexesOption<TTable, TSchema, TLocalIndexRangeKeyFields>
  entityType?: TEntityType
}
