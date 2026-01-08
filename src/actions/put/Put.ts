import { Simplify } from 'type-fest'

import { Entity } from '../../types/Entity'
import { InferEntityInput } from '../../types/InferEntity'
import { PutOptions, PutState, ResolvePutChain } from './types'

export class Put<
  E extends Entity<any, any, any, any, any, any, any, any, any, any, any>,
  State extends PutState = 'INITIAL'
> {
  constructor(
    private entity: E,
    private state: {
      item?: any
      options?: PutOptions<E>
    } = {}
  ) {}

  item(data: InferEntityInput<E>): ResolvePutChain<this, 'ITEM_SET'> {
    return new Put(this.entity, { ...this.state, item: data }) as any
  }

  options(options: Simplify<PutOptions<E>>): ResolvePutChain<this, 'ITEM_SET'> {
    return new Put(this.entity, { ...this.state, options }) as any
  }

  exec(): Promise<any> {
    return Promise.resolve({})
  }
}
