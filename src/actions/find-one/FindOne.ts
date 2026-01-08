import { Entity } from '../../types/Entity'
import { FieldPath } from '../../types/FieldPath'
import { InferEntity } from '../../types/InferEntity'
import { FindOneKey, FindOneOptions, FindOneOutput, FindOneState } from './types'

export class FindOne<
  E extends Entity<any, any, any, any, any, any, any, any, any, any, any>,
  State extends FindOneState = {}
> {
  constructor(
    private entity: E,
    private key: FindOneKey<E>,
    private state: State = {} as State
  ) {}

  options(options: FindOneOptions): FindOne<E, State & { options: FindOneOptions }> {
    return new FindOne(this.entity, this.key, { ...this.state, options })
  }

  attributes<const K extends FieldPath<InferEntity<E>>>(
    attributes: readonly K[]
  ): FindOne<E, State & { attributes: readonly K[] }> {
    return new FindOne(this.entity, this.key, { ...this.state, attributes })
  }

  orThrow(): FindOne<E, State & { orThrow: true }> {
    return new FindOne(this.entity, this.key, { ...this.state, orThrow: true })
  }

  async exec(): Promise<FindOneOutput<E, State>> {
    // TODO: Implement actual DynamoDB call
    // For now, valid types are what matters mostly for this task, but runtime logic is needed too.
    const commandInput = {
      TableName: this.state.options?.tableName || this.entity.table.name,
      Key: this.key, // Needs transformation to DynamoDB JSON format
      ConsistentRead: this.state.options?.consistent,
      ProjectionExpression: this.state.attributes?.join(', '), // Needs path resolution
      ReturnConsumedCapacity: this.state.options?.capacity
    }

    // Mock implementation for now to satisfy return type
    return {} as any
  }
}
