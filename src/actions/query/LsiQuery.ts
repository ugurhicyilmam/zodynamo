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
import {
  QueryKeyTypes,
  QueryOptions,
  QueryOutputMode,
  QueryState,
  RangeOptions,
  ResolveQueryChain
} from './types'

export type LsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends LocalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = ResolveQueryChain<LsiQueryBuilder<E, IndexName, Output, State>, State, Output>

export class LsiQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends LocalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> extends BaseQueryBuilder<E, Output, State> {
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
  ): LsiQuery<E, IndexName, Output, 'PARTITION_SET'> {
    return this as any
  }

  /**
   * Sets the partition key value directly.
   *
   * @param value - The exact value of the table's partition key.
   */
  partitionValue(
    value: QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['pk']
  ): LsiQuery<E, IndexName, Output, 'PARTITION_SET'> {
    return this as any
  }

  /* Sort Key Operations - specific to the LSI */

  range(
    options: RangeOptions<
      QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk'] extends string | number | boolean
        ? QueryKeyTypes<E, { kind: 'lsi'; name: IndexName }>['sk']
        : never
    >
  ): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  rangeFrom(
    args: NonNullable<E['localIndexes']>[IndexName]['rangeKey'] extends {
      calculate: (item: infer Input) => any
    }
      ? Input
      : never
  ): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  rangeNoCondition(): LsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  /* Modifiers */

  options(options: QueryOptions<E>): LsiQuery<E, IndexName, Output, 'OPTIONS_SET'> {
    return this as any
  }

  raw(): LsiQuery<E, IndexName, 'raw', 'OPTIONS_SET'> {
    return super.raw()
  }

  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): LsiQuery<E, IndexName, { select: readonly K[] }, 'OPTIONS_SET'> {
    return super.select(fields)
  }

  count(): LsiQuery<E, IndexName, 'count', 'OPTIONS_SET'> {
    return super.count()
  }

  exec(
    this:
      | LsiQuery<E, IndexName, Output, 'PARTITION_SET'>
      | LsiQuery<E, IndexName, Output, 'SORT_SET'>
      | LsiQuery<E, IndexName, Output, 'OPTIONS_SET'>
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
