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

export type SortKeyOperations =
  | 'sortEquals'
  | 'sortBeginsWith'
  | 'sortBetween'
  | 'sortGreaterThan'
  | 'sortGreaterThanOrEqualTo'
  | 'sortLessThan'
  | 'sortLessThanOrEqualTo'

export type PartitionKeyOperations = 'partitionFrom' | 'partitionValue'

export type QueryOptionsOperations =
  | 'limit'
  | 'consistentRead'
  | 'startKey'
  | 'raw'
  | 'select'
  | 'count'

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
