import { ZodSchema, z } from 'zod'

import { Table } from './Table'

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
  TKeyFields extends readonly (keyof z.infer<TSchema>)[],
  TEntityType extends string | undefined
> {
  name: TName
  table: TTable
  schema: TSchema
  key: {
    fields: TKeyFields
    calculate: (item: Pick<z.infer<TSchema>, TKeyFields[number]>) => any
  }
  entityType?: TEntityType
}
