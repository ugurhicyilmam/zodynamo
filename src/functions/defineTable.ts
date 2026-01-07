import { Table } from '~/types/Table'

export function defineTable<
  const TOptions extends {
    fields: Record<string, 'string' | 'number' | 'binary'>
  }
>(options: TOptions & Table<TOptions['fields']>) {
  return {
    ...options,
    name: options.name,
    entityTypeField: options.entityTypeField ?? 'entityType'
  } as const
}
