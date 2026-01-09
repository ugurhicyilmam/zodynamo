import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Simplify } from 'type-fest'

import { Entity } from '../../types/Entity'
import { InferEntityInput } from '../../types/InferEntity'
import { Action } from '../Action'
import { buildConditionExpression } from '../utils/conditions'
import { PutOptions, PutResponse, PutState, ResolvePutChain } from './types'

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
  async exec(): Promise<PutResponse<E>> {
    const data = this.entity.schema.parse(this.state.item)
    let encoded = { ...data }

    // 1. Calculate Primary Key
    const pkField = this.entity.table.primaryIndex.hashKey
    const pkValue = this.entity.key.hashKey.calculate(data)
    encoded[pkField] = pkValue

    if (this.entity.table.primaryIndex.rangeKey) {
      const skField = this.entity.table.primaryIndex.rangeKey
      const skValue = (this.entity.key as any).rangeKey.calculate(data)
      encoded[skField] = skValue
    }

    // 2. Calculate LSIs
    if (this.entity.localIndexes) {
      for (const [name, index] of Object.entries(this.entity.localIndexes)) {
        const skField = (this.entity.table.localIndexes as any)[name].rangeKey
        const skValue = (index as any).rangeKey.calculate(data)
        encoded[skField] = skValue
      }
    }

    // 3. Calculate GSIs
    if (this.entity.globalIndexes) {
      for (const [name, index] of Object.entries(this.entity.globalIndexes)) {
        const tableIndex = (this.entity.table.globalIndexes as any)[name]
        const pkField = tableIndex.hashKey
        const pkValue = (index as any).hashKey.calculate(data)
        encoded[pkField] = pkValue

        if (tableIndex.rangeKey) {
          const skField = tableIndex.rangeKey
          const skValue = (index as any).rangeKey.calculate(data)
          encoded[skField] = skValue
        }
      }
    }

    // 4. Entity Type
    if (this.entity.entityType && (this.entity.table as any).entityTypeField) {
      encoded[(this.entity.table as any).entityTypeField] = this.entity.entityType
    }

    // 5. TTL
    if (this.entity.ttl && (this.entity.table as any).ttl) {
      const ttlValue = this.entity.ttl(data)
      if (ttlValue !== undefined) {
        encoded[(this.entity.table as any).ttl] = ttlValue
      }
    }

    // 6. Encode Transform
    if (this.entity.transform) {
      encoded = this.entity.transform.encode(encoded)
    }

    const input: any = {
      TableName: this.state.options?.tableName || (this.entity.table as any).name,
      Item: encoded
    }

    if (this.state.options?.capacity) {
      input.ReturnConsumedCapacity = this.state.options.capacity
    }

    if (this.state.options?.metrics) {
      input.ReturnItemCollectionMetrics = this.state.options.metrics
    }

    if (this.state.options?.returnValues) {
      input.ReturnValues = this.state.options.returnValues
    }

    if (this.state.options?.condition) {
      const { ConditionExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
        buildConditionExpression(this.state.options.condition as any)

      input.ConditionExpression = ConditionExpression
      if (Object.keys(ExpressionAttributeNames).length > 0) {
        input.ExpressionAttributeNames = {
          ...(input.ExpressionAttributeNames || {}),
          ...ExpressionAttributeNames
        }
      }
      if (Object.keys(ExpressionAttributeValues).length > 0) {
        input.ExpressionAttributeValues = ExpressionAttributeValues
      }
    }

    const response = await this.dynamo.send(new PutCommand(input))
    const { Attributes, ...rest } = response

    let finalAttributes = Attributes
    if (finalAttributes && this.entity.transform) {
      finalAttributes = (this.entity.transform as any).decode(finalAttributes)
    }

    return { Attributes: finalAttributes, ...rest } as any
  }
}
