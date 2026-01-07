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

export type GlobalIndexName<TTable extends Table<any>> =
  TTable['globalIndexes'] extends Record<string, any>
    ? Extract<keyof TTable['globalIndexes'], string>
    : never

export type LocalIndexName<TTable extends Table<any>> =
  TTable['localIndexes'] extends Record<string, any>
    ? Extract<keyof TTable['localIndexes'], string>
    : never

type GlobalIndexHashKeyField<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> = TTable['globalIndexes'] extends Record<string, any>
  ? Extract<TTable['globalIndexes'][TIndexName]['hashKey'], string>
  : never

type GlobalIndexRangeKeyField<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> = TTable['globalIndexes'] extends Record<string, any>
  ? Extract<NonNullable<TTable['globalIndexes'][TIndexName]['rangeKey']>, string>
  : never

type LocalIndexRangeKeyField<
  TTable extends Table<any>,
  TIndexName extends LocalIndexName<TTable>
> = TTable['localIndexes'] extends Record<string, any>
  ? Extract<TTable['localIndexes'][TIndexName]['rangeKey'], string>
  : never

export type EntityHashKeyValue<TTable extends Table<any>> = KeyValue<TTable, HashKeyField<TTable>>
export type EntityRangeKeyValue<TTable extends Table<any>> = KeyValue<TTable, RangeKeyField<TTable>>
export type EntityGlobalIndexHashKeyValue<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> = KeyValue<TTable, GlobalIndexHashKeyField<TTable, TIndexName>>
export type EntityGlobalIndexRangeKeyValue<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> = KeyValue<TTable, GlobalIndexRangeKeyField<TTable, TIndexName>>
export type EntityLocalIndexRangeKeyValue<
  TTable extends Table<any>,
  TIndexName extends LocalIndexName<TTable>
> = KeyValue<TTable, LocalIndexRangeKeyField<TTable, TIndexName>>

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
