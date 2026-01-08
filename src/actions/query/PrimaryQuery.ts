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
  QueryOptions,
  QueryOutputMode,
  QueryState,
  RangeOptions,
  ResolveQueryChain
} from './types'

type BasePrimaryQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = E['table']['primaryIndex']['rangeKey'] extends string
  ? PrimaryQueryBuilder<E, Output, State>
  : Omit<PrimaryQueryBuilder<E, Output, State>, 'range' | 'rangeFrom' | 'rangeNoCondition'>

export type PrimaryQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = ResolveQueryChain<
  BasePrimaryQuery<E, Output, State>,
  State,
  Output,
  E['table']['primaryIndex']['rangeKey'] extends string ? true : false
>

export class PrimaryQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> extends BaseQueryBuilder<E, Output, State> {
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

  range(
    options: RangeOptions<
      QueryKeyTypes<E, { kind: 'primary' }>['sk'] extends string | number | boolean
        ? QueryKeyTypes<E, { kind: 'primary' }>['sk']
        : never
    >
  ): PrimaryQuery<E, Output, 'SORT_SET'> {
    return this as any
  }

  rangeFrom(
    args: E['key']['rangeKey'] extends { calculate: (item: infer Input) => any } ? Input : never
  ): PrimaryQuery<E, Output, 'SORT_SET'> {
    return this as any
  }

  rangeNoCondition(): PrimaryQuery<E, Output, 'SORT_SET'> {
    return this as any
  }

  /* Modifiers */

  options(options: QueryOptions<E>): PrimaryQuery<E, Output, 'OPTIONS_SET'> {
    return this as any
  }

  raw(): PrimaryQuery<E, 'raw', 'OPTIONS_SET'> {
    return super.raw()
  }

  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): PrimaryQuery<E, { select: readonly K[] }, 'OPTIONS_SET'> {
    return super.select(fields)
  }

  count(): PrimaryQuery<E, 'count', 'OPTIONS_SET'> {
    return super.count()
  }

  /**
   * Executes the query.
   *
   * @returns A promise resolving to the results based on the output mode.
   */
  exec(
    this:
      | PrimaryQuery<E, Output, 'PARTITION_SET'>
      | PrimaryQuery<E, Output, 'SORT_SET'>
      | PrimaryQuery<E, Output, 'OPTIONS_SET'>
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
