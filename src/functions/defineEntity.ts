import { ZodSchema, z } from 'zod'

import { Entity } from '../types/Entity'
import { EntityHashKeyValue, EntityRangeKeyValue } from '../types/EntityKey'
import { Table } from '../types/Table'

export type { EntityKey } from '../types/EntityKey'

type KeyPartDefinition<
  TSchema extends ZodSchema,
  TKeyFields extends readonly (keyof z.infer<TSchema>)[],
  TResult
> = {
  fields: TKeyFields
  calculate: (item: Pick<z.infer<TSchema>, TKeyFields[number]>) => TResult
}

type EntityTypeOption<TTable extends Table<any>, TEntityType extends string | undefined> =
  TTable extends { entityTypeField: string } ? Exclude<TEntityType, undefined> : never

type EntityKeyDefinition<
  TTable extends Table<any>,
  TSchema extends ZodSchema,
  THashKeyFields extends readonly (keyof z.infer<TSchema>)[],
  TRangeKeyFields extends readonly (keyof z.infer<TSchema>)[]
> = {
  hashKey: KeyPartDefinition<TSchema, THashKeyFields, EntityHashKeyValue<TTable>>
} & (TTable['primaryIndex']['rangeKey'] extends string
  ? { rangeKey: KeyPartDefinition<TSchema, TRangeKeyFields, EntityRangeKeyValue<TTable>> }
  : { rangeKey?: never })

export function defineEntity<
  TTable extends Table<any>,
  TName extends string,
  TSchema extends ZodSchema,
  const THashKeyFields extends readonly (keyof z.infer<TSchema>)[],
  const TRangeKeyFields extends readonly (keyof z.infer<TSchema>)[] = [],
  const TEntityType extends string | undefined = undefined
>(
  table: TTable,
  options: {
    name: TName
    schema: TSchema
    key: EntityKeyDefinition<TTable, TSchema, THashKeyFields, TRangeKeyFields>
    entityType?: EntityTypeOption<TTable, TEntityType>
  }
): Entity<TTable, TName, TSchema, THashKeyFields, TRangeKeyFields, TEntityType> {
  return {
    table,
    name: options.name,
    schema: options.schema,
    key: options.key,
    entityType: options.entityType
  }
}
