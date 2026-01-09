import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { FindOne } from '../../src/actions/find-one/FindOne'
import { ItemNotFoundError } from '../../src/errors/ItemNotFoundError'
import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { EntityCompositeAllFeatures, EntityPkString, EntityWithNestedData } from '../fixtures'

describe('FindOne Runtime', () => {
  let mockDynamoClient: DynamoDBDocumentClient

  beforeEach(() => {
    mockDynamoClient = {
      send: vi.fn()
    } as unknown as DynamoDBDocumentClient
  })

  it('correctly calculates and sends Key for simple PK entity', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { pk: 'USER#1', id: '1' }
    })

    const action = new FindOne(mockDynamoClient).entity(EntityPkString).key({ id: '1' })
    const result = await action.exec()

    expect(result.item).toEqual({ id: '1' })
    expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.any(GetCommand))
    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input).toMatchObject({
      TableName: 'SimpleTable',
      Key: { pk: 'USER#1' }
    })
  })

  it('correctly calculates and sends Key for composite PK entity', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: {
        pk: 'USER#1',
        sk: 'EMAIL#test@example.com',
        id: '1',
        email: 'test@example.com',
        age: 30,
        status: 'ACTIVE',
        createdAt: '2023-01-01'
      }
    })

    const action = new FindOne(mockDynamoClient).entity(EntityCompositeAllFeatures).key({
      id: '1',
      email: 'test@example.com'
    })
    const result = await action.exec()

    expect(result.item).toMatchObject({ id: '1', email: 'test@example.com' })
    expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.any(GetCommand))
    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input).toMatchObject({
      TableName: 'TestTable',
      Key: {
        pk: 'USER#1',
        sk: 'EMAIL#test@example.com'
      }
    })
  })

  it('handles attributes projection', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { email: 'test@example.com', metadata: { version: 1 } }
    })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityWithNestedData)
      .key({ id: '1', email: 'test@example.com' })
      .attributes(['email', 'metadata.version'])

    const result = await action.exec()

    expect(result.item).toEqual({ email: 'test@example.com', metadata: { version: 1 } })
    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input).toMatchObject({
      ProjectionExpression: expect.stringContaining('#attr'),
      ExpressionAttributeNames: {
        '#attr1': 'email',
        '#attr2': 'metadata',
        '#attr3': 'version'
      }
    })
  })

  it('applies encode/decode transforms', async () => {
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

    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { pk: 'ID#1', id: '1', count: '10' }
    })

    const action = new FindOne(mockDynamoClient).entity(entity).key({ id: '1' })
    const result = await action.exec()

    expect(result.item).toEqual({ id: '1', count: 10 })

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input).toMatchObject({
      TableName: 'TransformTable',
      Key: { pk: 'ID#1' }
    })
  })

  it('throws error when orThrow() is used and item is missing', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValue({
      Item: undefined
    })

    const action = new FindOne(mockDynamoClient).entity(EntityPkString).key({ id: '1' }).orThrow()

    await expect(action.exec()).rejects.toThrow(ItemNotFoundError)
    try {
      await action.exec()
    } catch (e: any) {
      expect(e.entityName).toBe('SimpleUser')
      expect(e.key).toEqual({ pk: 'USER#1' })
    }
  })

  it('respects custom tableName session option', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { pk: 'USER#1', id: '1' }
    })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityPkString)
      .key({ id: '1' })
      .options({ tableName: 'OverrideTable' })

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input.TableName).toBe('OverrideTable')
  })

  it('respects ConsistentRead option', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Item: { pk: 'USER#1', id: '1' } })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityPkString)
      .key({ id: '1' })
      .options({ consistent: true })

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input.ConsistentRead).toBe(true)
  })

  it('respects ReturnConsumedCapacity option', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Item: { pk: 'USER#1', id: '1' } })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityPkString)
      .key({ id: '1' })
      .options({ capacity: 'INDEXES' })

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input.ReturnConsumedCapacity).toBe('INDEXES')
  })

  it('returns item: undefined when item is missing and orThrow() is not used', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: undefined
    })

    const action = new FindOne(mockDynamoClient).entity(EntityPkString).key({ id: '1' })
    const result = await action.exec()

    expect(result.item).toBeUndefined()
  })

  it('propagates DynamoDB client errors', async () => {
    const error = new Error('DynamoDB Error')
    ;(mockDynamoClient.send as any).mockRejectedValueOnce(error)

    const action = new FindOne(mockDynamoClient).entity(EntityPkString).key({ id: '1' })

    await expect(action.exec()).rejects.toThrow('DynamoDB Error')
  })

  it('handles nested projection with array indices', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { history: [{ action: 'CREATED' }] }
    })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityWithNestedData)
      .key({ id: '1', email: 'test@example.com' })
      .attributes(['history[0].action'])

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input).toMatchObject({
      ProjectionExpression: expect.stringContaining('#attr'),
      ExpressionAttributeNames: {
        '#attr1': 'history',
        '#attr2': 'action'
      }
    })
  })

  it('does not include undefined options in the command', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Item: { pk: 'USER#1', id: '1' } })

    const action = new FindOne(mockDynamoClient).entity(EntityPkString).key({ id: '1' })
    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input.ConsistentRead).toBeUndefined()
    expect(command.input.ReturnConsumedCapacity).toBeUndefined()
  })

  it('handles overlapping projection paths (e.g., parent and child)', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { metadata: { version: 1, tags: ['a'] } }
    })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityWithNestedData)
      .key({ id: '1', email: 'test@example.com' })
      .attributes(['metadata', 'metadata.version'])

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input.ProjectionExpression).toContain('#attr1')
    expect(command.input.ProjectionExpression).toContain('#attr1.#attr2')
  })

  it('handles multiple nested fields in the same object projection', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { metadata: { version: 1, tags: ['a'] } }
    })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityWithNestedData)
      .key({ id: '1', email: 'test@example.com' })
      .attributes(['metadata.version', 'metadata.tags'])

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input.ProjectionExpression).toMatch(/#attr\d\.#attr\d/)
    expect(command.input.ProjectionExpression).toMatch(/, /)
  })

  it('handles record key projection with bracket notation', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: { meta: { 'user.id': '123' } }
    })

    const action = new FindOne(mockDynamoClient)
      .entity(EntityWithNestedData)
      .key({ id: '1', email: 'test@example.com' })
      // @ts-expect-error - record key with dots
      .attributes(["meta['user.id']"])

    await action.exec()

    const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as GetCommand
    expect(command.input.ProjectionExpression).toBe('#attr1.#attr2')
    expect(command.input.ExpressionAttributeNames).toMatchObject({
      '#attr1': 'meta',
      '#attr2': 'user.id'
    })
  })

  it('fails with Zod error when decoded data is invalid', async () => {
    ;(mockDynamoClient.send as any).mockResolvedValueOnce({
      Item: {
        pk: 'USER#1',
        sk: 'EMAIL#test@example.com',
        id: '1',
        email: 'test@example.com',
        age: 'INVALID'
      }
    })

    const action = new FindOne(mockDynamoClient).entity(EntityCompositeAllFeatures).key({
      id: '1',
      email: 'test@example.com'
    })

    await expect(action.exec()).rejects.toThrow()
  })
})
