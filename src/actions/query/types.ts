import { Entity } from '../../types/Entity'
import { GlobalIndexName, LocalIndexName } from '../../types/EntityKey'
import { FieldPath, PickByPaths, ValueAt } from '../../types/FieldPath'
import { InferEntity } from '../../types/InferEntity'
import { OneOf, ResolveDynamoType } from '../../types/utils'

/**
 * Identify which index is being queried.
 */
export type QueryIndexSelector<E extends Entity<any, any, any, any, any, any, any, any, any>> =
  | { kind: 'primary' }
  | { kind: 'gsi'; name: GlobalIndexName<E['table']> }
  | { kind: 'lsi'; name: LocalIndexName<E['table']> }

export type QuerySelectedIndex<E extends Entity<any, any, any, any, any, any, any, any, any>> =
  QueryIndexSelector<E>

export type QueryIndexOrNull<E extends Entity<any, any, any, any, any, any, any, any, any>> =
  QuerySelectedIndex<E> | null

export type QueryState = 'INITIAL' | 'PARTITION_SET' | 'SORT_SET' | 'OPTIONS_SET'

/**
 * Defines the output shape of the query.
 * - 'entity': returns InferEntity<E>[]
 * - 'raw': returns internal item (DynamoDB format)
 * - { select: keys }: returns Pick<InferEntity<E>, keys>[]
 * - 'count': returns number
 */
export type QueryOutputMode<E extends Entity<any, any, any, any, any, any, any, any, any>> =
  | 'entity'
  | 'raw'
  | { select: readonly (keyof InferEntity<E>)[] }
  | 'count'

export type RangeOperator<T> = OneOf<{
  eq: T
  gt: T
  gte: T
  lt: T
  lte: T
  between: [T, T]
  beginsWith: T extends string ? string : never
}>

export type RangeOptions<SortKeyType> = RangeOperator<SortKeyType>

export type ScalarValue = boolean | number | string | Uint8Array
export type SortableValue = string | number | Uint8Array
export type AttributeType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'binary'
  | 'list'
  | 'map'
  | 'null'
  | 'number_set'
  | 'string_set'
  | 'binary_set'

export type InferQueryStartKey<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Selected extends QueryIndexSelector<E>
> = {
  // Always include the table's primary key
  [K in E['table']['primaryIndex']['hashKey']]: ResolveDynamoType<E['table']['fields'][K]>
} & (E['table']['primaryIndex']['rangeKey'] extends string
  ? {
      [K in E['table']['primaryIndex']['rangeKey']]: ResolveDynamoType<E['table']['fields'][K]>
    }
  : {}) &
  (Selected extends { kind: 'gsi'; name: infer N }
    ? N extends keyof NonNullable<E['table']['globalIndexes']>
      ? {
          [K in NonNullable<E['table']['globalIndexes']>[N]['hashKey']]: ResolveDynamoType<
            E['table']['fields'][K]
          >
        } & (NonNullable<E['table']['globalIndexes']>[N]['rangeKey'] extends string
          ? {
              [K in NonNullable<E['table']['globalIndexes']>[N]['rangeKey']]: ResolveDynamoType<
                E['table']['fields'][K]
              >
            }
          : {})
      : {}
    : Selected extends { kind: 'lsi'; name: infer N }
      ? N extends keyof NonNullable<E['table']['localIndexes']>
        ? {
            [K in NonNullable<E['table']['localIndexes']>[N]['rangeKey']]: ResolveDynamoType<
              E['table']['fields'][K]
            >
          }
        : {}
      : {})

export type FilterOperations<V> = OneOf<
  {
    eq: V
    ne: V
    in: V[]
    exists: boolean
    type: AttributeType
  } & (Exclude<V, undefined> extends string | number | Uint8Array
    ? {
        lt: V
        lte: V
        gt: V
        gte: V
        between: [V, V]
      }
    : {}) &
    (Exclude<V, undefined> extends string | Uint8Array | Set<any>
      ? {
          contains: V extends Set<infer U> ? U : V
        }
      : {}) &
    (Exclude<V, undefined> extends string | Uint8Array
      ? {
          beginsWith: V
        }
      : {})
>

// Condition type distributed over keys of T
export type Condition<T> =
  | (FieldPath<T> extends infer P extends string
      ? P extends any
        ? { attr: P } & FilterOperations<ValueAt<T, P>>
        : never
      : never)
  | ({ rawAttr: string } & OneOf<{
      eq: ScalarValue
      ne: ScalarValue
      in: ScalarValue[]
      contains: ScalarValue
      exists: boolean
      type: AttributeType
      gt: SortableValue
      gte: SortableValue
      lt: SortableValue
      lte: SortableValue
      between: [SortableValue, SortableValue]
      beginsWith: SortableValue
    }>)
  | { or: Condition<T>[] }
  | { and: Condition<T>[] }
  | { not: Condition<T> }

export type QueryOptions<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexSelector<E> = { kind: 'primary' }
> = {
  consistent?: boolean
  tableName?: string
  limit?: number
  order?: 'asc' | 'desc' // default asc
  filter?: Condition<InferEntity<E>>
  startKey?: InferQueryStartKey<E, Index>
}

export type GsiQueryOptions<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexSelector<E>
> = Omit<QueryOptions<E, Index>, 'consistent'>

export type SortKeyOperations = 'range' | 'rangeFrom' | 'rangeNoCondition'

export type PartitionKeyOperations = 'partitionFrom' | 'partitionValue'

export type QueryModifierOperations = 'options'
export type QueryOutputOperations = 'raw' | 'select' | 'count'
export type QueryExecOperations = 'exec'

export type QueryOptionsOperations = QueryModifierOperations | QueryOutputOperations

type AllowedQueryOperations<
  State extends QueryState,
  HasSortKey extends boolean
> = State extends 'INITIAL'
  ? PartitionKeyOperations
  : State extends 'PARTITION_SET'
    ? HasSortKey extends true
      ? SortKeyOperations
      : SortKeyOperations | QueryOptionsOperations | QueryExecOperations
    : State extends 'SORT_SET'
      ? QueryOptionsOperations | QueryExecOperations
      : State extends 'OPTIONS_SET'
        ? QueryOutputOperations | QueryExecOperations
        : never

export type ResolveQueryChain<
  Base,
  State extends QueryState,
  Output extends QueryOutputMode<any>,
  HasSortKey extends boolean = false
> = Omit<
  Pick<Base, keyof Base & AllowedQueryOperations<State, HasSortKey>>,
  Output extends 'entity' ? never : QueryOutputOperations
>

export type QueryHasSortKey<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Selected extends QueryIndexSelector<E>
> = Selected extends { kind: 'primary' }
  ? E['table']['primaryIndex']['rangeKey'] extends string
    ? true
    : false
  : Selected extends { kind: 'gsi'; name: infer N }
    ? N extends keyof NonNullable<E['globalIndexes']>
      ? NonNullable<E['globalIndexes']>[N]['rangeKey'] extends { calculate: any }
        ? true
        : false
      : false
    : Selected extends { kind: 'lsi'; name: infer N }
      ? N extends keyof NonNullable<E['localIndexes']>
        ? NonNullable<E['localIndexes']>[N]['rangeKey'] extends { calculate: any }
          ? true
          : false
        : false
      : false

/**
 * Helper to resolve the partition and sort key types for a given entity and index.
 * This will be used by the builder to strictly type `.partitionValue(val)` and sort ops.
 */
export type QueryKeyTypes<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Selected extends QueryIndexSelector<E>
> = Selected extends { kind: 'primary' }
  ? {
      pk: E['key']['hashKey']['calculate'] extends (item: any) => infer R ? R : never
      sk: E['key']['rangeKey'] extends { calculate: (item: any) => infer R } ? R : never
    }
  : Selected extends { kind: 'gsi'; name: infer N }
    ? N extends keyof NonNullable<E['globalIndexes']>
      ? {
          pk: NonNullable<E['globalIndexes']>[N]['hashKey']['calculate'] extends (
            item: any
          ) => infer R
            ? R
            : never
          sk: NonNullable<E['globalIndexes']>[N]['rangeKey'] extends {
            calculate: (item: any) => infer R
          }
            ? R
            : never
        }
      : never
    : Selected extends { kind: 'lsi'; name: infer N }
      ? N extends keyof NonNullable<E['localIndexes']>
        ? {
            // LSI shares the table's hash key
            pk: E['key']['hashKey']['calculate'] extends (item: any) => infer R ? R : never
            sk: NonNullable<E['localIndexes']>[N]['rangeKey']['calculate'] extends (
              item: any
            ) => infer R
              ? R
              : never
          }
        : never
      : never

export type QueryPartitionFromInput<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Selected extends QueryIndexSelector<E>
> = Selected extends { kind: 'primary' }
  ? PickByPaths<InferEntity<E>, E['key']['hashKey']['fields'][number]>
  : Selected extends { kind: 'gsi'; name: infer N }
    ? N extends keyof NonNullable<E['globalIndexes']>
      ? PickByPaths<InferEntity<E>, NonNullable<E['globalIndexes']>[N]['hashKey']['fields'][number]>
      : never
    : Selected extends { kind: 'lsi' } // LSI shares the primary PK
      ? PickByPaths<InferEntity<E>, E['key']['hashKey']['fields'][number]>
      : never

export type QueryRangeFromInput<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Selected extends QueryIndexSelector<E>
> = Selected extends { kind: 'primary' }
  ? E['key']['rangeKey'] extends { fields: readonly string[] }
    ? PickByPaths<InferEntity<E>, E['key']['rangeKey']['fields'][number]>
    : never
  : Selected extends { kind: 'gsi'; name: infer N }
    ? N extends keyof NonNullable<E['globalIndexes']>
      ? NonNullable<E['globalIndexes']>[N]['rangeKey'] extends { fields: readonly string[] }
        ? PickByPaths<
            InferEntity<E>,
            NonNullable<E['globalIndexes']>[N]['rangeKey']['fields'][number]
          >
        : never
      : never
    : Selected extends { kind: 'lsi'; name: infer N }
      ? N extends keyof NonNullable<E['localIndexes']>
        ? NonNullable<E['localIndexes']>[N]['rangeKey'] extends { fields: readonly string[] }
          ? PickByPaths<
              InferEntity<E>,
              NonNullable<E['localIndexes']>[N]['rangeKey']['fields'][number]
            >
          : never
        : never
      : never
