import { ZodSchema, z } from 'zod'

import {
  EntityGlobalIndexHashKeyValue,
  EntityGlobalIndexRangeKeyValue,
  EntityHashKeyValue,
  EntityLocalIndexRangeKeyValue,
  EntityRangeKeyValue,
  GlobalIndexName,
  LocalIndexName
} from './EntityKey'
import { FieldPath, PickByPaths } from './FieldPath'
import { Table } from './Table'

/**
 * Defines how to construct a key part (hash or range) from entity fields.
 *
 * @template TSchema - The Zod schema for the entity
 * @template TKeyFields - The field paths used to calculate this key part
 * @template TResult - The resulting DynamoDB key type (string or number)
 *
 * @property fields - Array of dot-notation field paths required for calculation
 * @property calculate - Function that computes the key value from the specified fields
 */
type KeyPartDefinition<
  TSchema extends ZodSchema,
  TKeyFields extends readonly FieldPath<z.infer<TSchema>>[],
  TResult
> = {
  fields: TKeyFields
  calculate: (item: PickByPaths<z.infer<TSchema>, TKeyFields[number]>) => TResult
}

/**
 * Type definition for local secondary index configurations on an Entity.
 *
 * Local indexes share the table's hash key but use a different range key.
 * Each index requires a rangeKey definition specifying fields and calculation logic.
 *
 * @template TTable - The table configuration
 * @template TSchema - The entity's Zod schema
 * @template TLocalIndexRangeKeyFields - Map of index names to their range key field paths
 */
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

/**
 * Type definition for global secondary index configurations on an Entity.
 *
 * Global indexes have their own hash and optional range keys, independent
 * from the table's primary index. Each index requires field mappings and
 * calculation logic.
 *
 * @template TTable - The table configuration
 * @template TSchema - The entity's Zod schema
 */
export type EntityGlobalIndexesDefinition<TTable extends Table<any>, TSchema extends ZodSchema> = {
  [K in GlobalIndexName<TTable>]?: {
    hashKey: KeyPartDefinition<
      TSchema,
      readonly FieldPath<z.infer<TSchema>>[],
      EntityGlobalIndexHashKeyValue<TTable, Extract<K, GlobalIndexName<TTable>>>
    >
  } & (TTable['globalIndexes'] extends Record<string, any>
    ? TTable['globalIndexes'][Extract<K, GlobalIndexName<TTable>>]['rangeKey'] extends string
      ? {
          rangeKey: KeyPartDefinition<
            TSchema,
            readonly FieldPath<z.infer<TSchema>>[],
            EntityGlobalIndexRangeKeyValue<TTable, Extract<K, GlobalIndexName<TTable>>>
          >
        }
      : { rangeKey?: never }
    : { rangeKey?: never })
}

type EntityLocalIndexesOption<
  TTable extends Table<any>,
  TSchema extends ZodSchema,
  TLocalIndexRangeKeyFields extends Partial<
    Record<LocalIndexName<TTable>, readonly FieldPath<z.infer<TSchema>>[]>
  >
> =
  LocalIndexName<TTable> extends never
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
  TGlobalIndexes extends Partial<Record<GlobalIndexName<TTable>, any>>,
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
  globalIndexes?: TGlobalIndexes
  localIndexes?: EntityLocalIndexesDefinition<TTable, TSchema, TLocalIndexRangeKeyFields>
  entityType?: TEntityType
  ttl?: (domain: z.infer<TSchema>) => number | undefined
}
