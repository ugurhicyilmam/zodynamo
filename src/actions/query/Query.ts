import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { Simplify } from 'type-fest'

import { Entity } from '../../types/Entity'
import { GlobalIndexName, LocalIndexName } from '../../types/EntityKey'
import { FieldPath, PickByPaths } from '../../types/FieldPath'
import { InferDynamoItem } from '../../types/InferDynamoItem'
import { InferEntity } from '../../types/InferEntity'
import { Action } from '../Action'
import { buildConditionExpression } from '../utils/conditions'
import { buildProjectionExpression } from '../utils/projection'
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
export class Query extends Action {
  /**
   * Select an entity to query against.
   *
   * @param entity - The entity definition created with `defineEntity()`
   * @returns Index selector with `primary()`, `gsi()`, and `lsi()` methods
   *
   * @example
   * ```ts
   * new Query(dynamo).entity(UserEntity).primary()
   * new Query(dynamo).entity(UserEntity).gsi('ByEmail')
   * ```
   */
  entity<E extends Entity<any, any, any, any, any, any, any, any, any>>(
    entity: E
  ): QuerySelector<E> {
    return new QueryBuilder(this.dynamo, entity) as any
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

export interface QueryStateObject<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexOrNull<E>,
  Output extends QueryOutputMode<E>
> {
  index: Index
  output: Output
  partition?: {
    from?: any
    value?: any
  }
  range?: any
  options?: any
}

export class QueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Index extends QueryIndexOrNull<E> = null,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> {
  constructor(
    protected readonly dynamo: DynamoDBDocumentClient,
    protected readonly _entity: E,
    protected readonly _state: QueryStateObject<E, Index, Output> = {
      index: null as any,
      output: 'entity' as any
    } as any
  ) {}

  private next<NewIndex extends QueryIndexOrNull<E>, NewOutput extends QueryOutputMode<E>>(
    stateUpdate: Partial<QueryStateObject<E, NewIndex, NewOutput>>
  ): any {
    return new QueryBuilder(this.dynamo, this._entity, {
      ...this._state,
      ...stateUpdate
    } as any)
  }

  /**
   * Query the primary index.
   */
  primary(): PrimaryQuery<E, Output> {
    return this.next({ index: { kind: 'primary' } })
  }

  /**
   * Query a Global Secondary Index (GSI).
   *
   * @param indexName - The name of the GSI to query.
   */
  gsi<N extends GlobalIndexName<E['table']>>(indexName: N): GsiQuery<E, N, Output> {
    return this.next({ index: { kind: 'gsi', name: indexName } })
  }

  /**
   * Query a Local Secondary Index (LSI).
   *
   * @param indexName - The name of the LSI to query.
   */
  lsi<N extends LocalIndexName<E['table']>>(indexName: N): LsiQuery<E, N, Output> {
    return this.next({ index: { kind: 'lsi', name: indexName } })
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
    return this.next({ partition: { from: domain } })
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
    return this.next({ partition: { value } })
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
    return this.next({ range: options })
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
    return this.next({ range: { from: args } })
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
    return this.next({ range: { noCondition: true } })
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
        ? GsiQueryOptions<E, Extract<Index, QueryIndexSelector<E>>>
        : QueryOptions<E, Extract<Index, QueryIndexSelector<E>>>
    >
  ): QueryChain<E, Extract<Index, QueryIndexSelector<E>>, Output, 'OPTIONS_SET'> {
    return this.next({ options })
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
    return this.next({ output: 'raw' })
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
    return this.next({ output: { select: fields } })
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
    return this.next({ output: 'count' })
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
  async exec(
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
    const self = this as any
    const tableIndex = self.getTableIndex()
    const entityIndex = self.getEntityIndex()

    const ExpressionAttributeNames: Record<string, string> = {}
    const ExpressionAttributeValues: Record<string, any> = {}

    // 1. Partition Key
    const pkField = tableIndex.hashKey
    const pkValue = self._state.partition?.from
      ? entityIndex.hashKey.calculate(self._state.partition.from)
      : self._state.partition?.value

    ExpressionAttributeNames['#pk'] = pkField
    ExpressionAttributeValues[':pk'] = pkValue
    let keyCondition = '#pk = :pk'

    // 2. Sort Key
    if (self._state.range && !self._state.range.noCondition) {
      const skField = tableIndex.rangeKey
      if (skField) {
        let skCondition = self._state.range
        if (self._state.range.from) {
          const skValue = (entityIndex as any).rangeKey.calculate(self._state.range.from)
          skCondition = { eq: skValue }
        }

        ExpressionAttributeNames['#sk'] = skField
        const { expression, values } = self.buildRangeExpression(skCondition)
        keyCondition = `(${keyCondition}) AND (${expression})`
        Object.assign(ExpressionAttributeValues, values)
      }
    }

    const input: any = {
      TableName: self._state.options?.tableName || (self._entity.table as any).name,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    }

    if (self._state.index?.kind !== 'primary') {
      input.IndexName = (self._state.index as any).name
    }

    // 3. Filters
    if (self._state.options?.filter) {
      const {
        ConditionExpression,
        ExpressionAttributeNames: filterNames,
        ExpressionAttributeValues: filterValues
      } = buildConditionExpression(self._state.options.filter)

      input.FilterExpression = ConditionExpression
      Object.assign(input.ExpressionAttributeNames, filterNames)
      Object.assign(input.ExpressionAttributeValues, filterValues)
    }

    // 4. Projections
    if (
      self._state.output &&
      typeof self._state.output === 'object' &&
      'select' in self._state.output
    ) {
      const { ProjectionExpression, ExpressionAttributeNames: projNames } =
        buildProjectionExpression(self._state.output.select as string[])

      input.ProjectionExpression = ProjectionExpression
      Object.assign(input.ExpressionAttributeNames, projNames)
    }

    // 5. Options
    if (self._state.options?.limit) input.Limit = self._state.options.limit
    if (self._state.options?.order === 'desc') input.ScanIndexForward = false
    if (self._state.options?.startKey) input.ExclusiveStartKey = self._state.options.startKey
    if (self._state.options?.consistent) input.ConsistentRead = true
    if (self._state.output === 'count') input.Select = 'COUNT'

    const response = await self.dynamo.send(new QueryCommand(input))

    if (self._state.output === 'count') {
      return (response.Count ?? 0) as any
    }

    const items = response.Items || []
    if (self._state.output === 'raw') {
      return items as any
    }

    // Decode and validate
    const decoded = items.map((item: any) => {
      let data = item
      if (self._entity.transform) {
        data = self._entity.transform.decode(data)
      }

      if (
        self._state.output &&
        typeof self._state.output === 'object' &&
        'select' in self._state.output
      ) {
        // Partial validation
        return self._entity.schema.deepPartial().parse(data)
      }

      return self._entity.schema.parse(data)
    })

    return decoded as any
  }

  private getTableIndex(): any {
    const index = this._state.index
    if (!index || index.kind === 'primary') return this._entity.table.primaryIndex
    if (index.kind === 'gsi') return (this._entity.table.globalIndexes as any)[index.name]
    if (index.kind === 'lsi') return (this._entity.table.localIndexes as any)[index.name]
  }

  private getEntityIndex(): any {
    const index = this._state.index
    if (!index || index.kind === 'primary') return this._entity.key
    if (index.kind === 'gsi') return (this._entity.globalIndexes as any)[index.name]
    if (index.kind === 'lsi') return (this._entity.localIndexes as any)[index.name]
  }

  private buildRangeExpression(options: RangeOptions<any>): {
    expression: string
    values: Record<string, any>
  } {
    if ('eq' in options) return { expression: '#sk = :sk', values: { ':sk': options.eq } }
    if ('gt' in options) return { expression: '#sk > :sk', values: { ':sk': options.gt } }
    if ('gte' in options) return { expression: '#sk >= :sk', values: { ':sk': options.gte } }
    if ('lt' in options) return { expression: '#sk < :sk', values: { ':sk': options.lt } }
    if ('lte' in options) return { expression: '#sk <= :sk', values: { ':sk': options.lte } }
    if ('between' in options) {
      const between = (options as any).between as [any, any]
      return {
        expression: '#sk BETWEEN :sk_low AND :sk_high',
        values: { ':sk_low': between[0], ':sk_high': between[1] }
      }
    }
    if ('beginsWith' in options) {
      return { expression: 'begins_with(#sk, :sk)', values: { ':sk': options.beginsWith } }
    }
    throw new Error('Invalid range options')
  }
}
