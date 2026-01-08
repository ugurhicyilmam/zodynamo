import { Entity } from '../../types/Entity'
import { InferDynamoItem } from '../../types/InferDynamoItem'
import { InferEntity } from '../../types/InferEntity'
/**
 * Builds a query for the Primary Index of a table.
 *
 * @template E - The Entity being queried.
 * @template Output - The configured output format.
 * @template State - The current state of the builder (enforces partition key requirement).
 */
import { BaseQueryBuilder } from './BaseQuery'
import {
  QueryKeyTypes,
  QueryOutputMode,
  QueryState,
  ResolveQueryChain,
  SortKeyOperations
} from './types'

type BasePrimaryQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> = E['table']['primaryIndex']['rangeKey'] extends string
  ? PrimaryQueryBuilder<E, Output, State, Modifiers>
  : Omit<PrimaryQueryBuilder<E, Output, State, Modifiers>, SortKeyOperations>

export type PrimaryQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> = ResolveQueryChain<BasePrimaryQuery<E, Output, State, Modifiers>, State, Modifiers, Output>

export class PrimaryQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> extends BaseQueryBuilder<E, Output, State, Modifiers> {
  constructor(entity: E) {
    super(entity)
  }

  /**
   * Set the partition key value.
   * For the primary index, we can optionally infer this from a domain object if needed,
   * but here we expose the direct value setter or a "from" helper.
   */
  partitionFrom(
    domain: E['key']['hashKey']['calculate'] extends (item: infer Input) => any ? Input : never
  ): PrimaryQuery<E, Output, 'PARTITION_SET', Modifiers> {
    return this as any
  }

  /**
   * Sets the partition key value directly.
   *
   * @param value - The exact value of the partition key.
   */
  partitionValue(
    value: QueryKeyTypes<E, { kind: 'primary' }>['pk']
  ): PrimaryQuery<E, Output, 'PARTITION_SET', Modifiers> {
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
  ): E['table']['primaryIndex']['rangeKey'] extends string
    ? PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['table']['primaryIndex']['rangeKey'] extends string
    ? PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['table']['primaryIndex']['rangeKey'] extends string
    ? PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['table']['primaryIndex']['rangeKey'] extends string
    ? PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['table']['primaryIndex']['rangeKey'] extends string
    ? PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['table']['primaryIndex']['rangeKey'] extends string
    ? PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['table']['primaryIndex']['rangeKey'] extends string
    ? PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
    : never {
    return this as any
  }

  /* Modifiers */

  /**
   * Enables strict consistency for the read.
   *
   * @param enabled - Whether to use strongly consistent reads. Defaults to true.
   */
  consistentRead(
    enabled: boolean = true
  ): PrimaryQuery<E, Output, 'OPTIONS_SET', Modifiers | 'consistentRead'> {
    return this as any
  }

  limit(limit: number): PrimaryQuery<E, Output, 'OPTIONS_SET', Modifiers | 'limit'> {
    return super.limit(limit)
  }

  startKey(
    key: Record<string, any>
  ): PrimaryQuery<E, Output, 'OPTIONS_SET', Modifiers | 'startKey'> {
    return super.startKey(key)
  }

  raw(): PrimaryQuery<E, 'raw', 'OPTIONS_SET', Modifiers> {
    return super.raw()
  }

  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): PrimaryQuery<E, { select: readonly K[] }, 'OPTIONS_SET', Modifiers> {
    return super.select(fields)
  }

  count(): PrimaryQuery<E, 'count', 'OPTIONS_SET', Modifiers> {
    return super.count()
  }

  /**
   * Executes the query.
   *
   * @returns A promise resolving to the results based on the output mode.
   */
  exec(
    this:
      | PrimaryQuery<E, Output, 'PARTITION_SET', Modifiers>
      | PrimaryQuery<E, Output, 'SORT_SET', Modifiers>
      | PrimaryQuery<E, Output, 'OPTIONS_SET', Modifiers>
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
