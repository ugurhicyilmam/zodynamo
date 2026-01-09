import { PutCommandOutput } from '@aws-sdk/lib-dynamodb'

import { Entity } from '../../types/Entity'
import { InferEntity } from '../../types/InferEntity'
import { Prettify } from '../../types/utils'
import { Condition } from '../query/types'

export type PutOneState = 'INITIAL' | 'ITEM_SET'

export interface PutOneOptions<
  E extends Entity<any, any, any, any, any, any, any, any, any, any, any>
> {
  condition?: Condition<InferEntity<E>>
  returnValues?: 'NONE' | 'ALL_OLD'
  returnValuesOnConditionFalse?: 'NONE' | 'ALL_OLD'
  metrics?: 'NONE' | 'SIZE'
  capacity?: 'NONE' | 'TOTAL' | 'INDEXES'
  tableName?: string
}

export type PutOneResponse<E extends Entity<any, any, any, any, any, any, any, any, any>> =
  Prettify<
    Omit<PutCommandOutput, 'Attributes'> & {
      Attributes?: InferEntity<E>
    }
  >

export type PutOneItemOperations = 'item'
export type PutOneOptionsOperations = 'options'
export type PutOneExecOperations = 'exec'

type AllowedPutOneOperations<State extends PutOneState> = State extends 'INITIAL'
  ? PutOneItemOperations
  : State extends 'ITEM_SET'
    ? PutOneOptionsOperations | PutOneExecOperations
    : never

export type ResolvePutOneChain<Base, State extends PutOneState> = Pick<
  Base,
  keyof Base & AllowedPutOneOperations<State>
>
