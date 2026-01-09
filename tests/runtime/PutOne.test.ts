import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { PutOne } from '../../src/actions/put-one/PutOne'
import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { EntityCompositeAllFeatures, EntityPkString, EntityWithEntityType } from '../fixtures'

describe('PutOne Runtime', () => {
  let mockDynamoClient: DynamoDBDocumentClient

  beforeEach(() => {
    mockDynamoClient = {
      send: vi.fn()
    } as unknown as DynamoDBDocumentClient
  })

  it('correctly calculates and sends Item for simple PK entity', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    const action = new PutOne(mockDynamoClient).entity(EntityPkString).item({ id: '1' })
    await action.exec()

    expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.any(PutCommand))
    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input).toMatchObject({
      TableName: 'SimpleTable',
      Item: {
        pk: 'USER#1',
        id: '1'
      }
    })
  })

  it('correctly includes entity type when configured', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    const action = new PutOne(mockDynamoClient).entity(EntityWithEntityType).item({ id: '1' })
    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.Item).toMatchObject({
      pk: 'USER#1',
      id: '1',
      __type: 'USER'
    })
  })

  it('correctly calculates and sends Item for composite PK entity', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    const action = new PutOne(mockDynamoClient).entity(EntityCompositeAllFeatures).item({
      id: '1',
      email: 'test@example.com',
      age: 30,
      status: 'ACTIVE',
      createdAt: '2023-01-01'
    })
    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.Item).toMatchObject({
      pk: 'USER#1',
      sk: 'EMAIL#test@example.com',
      id: '1',
      email: 'test@example.com',
      age: 30,
      status: 'ACTIVE',
      createdAt: '2023-01-01'
    })
  })

  it('applies encode transform', async () => {
    const table = defineTable({
      name: 'TransformTable',
      fields: { pk: 'string', val: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    const entity = defineEntity(table, {
      name: 'TransformEntity',
      schema: z.object({ id: z.string(), count: z.number() }),
      key: { hashKey: { fields: ['id'], calculate: ({ id }) => `ID#${id}` } },
      transform: {
        encode: data => ({ ...data, count: data.count.toString() }),
        decode: (data: any) => ({ ...data, count: parseInt(data.count) })
      }
    })

    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    const action = new PutOne(mockDynamoClient).entity(entity).item({ id: '1', count: 10 })
    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.Item).toMatchObject({
      pk: 'ID#1',
      id: '1',
      count: '10' // Transformed to string
    })
  })

  it('respects custom tableName session option', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    const action = new PutOne(mockDynamoClient)
      .entity(EntityPkString)
      .item({ id: '1' })
      .options({ tableName: 'OverrideTable' })

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.TableName).toBe('OverrideTable')
  })

  it('respects ReturnConsumedCapacity option', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    await new PutOne(mockDynamoClient)
      .entity(EntityPkString)
      .item({ id: '1' })
      .options({ capacity: 'TOTAL' })
      .exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.ReturnConsumedCapacity).toBe('TOTAL')
  })

  it('respects ReturnValues option', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Attributes: { pk: '1' } })

    const result = await new PutOne(mockDynamoClient)
      .entity(EntityPkString)
      .item({ id: '1' })
      .options({ returnValues: 'ALL_OLD' })
      .exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.ReturnValues).toBe('ALL_OLD')
    // Result should contain the attributes (we might need to decode them)
    expect(result.Attributes).toBeDefined()
  })

  it('handles simple condition expressions', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    await new PutOne(mockDynamoClient)
      .entity(EntityPkString)
      .item({ id: '1' })
      .options({ condition: { attr: 'id', exists: false } })
      .exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.ConditionExpression).toBe('attribute_not_exists(#attr1)')
    expect(command.input.ExpressionAttributeNames).toMatchObject({ '#attr1': 'id' })
  })

  it('handles multiple nested conditions', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    await new PutOne(mockDynamoClient)
      .entity(EntityCompositeAllFeatures)
      .item({
        id: '1',
        email: 'test@example.com',
        age: 30,
        status: 'ACTIVE',
        createdAt: '2023-01-01'
      })
      .options({
        condition: {
          and: [
            { attr: 'status', eq: 'ACTIVE' },
            { attr: 'age', gte: 18 }
          ]
        }
      })
      .exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.ConditionExpression).toBe('(#attr1 = :val1) AND (#attr2 >= :val2)')
    expect(command.input.ExpressionAttributeNames).toMatchObject({
      '#attr1': 'status',
      '#attr2': 'age'
    })
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ':val1': 'ACTIVE',
      ':val2': 18
    })
  })

  it('propagates DynamoDB client errors', async () => {
    const error = new Error('DynamoDB Error')
    ;(mockDynamoClient.send as any).mockRejectedValueOnce(error)

    const action = new PutOne(mockDynamoClient).entity(EntityPkString).item({ id: '1' })

    await expect(action.exec()).rejects.toThrow('DynamoDB Error')
  })

  it('does not include undefined options in the command', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({})

    const action = new PutOne(mockDynamoClient).entity(EntityPkString).item({ id: '1' })
    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as PutCommand
    expect(command.input.ReturnConsumedCapacity).toBeUndefined()
    expect(command.input.ReturnValues).toBeUndefined()
    expect(command.input.ConditionExpression).toBeUndefined()
  })
})
