import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

/**
 * Base class for all DynamoDB actions.
 * Provides access to the DynamoDBDocumentClient.
 */
export abstract class Action {
  constructor(protected readonly dynamo: DynamoDBDocumentClient) {}
}
