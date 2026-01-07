import { Table } from './Table'
import { ResolveDynamoType } from './utils'

type KeyValue<TTable extends Table<any>, K extends string> = ResolveDynamoType<
  TTable['fields'][K & keyof TTable['fields']]
>

type HashKeyField<TTable extends Table<any>> = Extract<TTable['primaryIndex']['hashKey'], string>
type RangeKeyField<TTable extends Table<any>> = Extract<
  NonNullable<TTable['primaryIndex']['rangeKey']>,
  string
>

export type EntityHashKeyValue<TTable extends Table<any>> = KeyValue<TTable, HashKeyField<TTable>>
export type EntityRangeKeyValue<TTable extends Table<any>> = KeyValue<TTable, RangeKeyField<TTable>>

export type EntityHashKey<TTable extends Table<any>> = {
  [K in HashKeyField<TTable>]: EntityHashKeyValue<TTable>
}

export type EntityRangeKey<TTable extends Table<any>> =
  TTable['primaryIndex']['rangeKey'] extends string
    ? {
        [K in RangeKeyField<TTable>]: EntityRangeKeyValue<TTable>
      }
    : {}

export type EntityKey<TTable extends Table<any>> = EntityHashKey<TTable> & EntityRangeKey<TTable>
