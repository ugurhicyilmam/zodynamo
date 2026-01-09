import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Query } from '../../src/actions/query/Query'
import { EntityCompositeAllFeatures, EntityPkString, EntityWithNestedData } from '../fixtures'

describe('Query Runtime', () => {
  let mockDynamoClient: DynamoDBDocumentClient

  beforeEach(() => {
    mockDynamoClient = {
      send: vi.fn()
    } as unknown as DynamoDBDocumentClient
  })

  describe('Primary Index Queries', () => {
    it('queries with partition key only', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({
        Items: [{ pk: 'USER#1', id: '1', name: 'John', __type: 'SimpleUser' }]
      })

      const results = await new Query(mockDynamoClient)
        .entity(EntityPkString)
        .primary()
        .partitionValue('USER#1')
        .exec()

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({ id: '1' })
      expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.any(QueryCommand))
      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input).toMatchObject({
        TableName: 'SimpleTable',
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': 'pk' },
        ExpressionAttributeValues: { ':pk': 'USER#1' }
      })
    })

    it('queries with partition and range key (eq)', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Items: [] })

      await new Query(mockDynamoClient)
        .entity(EntityCompositeAllFeatures)
        .primary()
        .partitionValue('USER#1')
        .range({ eq: 'EMAIL#test@example.com' })
        .exec()

      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input.KeyConditionExpression).toBe('(#pk = :pk) AND (#sk = :sk)')
      expect(command.input.ExpressionAttributeNames).toMatchObject({
        '#pk': 'pk',
        '#sk': 'sk'
      })
      expect(command.input.ExpressionAttributeValues).toMatchObject({
        ':pk': 'USER#1',
        ':sk': 'EMAIL#test@example.com'
      })
    })

    it('queries with beginsWith range operator', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Items: [] })

      await new Query(mockDynamoClient)
        .entity(EntityCompositeAllFeatures)
        .primary()
        .partitionValue('USER#1')
        .range({ beginsWith: 'EMAIL#' })
        .exec()

      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input.KeyConditionExpression).toBe('(#pk = :pk) AND (begins_with(#sk, :sk))')
    })
  })

  describe('GSI Queries', () => {
    it('correctly maps GSI keys and name', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Items: [] })

      await new Query(mockDynamoClient)
        .entity(EntityCompositeAllFeatures)
        .gsi('GSI1')
        .partitionValue('STATUS#ACTIVE')
        .range({ eq: 25 })
        .exec()

      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input).toMatchObject({
        IndexName: 'GSI1',
        KeyConditionExpression: '(#pk = :pk) AND (#sk = :sk)',
        ExpressionAttributeNames: {
          '#pk': 'gsi1pk',
          '#sk': 'gsi1sk'
        }
      })
    })
  })

  describe('Modifiers and Options', () => {
    it('applies filters', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Items: [] })

      await new Query(mockDynamoClient)
        .entity(EntityPkString)
        .primary()
        .partitionValue('USER#1')
        .options({
          filter: { attr: 'id', eq: '1' }
        })
        .exec()

      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input.FilterExpression).toBe('#attr1 = :val1')
      expect(command.input.ExpressionAttributeNames).toMatchObject({ '#attr1': 'id' })
    })

    it('handles pagination (limit and startKey)', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Items: [] })

      await new Query(mockDynamoClient)
        .entity(EntityPkString)
        .primary()
        .partitionValue('USER#1')
        .options({
          limit: 10,
          startKey: { pk: 'USER#0' }
        })
        .exec()

      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input.Limit).toBe(10)
      expect(command.input.ExclusiveStartKey).toMatchObject({ pk: 'USER#0' })
    })

    it('handles ordering', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Items: [] })

      await new Query(mockDynamoClient)
        .entity(EntityPkString)
        .primary()
        .partitionValue('USER#1')
        .options({ order: 'desc' })
        .exec()

      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input.ScanIndexForward).toBe(false)
    })
  })

  describe('Output Modes', () => {
    it('supports count mode', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({ Count: 5 })

      const count = await new Query(mockDynamoClient)
        .entity(EntityPkString)
        .primary()
        .partitionValue('USER#1')
        .count()
        .exec()

      expect(count).toBe(5)
      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input.Select).toBe('COUNT')
    })

    it('supports select (projection)', async () => {
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({
        Items: [{ id: '1', email: 'test@example.com' }]
      })

      await new Query(mockDynamoClient)
        .entity(EntityWithNestedData)
        .primary()
        .partitionValue('USER#1')
        .rangeNoCondition()
        .select(['email', 'metadata.version'])
        .exec()

      const command = vi.mocked(mockDynamoClient.send).mock.calls[0]![0] as QueryCommand
      expect(command.input.ProjectionExpression).toContain('#attr')
      expect(command.input.ExpressionAttributeNames).toMatchObject({
        '#attr1': 'email',
        '#attr2': 'metadata',
        '#attr3': 'version'
      })
    })

    it('supports raw mode', async () => {
      const rawItem = { pk: 'USER#1', id: '1', __type: 'SimpleUser' }
      ;(mockDynamoClient.send as any).mockResolvedValueOnce({
        Items: [rawItem]
      })

      const results = await new Query(mockDynamoClient)
        .entity(EntityPkString)
        .primary()
        .partitionValue('USER#1')
        .raw()
        .exec()

      expect(results[0]).toBe(rawItem)
    })
  })
})
