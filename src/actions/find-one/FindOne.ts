import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

import { ItemNotFoundError } from '../../errors/ItemNotFoundError'
import { FieldPath } from '../../types/FieldPath'
import { InferEntity } from '../../types/InferEntity'
import { Action } from '../Action'
import { buildProjectionExpression } from '../utils/projection'
import {
  AnyEntity,
  FindOneKey,
  FindOneOptions,
  FindOneResponse,
  FindOneStateObject,
  ResolveFindOneChain
} from './types'

export class FindOne extends Action {
  /**
   * Select an entity to perform the find one operation on.
   *
   * @param entity - The entity definition created with `defineEntity()`
   * @returns FindOne builder to continue the operation
   *
   * @example
   * ```ts
   * new FindOne(dynamo).entity(UserEntity).key({ id: '1' }).exec()
   * ```
   */
  entity<E extends AnyEntity>(entity: E): FindOneBuilder<E> {
    return new FindOneBuilder(this.dynamo, entity)
  }
}

export class FindOneBuilder<
  E extends AnyEntity,
  State extends FindOneStateObject = { status: 'INITIAL' }
> {
  constructor(
    private dynamo: DynamoDBDocumentClient,
    private entity: E,
    private state: State = { status: 'INITIAL' } as State
  ) {}

  /**
   * Set the primary key for the item to find.
   *
   * @param key - The primary key (hash key and range key if applicable)
   */
  key(
    key: FindOneKey<E>
  ): ResolveFindOneChain<
    FindOneBuilder<E, Omit<State, 'status' | 'key'> & { status: 'KEY_SET'; key: FindOneKey<E> }>,
    'KEY_SET'
  > {
    return new FindOneBuilder(this.dynamo, this.entity, {
      ...this.state,
      status: 'KEY_SET',
      key
    }) as any
  }

  /**
   * Configure find one options like consistent read.
   *
   * @param options - Find configuration options
   */
  options(
    options: FindOneOptions
  ): ResolveFindOneChain<
    FindOneBuilder<E, Omit<State, 'options'> & { options: FindOneOptions }>,
    'KEY_SET'
  > {
    return new FindOneBuilder(this.dynamo, this.entity, { ...this.state, options }) as any
  }

  /**
   * Project specific fields from the result.
   *
   * @param attributes - Array of field paths to include
   */
  attributes<const K extends FieldPath<InferEntity<E>>>(
    attributes: readonly K[]
  ): ResolveFindOneChain<
    FindOneBuilder<E, Omit<State, 'attributes'> & { attributes: readonly K[] }>,
    'KEY_SET'
  > {
    return new FindOneBuilder(this.dynamo, this.entity, { ...this.state, attributes }) as any
  }

  /**
   * Throw an error if the item is not found.
   */
  orThrow(): ResolveFindOneChain<
    FindOneBuilder<E, Omit<State, 'orThrow'> & { orThrow: true }>,
    'KEY_SET'
  > {
    return new FindOneBuilder(this.dynamo, this.entity, { ...this.state, orThrow: true }) as any
  }

  /**
   * Execute the find one operation.
   *
   * @returns Promise resolving to the found item or undefined (or throwing if orThrow() was called)
   */
  async exec(): Promise<FindOneResponse<E, State>> {
    const hashKeyName = (this.entity as any).table.primaryIndex.hashKey
    const hashKeyValue = (this.entity as any).key.hashKey.calculate(this.state.key)

    const Key: Record<string, any> = {
      [hashKeyName]: hashKeyValue
    }

    if ((this.entity as any).table.primaryIndex.rangeKey) {
      const rangeKeyName = (this.entity as any).table.primaryIndex.rangeKey
      const rangeKeyValue = (this.entity as any).key.rangeKey.calculate(this.state.key)
      Key[rangeKeyName] = rangeKeyValue
    }

    const input: any = {
      TableName: this.state.options?.tableName || (this.entity as any).table.name,
      Key
    }

    if (this.state.options?.consistent !== undefined) {
      input.ConsistentRead = this.state.options.consistent
    }

    if (this.state.options?.capacity !== undefined) {
      input.ReturnConsumedCapacity = this.state.options.capacity
    }

    if (this.state.attributes && this.state.attributes.length > 0) {
      const { ProjectionExpression, ExpressionAttributeNames } = buildProjectionExpression(
        this.state.attributes
      )
      input.ProjectionExpression = ProjectionExpression
      input.ExpressionAttributeNames = ExpressionAttributeNames
    }

    const response = await this.dynamo.send(new GetCommand(input))
    const { Item, ...rest } = response

    if (!Item) {
      if (this.state.orThrow) {
        throw new ItemNotFoundError((this.entity as any).name, Key)
      }
      return { item: undefined, ...rest } as any
    }

    let item = Item
    if (this.entity.transform) {
      item = (this.entity.transform as any).decode(item)
    }

    const validationSchema =
      this.state.attributes && this.state.attributes.length > 0
        ? (this.entity.schema as any).deepPartial()
        : this.entity.schema

    return { item: validationSchema.parse(item), ...rest } as any
  }
}
