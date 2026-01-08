import { Entity } from '../../types/Entity'
import { GlobalIndexName } from '../../types/EntityKey'
import { InferDynamoItem } from '../../types/InferDynamoItem'
import { InferEntity } from '../../types/InferEntity'
/**
 * Builds a query for a Global Secondary Index (GSI) of a table.
 *
 * @template E - The Entity being queried.
 * @template IndexName - The name of the GSI.
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

type BaseGsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> = NonNullable<E['globalIndexes']>[IndexName]['rangeKey'] extends { calculate: any }
  ? GsiQueryBuilder<E, IndexName, Output, State, Modifiers>
  : Omit<GsiQueryBuilder<E, IndexName, Output, State, Modifiers>, SortKeyOperations>

export type GsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> = ResolveQueryChain<
  BaseGsiQuery<E, IndexName, Output, State, Modifiers>,
  State,
  Modifiers,
  Output
>

export class GsiQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL',
  Modifiers extends string = never
> extends BaseQueryBuilder<E, Output, State, Modifiers> {
  protected _indexName: IndexName

  constructor(entity: E, indexName: IndexName) {
    super(entity)
    this._indexName = indexName
  }

  /* Partition Key - Must be provided explicitly for GSI */

  /**
   * Sets the partition key value for the GSI.
   *
   * @param value - The exact value of the GSI's partition key.
   */
  partitionValue(
    value: QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['pk']
  ): GsiQuery<E, IndexName, Output, 'PARTITION_SET', Modifiers> {
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
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any }
    ? GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
    : never {
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
    ? GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
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
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any }
    ? GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any }
    ? GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any }
    ? GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any }
    ? GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
    : never {
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
  ): E['globalIndexes'][IndexName]['rangeKey'] extends { calculate: any }
    ? GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
    : never {
    return this as any
  }

  /* Modifiers */

  // No consistentRead on GSI

  limit(limit: number): GsiQuery<E, IndexName, Output, 'OPTIONS_SET', Modifiers | 'limit'> {
    return super.limit(limit)
  }

  startKey(
    key: Record<string, any>
  ): GsiQuery<E, IndexName, Output, 'OPTIONS_SET', Modifiers | 'startKey'> {
    return super.startKey(key)
  }

  raw(): GsiQuery<E, IndexName, 'raw', 'OPTIONS_SET', Modifiers> {
    return super.raw()
  }

  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): GsiQuery<E, IndexName, { select: readonly K[] }, 'OPTIONS_SET', Modifiers> {
    return super.select(fields)
  }

  count(): GsiQuery<E, IndexName, 'count', 'OPTIONS_SET', Modifiers> {
    return super.count()
  }

  exec(
    this:
      | GsiQuery<E, IndexName, Output, 'PARTITION_SET', Modifiers>
      | GsiQuery<E, IndexName, Output, 'SORT_SET', Modifiers>
      | GsiQuery<E, IndexName, Output, 'OPTIONS_SET', Modifiers>
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
