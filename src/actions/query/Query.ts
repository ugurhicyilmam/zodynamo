import type { Simplify } from 'type-fest'

import { Entity } from '../../types/Entity'
import { GlobalIndexName, LocalIndexName } from '../../types/EntityKey'
import { FieldPath, PickByPaths } from '../../types/FieldPath'
import { InferDynamoItem } from '../../types/InferDynamoItem'
import { InferEntity } from '../../types/InferEntity'
import {
  GsiQueryOptions,
  QueryHasSortKey,
  QueryIndexOrNull,
  QueryIndexSelector,
  QueryKeyTypes,
  QueryOptions,
  QueryOutputMode,
  QueryPartitionFromInput,
  QueryRangeFromInput,
  QueryState,
  RangeOptions,
  ResolveQueryChain
} from './types'

export type PrimaryQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = QueryChain<E, { kind: 'primary' }, Output, State>

export type GsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = QueryChain<E, { kind: 'gsi'; name: IndexName }, Output, State>

export type LsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends LocalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = QueryChain<E, { kind: 'lsi'; name: IndexName }, Output, State>

/**
 * Entry point for building type-safe DynamoDB queries.
 *
 * @example
 * ```ts
 * const query = new Query()
 *
 * // Query primary index
 * const users = await query
 *   .entity(UserEntity)
 *   .primary()
 *   .partitionValue('USER#123')
 *   .exec()
 *
 * // Query GSI
 * const byStatus = await query
 *   .entity(UserEntity)
 *   .gsi('StatusIndex')
 *   .partitionValue('ACTIVE')
 *   .exec()
 * ```
 */
export class Query {
  /**
   * Select an entity to query against.
   *
   * @param entity - The entity definition created with `defineEntity()`
   * @returns Index selector with `primary()`, `gsi()`, and `lsi()` methods
   *
   * @example
   * ```ts
   * new Query().entity(UserEntity).primary()
   * new Query().entity(UserEntity).gsi('ByEmail')
   * ```
   */
  entity<E extends Entity<any, any, any, any, any, any, any, any, any>>(
    entity: E
  ): QuerySelector<E> {
    return new QueryBuilder(entity) as any
  }
}

export type QuerySelector<E extends Entity<any, any, any, any, any, any, any, any, any>> = Simplify<
  {
    /**
     * Query using the table's primary index.
     *
     * @example
     * ```ts
     * query.entity(User).primary().partitionValue('USER#123')
     * ```
     */
    primary(): PrimaryQuery<E>
  } & (GlobalIndexName<E['table']> extends never
    ? unknown
    : {
        /**
         * Query a Global Secondary Index (GSI).
         *
         * @param indexName - The name of the GSI to query
         *
         * @example
         * ```ts
         * query.entity(User).gsi('ByStatus').partitionValue('ACTIVE')
         * ```
         */
        gsi<N extends GlobalIndexName<E['table']>>(indexName: N): GsiQuery<E, N>
      }) &
    (LocalIndexName<E['table']> extends never
      ? unknown
      : {
          /**
           * Query a Local Secondary Index (LSI).
           *
           * @param indexName - The name of the LSI to query
           *
           * @example
           * ```ts
           * query.entity(User).lsi('ByCreatedAt').partitionValue('USER#123')
           * ```
           */
          lsi<N extends LocalIndexName<E['table']>>(indexName: N): LsiQuery<E, N>
        })
>

type QueryBuilderBase<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexSelector<E>,
  Output extends QueryOutputMode<E>,
  State extends QueryState
> =
  QueryHasSortKey<E, Index> extends true
    ? QueryBuilder<E, Index, Output, State>
    : Omit<QueryBuilder<E, Index, Output, State>, 'range' | 'rangeFrom' | 'rangeNoCondition'>

export type QueryChain<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexSelector<E>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = Simplify<
  ResolveQueryChain<
    QueryBuilderBase<E, Index, Output, State>,
    State,
    Output,
    QueryHasSortKey<E, Index>
  >
>

export class QueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexOrNull<E> = null,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> {
  protected _index?: QueryIndexSelector<E>
  protected _entity: E
  protected _output: Output
  protected _state!: State

  constructor(entity: E) {
    this._entity = entity
    this._output = 'entity' as Output
  }

  /**
   * Query the primary index.
   */
  primary(): PrimaryQuery<E, Output> {
    this._index = { kind: 'primary' }
    return this as any
  }

  /**
   * Query a Global Secondary Index (GSI).
   *
   * @param indexName - The name of the GSI to query.
   */
  gsi<N extends GlobalIndexName<E['table']>>(indexName: N): GsiQuery<E, N, Output> {
    this._index = { kind: 'gsi', name: indexName }
    return this as any
  }

  /**
   * Query a Local Secondary Index (LSI).
   *
   * @param indexName - The name of the LSI to query.
   */
  lsi<N extends LocalIndexName<E['table']>>(indexName: N): LsiQuery<E, N, Output> {
    this._index = { kind: 'lsi', name: indexName }
    return this as any
  }

  /* Partition Key Operations */

  /**
   * Set the partition key using entity fields.
   * The key value is computed from the provided field values.
   *
   * @param domain - Object with fields required to compute the partition key
   *
   * @example
   * ```ts
   * query.entity(User).primary().partitionFrom({ userId: '123' })
   * ```
   */
  partitionFrom(
    domain: QueryPartitionFromInput<E, Extract<Index, QueryIndexSelector<E>>>
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'PARTITION_SET'> {
    return this as any
  }

  /**
   * Set the partition key directly with a raw value.
   *
   * @param value - The exact partition key value
   *
   * @example
   * ```ts
   * query.entity(User).primary().partitionValue('USER#123')
   * ```
   */
  partitionValue(
    value: QueryKeyTypes<E, Extract<Index, QueryIndexSelector<E>>>['pk']
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'PARTITION_SET'> {
    return this as any
  }

  /* Sort Key Operations */

  /**
   * Apply a condition on the sort key.
   *
   * @param options - Range condition (eq, gt, gte, lt, lte, between, beginsWith)
   *
   * @example
   * ```ts
   * query.primary().partitionValue('USER#1').range({ beginsWith: 'EMAIL#' })
   * query.primary().partitionValue('USER#1').range({ between: [100, 200] })
   * ```
   */
  range(
    options: RangeOptions<
      QueryKeyTypes<E, Extract<Index, QueryIndexSelector<E>>>['sk'] extends
        | string
        | number
        | boolean
        ? QueryKeyTypes<E, Extract<Index, QueryIndexSelector<E>>>['sk']
        : never
    >
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'SORT_SET'> {
    return this as any
  }

  /**
   * Set the sort key condition using entity fields.
   *
   * @param args - Object with fields required to compute the sort key
   *
   * @example
   * ```ts
   * query.primary().partitionValue('USER#1').rangeFrom({ email: 'user@example.com' })
   * ```
   */
  rangeFrom(
    args: QueryRangeFromInput<E, Extract<Index, QueryIndexSelector<E>>>
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'SORT_SET'> {
    return this as any
  }

  /**
   * Skip the sort key condition and query all items with the partition key.
   *
   * @example
   * ```ts
   * query.primary().partitionValue('USER#1').rangeNoCondition().exec()
   * ```
   */
  rangeNoCondition(): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'SORT_SET'> {
    return this as any
  }

  /* Modifiers */

  /**
   * Configure query options like filtering, pagination, and ordering.
   *
   * @param options - Query configuration options
   *
   * @example
   * ```ts
   * query.partitionValue('USER#1').rangeNoCondition().options({
   *   limit: 10,
   *   order: 'desc',
   *   filter: { attr: 'status', eq: 'ACTIVE' }
   * })
   * ```
   */
  options(
    options: Simplify<
      Extract<Index, QueryIndexSelector<E>> extends { kind: 'gsi' }
        ? GsiQueryOptions<E>
        : QueryOptions<E>
    >
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'OPTIONS_SET'> {
    return this as any
  }

  /**
   * Return raw DynamoDB items instead of decoded entities.
   *
   * @example
   * ```ts
   * const items = await query.partitionValue('USER#1').rangeNoCondition().raw().exec()
   * ```
   */
  raw(): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, 'raw', 'OPTIONS_SET'> {
    return this as any
  }

  /**
   * Project specific fields from the result.
   *
   * @param fields - Array of field paths to include
   *
   * @example
   * ```ts
   * const partial = await query.partitionValue('USER#1').select(['email', 'name']).exec()
   * ```
   */
  select<K extends FieldPath<InferEntity<E>>>(
    fields: readonly K[]
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, { select: readonly K[] }, 'OPTIONS_SET'> {
    return this as any
  }

  /**
   * Return a count of matching items instead of the items themselves.
   *
   * @example
   * ```ts
   * const count = await query.partitionValue('USER#1').rangeNoCondition().count().exec()
   * ```
   */
  count(): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, 'count', 'OPTIONS_SET'> {
    return this as any
  }

  /**
   * Execute the query and return results.
   *
   * @returns Promise resolving to query results (entities, raw items, count, or projection)
   *
   * @example
   * ```ts
   * const users = await query.entity(User).primary().partitionValue('USER#1').exec()
   * ```
   */
  exec(
    this:
      | QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'PARTITION_SET'>
      | QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'SORT_SET'>
      | QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'OPTIONS_SET'>
  ): Promise<
    Output extends 'entity'
      ? InferEntity<E>[]
      : Output extends 'raw'
        ? InferDynamoItem<E>[]
        : Output extends { select: readonly (infer K)[] }
          ? [K] extends [FieldPath<InferEntity<E>>]
            ? PickByPaths<InferEntity<E>, Extract<K, string>>[]
            : never
          : Output extends 'count'
            ? number
            : never
  > {
    return Promise.resolve([] as any) as any
  }
}
