import { PutCommandOutput } from '@aws-sdk/lib-dynamodb'

import { Entity } from '../../types/Entity'
import { InferEntity } from '../../types/InferEntity'
import { Prettify } from '../../types/utils'
import { Condition } from '../query/types'

export type PutState = 'INITIAL' | 'ITEM_SET'

export interface PutOptions<
  E extends Entity<any, any, any, any, any, any, any, any, any, any, any>
> {
  condition?: Condition<InferEntity<E>>
  returnValues?: 'NONE' | 'ALL_OLD'
  returnValuesOnConditionFalse?: 'NONE' | 'ALL_OLD'
  metrics?: 'NONE' | 'SIZE'
  capacity?: 'NONE' | 'TOTAL' | 'INDEXES'
  tableName?: string
}

export type PutResponse<E extends Entity<any, any, any, any, any, any, any, any, any>> = Prettify<
  Omit<PutCommandOutput, 'Attributes'> & {
    Attributes?: InferEntity<E>
  }
>

export type PutItemOperations = 'item'
export type PutOptionsOperations = 'options'
export type PutExecOperations = 'exec'

type AllowedPutOperations<State extends PutState> = State extends 'INITIAL'
  ? PutItemOperations
  : State extends 'ITEM_SET'
    ? PutOptionsOperations | PutExecOperations
    : never

export type ResolvePutChain<Base, State extends PutState> = Pick<
  Base,
  keyof Base & AllowedPutOperations<State>
>
