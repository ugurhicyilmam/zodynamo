import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { Simplify } from 'type-fest'

import { Entity } from '../../types/Entity'
import { InferEntityInput } from '../../types/InferEntity'
import { Action } from '../Action'
import { PutOptions, PutState, ResolvePutChain } from './types'

export class Put extends Action {
  /**
   * Select an entity to perform the put operation on.
   *
   * @param entity - The entity definition created with `defineEntity()`
   * @returns Put builder to continue the operation
   *
   * @example
   * ```ts
   * new Put(dynamo).entity(UserEntity).item({ id: '1' }).exec()
   * ```
   */
  entity<E extends Entity<any, any, any, any, any, any, any, any, any, any, any>>(
    entity: E
  ): PutBuilder<E> {
    return new PutBuilder(this.dynamo, entity)
  }
}

export class PutBuilder<
  E extends Entity<any, any, any, any, any, any, any, any, any, any, any>,
  State extends PutState = 'INITIAL'
> {
  constructor(
    private dynamo: DynamoDBDocumentClient,
    private entity: E,
    private state: {
      item?: any
      options?: PutOptions<E>
    } = {}
  ) {}

  /**
   * Set the item data to be put.
   *
   * @param data - The entity data matching the schema
   */
  item(data: InferEntityInput<E>): ResolvePutChain<this, 'ITEM_SET'> {
    return new PutBuilder(this.dynamo, this.entity, { ...this.state, item: data }) as any
  }

  /**
   * Configure put options like conditions.
   *
   * @param options - Put configuration options
   */
  options(options: Simplify<PutOptions<E>>): ResolvePutChain<this, 'ITEM_SET'> {
    return new PutBuilder(this.dynamo, this.entity, { ...this.state, options }) as any
  }

  /**
   * Execute the put operation.
   */
  exec(): Promise<any> {
    // TODO: Implement actual DynamoDB call
    return Promise.resolve({})
  }
}
