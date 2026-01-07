import { Entity } from '../../types/Entity'
import { GlobalIndexName } from '../../types/EntityKey'
import { InferDynamoItem } from '../../types/InferDynamoItem'
import { InferEntity } from '../../types/InferEntity'
import { QueryKeyTypes, QueryOutputMode, QueryState, SortKeyOperations } from './types'

export type GsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = NonNullable<E['globalIndexes']>[IndexName]['rangeKey'] extends { calculate: any }
  ? GsiQueryBuilder<E, IndexName, Output, State>
  : Omit<GsiQueryBuilder<E, IndexName, Output, State>, SortKeyOperations>

/**
 * Builds a query for a Global Secondary Index (GSI) of a table.
 *
 * @template E - The Entity being queried.
 * @template IndexName - The name of the GSI.
 * @template Output - The configured output format.
 * @template State - The current state of the builder (enforces partition key requirement).
 */
export class GsiQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> {
  protected _entity: E
  protected _indexName: IndexName
  protected _output: Output
  protected _state!: State

  constructor(entity: E, indexName: IndexName) {
    this._entity = entity
    this._indexName = indexName
    this._output = 'entity' as any
  }

  /* Partition Key - Must be provided explicitly for GSI */
  /* Partition Key - Must be provided explicitly for GSI */

  /**
   * Sets the partition key value for the GSI.
   *
   * @param value - The exact value of the GSI's partition key.
   */
  partitionValue(
    value: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['pk']
  ): GsiQuery<E, IndexName, Output, 'PARTITION_SET'> {
    return this as any
  }

  /* Sort Key Operations - Only available if the GSI has a sort key */

  /**
   * Applies an equality condition to the GSI's sort key.
   * Only available if the GSI has a sort key.
   *
   * @param val - The value to match.
   */
  sortEquals(
    val: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk']
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any } ? this : never {
    return this as any
  }

  /**
   * Applies a "begins with" condition to the GSI's sort key.
   * Only available if the GSI has a string sort key.
   *
   * @param val - The prefix to check.
   */
  sortBeginsWith(
    val: NonNullable<E['globalIndexes']>[IndexName]['rangeKey'] extends { calculate: any }
      ? string
      : never
  ): NonNullable<E['globalIndexes']>[IndexName]['rangeKey'] extends { calculate: any }
    ? this
    : never {
    return this as any
  }

  /**
   * Applies a "between" condition to the GSI's sort key.
   * Only available if the GSI has a sort key.
   *
   * @param min - The minimum value (inclusive).
   * @param max - The maximum value (inclusive).
   */
  sortBetween(
    min: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk'],
    max: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk']
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any } ? this : never {
    return this as any
  }

  /**
   * Applies a "greater than" condition to the GSI's sort key.
   * Only available if the GSI has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortGreaterThan(
    val: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk']
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any } ? this : never {
    return this as any
  }

  /**
   * Applies a "greater than or equal to" condition to the GSI's sort key.
   * Only available if the GSI has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortGreaterThanOrEqualTo(
    val: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk']
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any } ? this : never {
    return this as any
  }

  /**
   * Applies a "less than" condition to the GSI's sort key.
   * Only available if the GSI has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortLessThan(
    val: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk']
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any } ? this : never {
    return this as any
  }

  /**
   * Applies a "less than or equal to" condition to the GSI's sort key.
   * Only available if the GSI has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortLessThanOrEqualTo(
    val: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk']
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any } ? this : never {
    return this as any
  }

  /* Modifiers */

  // No consistentRead on GSI

  /**
   * Limits the number of items returned.
   *
   * @param limit - The maximum number of items.
   */
  limit(limit: number): this {
    return this
  }

  /**
   * Sets the start key for pagination.
   *
   * @param key - The LastEvaluatedKey from a previous response.
   */
  startKey(key: Record<string, any>): this {
    return this
  }

  /**
   * Switches the output mode to 'raw'.
   * The query will return raw DynamoDB items.
   */
  raw(): GsiQuery<E, IndexName, 'raw', State> {
    return this as any
  }

  /**
   * Selects specific fields to return from the entity.
   *
   * @param fields - An array of field names to include.
   */
  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): GsiQuery<E, IndexName, { select: readonly K[] }, State> {
    return this as any
  }

  /**
   * Switches the output mode to 'count'.
   * The query will return the count of items matching the condition.
   */
  count(): GsiQuery<E, IndexName, 'count', State> {
    return this as any
  }

  /**
   * Executes the query.
   *
   * @returns A promise resolving to the results based on the output mode.
   */
  exec(
    this: GsiQuery<E, IndexName, Output, 'PARTITION_SET'>
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
