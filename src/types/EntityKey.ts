import { Table } from './Table'

type KeyValue<TTable extends Table<any>, K extends string> = TTable['fields'][K & keyof TTable['fields']] extends 'number'
  ? number
  : string

type HashKeyField<TTable extends Table<any>> = Extract<TTable['primaryIndex']['hashKey'], string>
type RangeKeyField<TTable extends Table<any>> = Extract<NonNullable<TTable['primaryIndex']['rangeKey']>, string>

export type EntityHashKeyValue<TTable extends Table<any>> = KeyValue<TTable, HashKeyField<TTable>>
export type EntityRangeKeyValue<TTable extends Table<any>> = KeyValue<TTable, RangeKeyField<TTable>>

export type EntityHashKey<TTable extends Table<any>> = {
  [K in HashKeyField<TTable>]: EntityHashKeyValue<TTable>
}

export type EntityRangeKey<TTable extends Table<any>> = TTable['primaryIndex']['rangeKey'] extends string
  ? {
      [K in RangeKeyField<TTable>]: EntityRangeKeyValue<TTable>
    }
  : {}

export type EntityKey<TTable extends Table<any>> = EntityHashKey<TTable> & EntityRangeKey<TTable>
