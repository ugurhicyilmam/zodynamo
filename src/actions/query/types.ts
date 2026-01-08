import { Entity } from '../../types/Entity'
import { GlobalIndexName, LocalIndexName } from '../../types/EntityKey'
import { InferEntity } from '../../types/InferEntity'

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

export type RangeOptions<SortKeyType> =
  | { eq: SortKeyType }
  | { gt: SortKeyType }
  | { gte: SortKeyType }
  | { lt: SortKeyType }
  | { lte: SortKeyType }
  | { between: [SortKeyType, SortKeyType] }
  | (SortKeyType extends string ? { beginsWith: string } : never)

export type QueryOptions<E extends Entity<any, any, any, any, any, any, any, any, any>> = {
  consistent?: boolean
  tableName?: string
  limit?: number
  order?: 'asc' | 'desc' // default asc
  // filter?: Condition // TODO: Implement Condition
  startKey?: Record<string, any>
}

export type GsiQueryOptions<E extends Entity<any, any, any, any, any, any, any, any, any>> = Omit<
  QueryOptions<E>,
  'consistent'
>

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

export type QueryRangeFromInput<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Selected extends QueryIndexSelector<E>
> = Selected extends { kind: 'primary' }
  ? E['key']['rangeKey'] extends { calculate: (item: infer Input) => any }
    ? Input
    : never
  : Selected extends { kind: 'gsi'; name: infer N }
    ? N extends keyof NonNullable<E['globalIndexes']>
      ? NonNullable<E['globalIndexes']>[N]['rangeKey'] extends {
          calculate: (item: infer Input) => any
        }
        ? Input
        : never
      : never
    : Selected extends { kind: 'lsi'; name: infer N }
      ? N extends keyof NonNullable<E['localIndexes']>
        ? NonNullable<E['localIndexes']>[N]['rangeKey'] extends {
            calculate: (item: infer Input) => any
          }
          ? Input
          : never
        : never
      : never
