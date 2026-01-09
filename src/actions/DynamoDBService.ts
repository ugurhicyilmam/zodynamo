import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

import { Action } from './Action'

export class DynamoDBService {
  private readonly dynamo: DynamoDBDocumentClient

  constructor(args: { dynamo: DynamoDBDocumentClient }) {
    this.dynamo = args.dynamo
  }

  /**
   * Runs a specified command and returns its instance.
   * @param ActionClass - The action class to instantiate.
   * @returns An instance of the specified action class.
   */
  run<A extends Action>(ActionClass: new (dynamo: DynamoDBDocumentClient) => A): A {
    return new ActionClass(this.dynamo)
  }
}
