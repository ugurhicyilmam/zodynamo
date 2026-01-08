import { Entity } from '../../types/Entity'
import { LocalIndexName } from '../../types/EntityKey'
import { InferDynamoItem } from '../../types/InferDynamoItem'
import { InferEntity } from '../../types/InferEntity'
/**
 * Builds a query for a Local Secondary Index (LSI) of a table.
 *
 * @template E - The Entity being queried.
 * @template IndexName - The name of the LSI.
 * @template Output - The configured output format.
 * @template State - The current state of the builder (enforces partition key requirement).
 */
import { BaseQueryBuilder } from './BaseQuery'
import { QueryKeyTypes, QueryOutputMode, QueryState, ResolveQueryChain } from './types'

export type LsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends LocalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> = ResolveQueryChain<
  LsiQueryBuilder<E, IndexName, Output, State, Modifiers>,
  State,
  Modifiers,
  Output
>

export class LsiQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends LocalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> extends BaseQueryBuilder<E, Output, State, Modifiers> {
  protected _indexName: IndexName

  constructor(entity: E, indexName: IndexName) {
    super(entity)
    this._indexName = indexName
  }

  /* Partition Key - LSI shares the table's partition key */

  /**
   * Sets the partition key using the input object for the table's hash key calculation function.
   *
   * @param domain - The input object required to calculate the partition key.
   */
  partitionFrom(
    domain: E['key']['hashKey']['calculate'] extends (item: infer Input) => any ? Input : never
  ): LsiQuery<E, IndexName, Output, 'PARTITION_SET', Modifiers> {
    return this as any
  }

  /**
   * Sets the partition key value directly.
   *
   * @param value - The exact value of the table's partition key.
   */
  partitionValue(
    value: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['pk']
  ): LsiQuery<E, IndexName, Output, 'PARTITION_SET', Modifiers> {
    return this as any
  }

  /* Sort Key Operations - specific to the LSI */

  /**
   * Applies an equality condition to the LSI's sort key.
   *
   * @param val - The value to match.
   */
  sortEquals(
    val: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk']
  ): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  /**
   * Applies a "begins with" condition to the LSI's sort key.
   * Only available if the LSI has a string sort key.
   *
   * @param val - The prefix to check.
   */
  sortBeginsWith(
    val: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk'] extends string ? string : never
  ): LsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers> {
    return this as any
  }

  /**
   * Applies a "between" condition to the LSI's sort key.
   *
   * @param min - The minimum value (inclusive).
   * @param max - The maximum value (inclusive).
   */
  sortBetween(
    min: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk'],
    max: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk']
  ): LsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers> {
    return this as any
  }

  /**
   * Applies a "greater than" condition to the LSI's sort key.
   *
   * @param val - The value to compare against.
   */
  sortGreaterThan(
    val: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk']
  ): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  /**
   * Applies a "greater than or equal to" condition to the LSI's sort key.
   *
   * @param val - The value to compare against.
   */
  sortGreaterThanOrEqualTo(
    val: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk']
  ): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  /**
   * Applies a "less than" condition to the LSI's sort key.
   *
   * @param val - The value to compare against.
   */
  sortLessThan(
    val: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk']
  ): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  /**
   * Applies a "less than or equal to" condition to the LSI's sort key.
   *
   * @param val - The value to compare against.
   */
  sortLessThanOrEqualTo(
    val: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk']
  ): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
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
  ): LsiQuery<E, IndexName, Output, 'OPTIONS_SET', Modifiers | 'consistentRead'> {
    return this as any
  }

  limit(limit: number): LsiQuery<E, IndexName, Output, 'OPTIONS_SET', Modifiers | 'limit'> {
    return super.limit(limit)
  }

  startKey(
    key: Record<string, any>
  ): LsiQuery<E, IndexName, Output, 'OPTIONS_SET', Modifiers | 'startKey'> {
    return super.startKey(key)
  }

  raw(): LsiQuery<E, IndexName, 'raw', 'OPTIONS_SET', Modifiers> {
    return super.raw()
  }

  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): LsiQuery<E, IndexName, { select: readonly K[] }, 'OPTIONS_SET', Modifiers> {
    return super.select(fields)
  }

  count(): LsiQuery<E, IndexName, 'count', 'OPTIONS_SET', Modifiers> {
    return super.count()
  }

  exec(
    this:
      | LsiQuery<E, IndexName, Output, 'PARTITION_SET', Modifiers>
      | LsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
      | LsiQuery<E, IndexName, Output, 'OPTIONS_SET', Modifiers>
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
    return super.exec()
  }
}
