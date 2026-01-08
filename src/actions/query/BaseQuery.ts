import { Entity } from '../../types/Entity'
import { InferEntity } from '../../types/InferEntity'
import { QueryOutputMode, QueryState } from './types'

export abstract class BaseQueryBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any>,
  Output extends QueryOutputMode<E>,
  State extends QueryState,
  Modifiers extends string
> {
  protected _entity: E
  protected _output: Output
  protected _state!: State

  constructor(entity: E) {
    this._entity = entity
    this._output = 'entity' as any
  }

  /**
   * Limits the number of items returned.
   *
   * @param limit - The maximum number of items.
   */
  limit(limit: number): any {
    return this
  }

  /**
   * Sets the start key for pagination.
   *
   * @param key - The LastEvaluatedKey from a previous response.
   */
  startKey(key: Record<string, any>): any {
    return this
  }

  /**
   * Switches the output mode to 'raw'.
   * The query will return raw DynamoDB items.
   */
  raw(): any {
    return this
  }

  /**
   * Selects specific fields to return from the entity.
   *
   * @param fields - An array of field names to include.
   */
  select<K extends keyof InferEntity<E>>(fields: readonly K[]): any {
    return this
  }

  /**
   * Switches the output mode to 'count'.
   * The query will return the count of items matching the condition.
   */
  count(): any {
    return this
  }

  /**
   * Executes the query.
   */
  exec(): Promise<any> {
    return Promise.resolve([])
  }
}
