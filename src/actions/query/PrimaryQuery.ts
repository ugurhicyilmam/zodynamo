import { Entity } from '../../types/Entity'
import { InferDynamoItem } from '../../types/InferDynamoItem'
import { InferEntity } from '../../types/InferEntity'
import { QueryKeyTypes, QueryOutputMode, QueryState, SortKeyOperations } from './types'

export type PrimaryQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = E['table']['primaryIndex']['rangeKey'] extends string
  ? PrimaryQueryBuilder<E, Output, State>
  : Omit<PrimaryQueryBuilder<E, Output, State>, SortKeyOperations>

/**
 * Builds a query for the Primary Index of a table.
 *
 * @template E - The Entity being queried.
 * @template Output - The configured output format.
 * @template State - The current state of the builder (enforces partition key requirement).
 */
export class PrimaryQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> {
  protected _entity: E
  protected _output: Output
  protected _state!: State

  constructor(entity: E) {
    this._entity = entity
    this._output = 'entity' as any
  }

  /**
   * Set the partition key value.
   * For the primary index, we can optionally infer this from a domain object if needed,
   * but here we expose the direct value setter or a "from" helper.
   */
  /**
   * Sets the partition key using the input object for the key calculation function.
   * NOTE: This does NOT use the input as the key itself, but computes the key from it.
   *
   * @param domain - The input object required to calculate the partition key.
   */
  partitionFrom(
    domain: E['key']['hashKey']['calculate'] extends (item: infer Input) => any ? Input : never
  ): PrimaryQuery<E, Output, 'PARTITION_SET'> {
    return this as any
  }

  /**
   * Sets the partition key value directly.
   *
   * @param value - The exact value of the partition key.
   */
  partitionValue(
    value: QueryKeyTypes<E, { kind: 'primary' }>['pk']
  ): PrimaryQuery<E, Output, 'PARTITION_SET'> {
    return this as any
  }

  /* Sort Key Operations - Only available if the table has a sort key */

  /**
   * Applies an equality condition to the sort key.
   * Only available if the table has a sort key.
   *
   * @param val - The value to match.
   */
  sortEquals(
    val: QueryKeyTypes<E, { kind: 'primary' }>['sk']
  ): E['table']['primaryIndex']['rangeKey'] extends string ? this : never {
    return this as any
  }

  /**
   * Applies a "begins with" condition to the sort key.
   * Only available if the table has a string sort key.
   *
   * @param val - The prefix to check.
   */
  sortBeginsWith(
    val: E['table']['primaryIndex']['rangeKey'] extends string ? string : never
  ): E['table']['primaryIndex']['rangeKey'] extends string ? this : never {
    return this as any
  }

  /**
   * Applies a "between" condition to the sort key.
   * Only available if the table has a sort key.
   *
   * @param min - The minimum value (inclusive).
   * @param max - The maximum value (inclusive).
   */
  sortBetween(
    min: QueryKeyTypes<E, { kind: 'primary' }>['sk'],
    max: QueryKeyTypes<E, { kind: 'primary' }>['sk']
  ): E['table']['primaryIndex']['rangeKey'] extends string ? this : never {
    return this as any
  }

  /**
   * Applies a "greater than" condition to the sort key.
   * Only available if the table has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortGreaterThan(
    val: QueryKeyTypes<E, { kind: 'primary' }>['sk']
  ): E['table']['primaryIndex']['rangeKey'] extends string ? this : never {
    return this as any
  }

  /**
   * Applies a "greater than or equal to" condition to the sort key.
   * Only available if the table has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortGreaterThanOrEqualTo(
    val: QueryKeyTypes<E, { kind: 'primary' }>['sk']
  ): E['table']['primaryIndex']['rangeKey'] extends string ? this : never {
    return this as any
  }

  /**
   * Applies a "less than" condition to the sort key.
   * Only available if the table has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortLessThan(
    val: QueryKeyTypes<E, { kind: 'primary' }>['sk']
  ): E['table']['primaryIndex']['rangeKey'] extends string ? this : never {
    return this as any
  }

  /**
   * Applies a "less than or equal to" condition to the sort key.
   * Only available if the table has a sort key.
   *
   * @param val - The value to compare against.
   */
  sortLessThanOrEqualTo(
    val: QueryKeyTypes<E, { kind: 'primary' }>['sk']
  ): E['table']['primaryIndex']['rangeKey'] extends string ? this : never {
    return this as any
  }

  /* Modifiers */

  /**
   * Enables strict consistency for the read.
   *
   * @param enabled - Whether to use strongly consistent reads. Defaults to true.
   */
  consistentRead(enabled: boolean = true): this {
    return this
  }

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
   * The query will return raw DynamoDB items (no typings/transformations applied).
   */
  raw(): PrimaryQuery<E, 'raw', State> {
    return this as any
  }

  /**
   * Selects specific fields to return from the entity.
   *
   * @param fields - An array of field names to include.
   */
  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): PrimaryQuery<E, { select: readonly K[] }, State> {
    return this as any
  }

  /**
   * Switches the output mode to 'count'.
   * The query will return the count of items matching the condition.
   */
  count(): PrimaryQuery<E, 'count', State> {
    return this as any
  }

  /**
   * Executes the query.
   *
   * @returns A promise resolving to the results based on the output mode.
   */
  exec(
    this: PrimaryQuery<E, Output, 'PARTITION_SET'>
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
