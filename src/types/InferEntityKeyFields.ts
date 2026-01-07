import { Entity } from './Entity'
import { PickByPaths } from './FieldPath'
import { InferEntity } from './InferEntity'
import { Prettify } from './utils'

type PickByPathsOrEmpty<T, P> = [P] extends [never] ? {} : PickByPaths<T, Extract<P, string>>
type LocalIndexesOf<T extends Entity<any, any, any, any, any, any, any, any>> = Extract<
  T['localIndexes'],
  Record<string, any>
>
type GlobalIndexesOf<T extends Entity<any, any, any, any, any, any, any, any>> = Extract<
  T['globalIndexes'],
  Record<string, any>
>

export type InferHashKeyFields<T extends Entity<any, any, any, any, any, any, any, any>> = Prettify<
  PickByPathsOrEmpty<InferEntity<T>, T['key']['hashKey']['fields'][number]>
>

export type InferRangeKeyFields<T extends Entity<any, any, any, any, any, any, any, any>> =
  Prettify<
    T['key'] extends { rangeKey: { fields: readonly unknown[] } }
      ? PickByPathsOrEmpty<InferEntity<T>, T['key']['rangeKey']['fields'][number]>
      : {}
  >

export type InferKeyFields<T extends Entity<any, any, any, any, any, any, any, any>> = Prettify<
  InferHashKeyFields<T> & InferRangeKeyFields<T>
>

export type InferLocalIndexNames<T extends Entity<any, any, any, any, any, any, any, any>> =
  T extends Entity<any, any, any, any, any, any, infer TLocalIndexRangeKeyFields, any>
    ? keyof TLocalIndexRangeKeyFields extends never
      ? never
      : Extract<keyof TLocalIndexRangeKeyFields, string>
    : never

export type InferLocalIndexFields<T extends Entity<any, any, any, any, any, any, any, any>> =
  InferLocalIndexNames<T> extends never
    ? {}
    : LocalIndexesOf<T> extends Record<string, { rangeKey: { fields: readonly unknown[] } }>
      ? {
          [K in keyof LocalIndexesOf<T>]: Prettify<
            PickByPathsOrEmpty<InferEntity<T>, LocalIndexesOf<T>[K]['rangeKey']['fields'][number]>
          >
        }
      : {}

export type InferLocalIndexRangeKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any>,
  TIndexName extends InferLocalIndexNames<T>
> =
  LocalIndexesOf<T> extends Record<string, { rangeKey: { fields: readonly unknown[] } }>
    ? Prettify<
        PickByPathsOrEmpty<
          InferEntity<T>,
          LocalIndexesOf<T>[TIndexName]['rangeKey']['fields'][number]
        >
      >
    : {}

export type InferGlobalIndexNames<T extends Entity<any, any, any, any, any, any, any, any>> =
  T['globalIndexes'] extends Record<string, any> ? Extract<keyof T['globalIndexes'], string> : never

export type InferGlobalIndexHashKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any>,
  TIndexName extends InferGlobalIndexNames<T>
> =
  GlobalIndexesOf<T> extends Record<string, { hashKey: { fields: readonly unknown[] } }>
    ? Prettify<
        PickByPathsOrEmpty<
          InferEntity<T>,
          GlobalIndexesOf<T>[TIndexName]['hashKey']['fields'][number]
        >
      >
    : {}

export type InferGlobalIndexRangeKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any>,
  TIndexName extends InferGlobalIndexNames<T>
> =
  GlobalIndexesOf<T> extends Record<string, any>
    ? GlobalIndexesOf<T>[TIndexName] extends { rangeKey: { fields: readonly unknown[] } }
      ? Prettify<
          PickByPathsOrEmpty<
            InferEntity<T>,
            GlobalIndexesOf<T>[TIndexName]['rangeKey']['fields'][number]
          >
        >
      : {}
    : {}

export type InferGlobalIndexKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any>,
  TIndexName extends InferGlobalIndexNames<T>
> = Prettify<
  InferGlobalIndexHashKeyFields<T, TIndexName> & InferGlobalIndexRangeKeyFields<T, TIndexName>
>
