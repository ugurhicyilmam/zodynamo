import { Entity } from '../../types/Entity'
import { GlobalIndexName, LocalIndexName } from '../../types/EntityKey'
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
  QueryRangeFromInput,
  QueryState,
  RangeOptions,
  ResolveQueryChain
} from './types'

/**
 * Entry point for building queries on an Entity.
 */
export class Query {
  /**
   * Selects the entity to query.
   *
   * @param entity - The entity definition to query against.
   * @returns A selector to choose between primary, GSI, or LSI queries.
   */
  entity<E extends Entity<any, any, any, any, any, any, any, any, any>>(
    entity: E
  ): QuerySelector<E> {
    return new QueryBuilder(entity) as any
  }
}

export type QuerySelector<E extends Entity<any, any, any, any, any, any, any, any, any>> = {
  primary(): QueryChain<E, { kind: 'primary' }>
} & (GlobalIndexName<E['table']> extends never
  ? unknown
  : {
      /**
       * Query a Global Secondary Index (GSI).
       *
       * @param indexName - The name of the GSI to query.
       */
      gsi<N extends GlobalIndexName<E['table']>>(indexName: N): QueryChain<E, { kind: 'gsi'; name: N }>
    }) &
  (LocalIndexName<E['table']> extends never
    ? unknown
    : {
        /**
         * Query a Local Secondary Index (LSI).
         *
         * @param indexName - The name of the LSI to query.
         */
        lsi<N extends LocalIndexName<E['table']>>(indexName: N): QueryChain<E, { kind: 'lsi'; name: N }>
      })

type QueryBuilderBase<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexSelector<E>,
  Output extends QueryOutputMode<E>,
  State extends QueryState
> = QueryHasSortKey<E, Index> extends true
  ? QueryBuilder<E, Index, Output, State>
  : Omit<QueryBuilder<E, Index, Output, State>, 'range' | 'rangeFrom' | 'rangeNoCondition'>

export type QueryChain<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexSelector<E>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = ResolveQueryChain<
  QueryBuilderBase<E, Index, Output, State>,
  State,
  Output,
  QueryHasSortKey<E, Index>
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
  primary(): QueryChain<E, { kind: 'primary' }, Output> {
    this._index = { kind: 'primary' }
    return this as any
  }

  /**
   * Query a Global Secondary Index (GSI).
   *
   * @param indexName - The name of the GSI to query.
   */
  gsi<N extends GlobalIndexName<E['table']>>(
    indexName: N
  ): QueryChain<E, { kind: 'gsi'; name: N }, Output> {
    this._index = { kind: 'gsi', name: indexName }
    return this as any
  }

  /**
   * Query a Local Secondary Index (LSI).
   *
   * @param indexName - The name of the LSI to query.
   */
  lsi<N extends LocalIndexName<E['table']>>(
    indexName: N
  ): QueryChain<E, { kind: 'lsi'; name: N }, Output> {
    this._index = { kind: 'lsi', name: indexName }
    return this as any
  }

  /* Partition Key Operations */

  partitionFrom(
    domain: E['key']['hashKey']['calculate'] extends (item: infer Input) => any ? Input : never
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'PARTITION_SET'> {
    return this as any
  }

  partitionValue(
    value: QueryKeyTypes<E, Extract<Index, QueryIndexSelector<E>>>['pk']
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'PARTITION_SET'> {
    return this as any
  }

  /* Sort Key Operations */

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

  rangeFrom(
    args: QueryRangeFromInput<E, Extract<Index, QueryIndexSelector<E>>>
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'SORT_SET'> {
    return this as any
  }

  rangeNoCondition(): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'SORT_SET'> {
    return this as any
  }

  /* Modifiers */

  options(
    options: Extract<Index, QueryIndexSelector<E>> extends { kind: 'gsi' }
      ? GsiQueryOptions<E>
      : QueryOptions<E>
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'OPTIONS_SET'> {
    return this as any
  }

  raw(): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, 'raw', 'OPTIONS_SET'> {
    return this as any
  }

  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, { select: readonly K[] }, 'OPTIONS_SET'> {
    return this as any
  }

  count(): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, 'count', 'OPTIONS_SET'> {
    return this as any
  }

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
          ? [K] extends [keyof InferEntity<E>]
            ? Pick<InferEntity<E>, K>[]
            : never
          : Output extends 'count'
            ? number
            : never
  > {
    return Promise.resolve([] as any) as any
  }
}

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
