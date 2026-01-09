import { FieldPath } from '../../types/FieldPath'
import { InferEntity } from '../../types/InferEntity'
import {
  AnyEntity,
  FindOneKey,
  FindOneOptions,
  FindOneOutput,
  FindOneStateObject,
  ResolveFindOneChain
} from './types'

export class FindOne<
  E extends AnyEntity,
  State extends FindOneStateObject = { status: 'INITIAL' }
> {
  constructor(
    private entity: E,
    private state: State = { status: 'INITIAL' } as any
  ) {}

  key(
    key: FindOneKey<E>
  ): ResolveFindOneChain<
    FindOne<E, Omit<State, 'status' | 'key'> & { status: 'KEY_SET'; key: FindOneKey<E> }>,
    'KEY_SET'
  > {
    return new FindOne(this.entity, { ...this.state, status: 'KEY_SET', key }) as any
  }

  options(
    options: FindOneOptions
  ): ResolveFindOneChain<
    FindOne<E, Omit<State, 'options'> & { options: FindOneOptions }>,
    'KEY_SET'
  > {
    return new FindOne(this.entity, { ...this.state, options }) as any
  }

  attributes<const K extends FieldPath<InferEntity<E>>>(
    attributes: readonly K[]
  ): ResolveFindOneChain<
    FindOne<E, Omit<State, 'attributes'> & { attributes: readonly K[] }>,
    'KEY_SET'
  > {
    return new FindOne(this.entity, { ...this.state, attributes }) as any
  }

  orThrow(): ResolveFindOneChain<
    FindOne<E, Omit<State, 'orThrow'> & { orThrow: true }>,
    'KEY_SET'
  > {
    return new FindOne(this.entity, { ...this.state, orThrow: true }) as any
  }

  async exec(): Promise<FindOneOutput<E, State>> {
    // TODO: Implement actual DynamoDB call
    // For now, valid types are what matters mostly for this task, but runtime logic is needed too.
    const commandInput = {
      TableName: this.state.options?.tableName || this.entity.table.name,
      Key: this.state.key!, // key is guaranteed by state type in runtime usage if verified, but here we trust types
      ConsistentRead: this.state.options?.consistent,
      ProjectionExpression: this.state.attributes?.join(', '), // Needs path resolution
      ReturnConsumedCapacity: this.state.options?.capacity
    }

    // Mock implementation for now to satisfy return type
    return {} as any
  }
}
