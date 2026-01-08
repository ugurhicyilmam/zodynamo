import { Condition } from '~/actions/query/types'
import { Entity } from '~/types/Entity'
import { InferEntity } from '~/types/InferEntity'

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
