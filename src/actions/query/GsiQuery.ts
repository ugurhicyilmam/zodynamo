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
  GsiQueryOptions,
  QueryKeyTypes,
  QueryOutputMode,
  QueryState,
  RangeOptions,
  ResolveQueryChain
} from './types'

type BaseGsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = NonNullable<E['globalIndexes']>[IndexName]['rangeKey'] extends { calculate: any }
  ? GsiQueryBuilder<E, IndexName, Output, State>
  : Omit<GsiQueryBuilder<E, IndexName, Output, State>, 'range' | 'rangeFrom' | 'rangeNoCondition'>

export type GsiQuery<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> = ResolveQueryChain<
  BaseGsiQuery<E, IndexName, Output, State>,
  State,
  Output,
  NonNullable<E['globalIndexes']>[IndexName]['rangeKey'] extends { calculate: any } ? true : false
>

export class GsiQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  IndexName extends GlobalIndexName<E['table']>,
  Output extends QueryOutputMode<E> = 'entity',
  State extends QueryState = 'INITIAL'
> extends BaseQueryBuilder<E, Output, State> {
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
  ): GsiQuery<E, IndexName, Output, 'PARTITION_SET'> {
    return this as any
  }

  /* Sort Key Operations - Only available if the GSI has a sort key */

  range(
    options: RangeOptions<
      QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk'] extends string | number | boolean
        ? QueryKeyTypes<E, { kind: 'gsi'; name: IndexName }>['sk']
        : never
    >
  ): GsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  rangeFrom(
    args: NonNullable<E['globalIndexes']>[IndexName]['rangeKey'] extends {
      calculate: (item: infer Input) => any
    }
      ? Input
      : never
  ): GsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  rangeNoCondition(): GsiQuery<E, IndexName, Output, 'SORT_SET'> {
    return this as any
  }

  /* Modifiers */

  options(options: GsiQueryOptions<E>): GsiQuery<E, IndexName, Output, 'OPTIONS_SET'> {
    return this as any
  }

  // No consistentRead on GSI

  raw(): GsiQuery<E, IndexName, 'raw', 'OPTIONS_SET'> {
    return super.raw()
  }

  select<K extends keyof InferEntity<E>>(
    fields: readonly K[]
  ): GsiQuery<E, IndexName, { select: readonly K[] }, 'OPTIONS_SET'> {
    return super.select(fields)
  }

  count(): GsiQuery<E, IndexName, 'count', 'OPTIONS_SET'> {
    return super.count()
  }

  exec(
    this:
      | GsiQuery<E, IndexName, Output, 'PARTITION_SET'>
      | GsiQuery<E, IndexName, Output, 'SORT_SET'>
      | GsiQuery<E, IndexName, Output, 'OPTIONS_SET'>
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
