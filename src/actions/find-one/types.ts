import { Simplify } from 'type-fest'

import { Entity } from '../../types/Entity'
import { EntityKey } from '../../types/EntityKey'
import { PickByPaths } from '../../types/FieldPath'
import { InferEntity } from '../../types/InferEntity'

export type AnyEntity = Entity<any, any, any, any, any, any, any, any, any, any, any>

export interface FindOneOptions {
  consistent?: boolean
  capacity?: 'NONE' | 'TOTAL' | 'INDEXES'
  tableName?: string
}

export type FindOneState = 'INITIAL' | 'KEY_SET'

export interface FindOneStateData {
  attributes?: readonly string[]
  options?: FindOneOptions
  orThrow?: boolean
  key?: any
}

export type FindOneStateObject = {
  status: 'INITIAL' | 'KEY_SET'
} & FindOneStateData

export type FindOneOutput<E extends AnyEntity, State extends FindOneStateObject> = {
  item: State['orThrow'] extends true
    ? ResolveFindOneItem<E, State>
    : ResolveFindOneItem<E, State> | undefined
  consumedCapacity?: any
}

export type ResolveFindOneItem<E extends AnyEntity, State> = State extends {
  attributes: readonly string[]
}
  ? Simplify<PickByPaths<InferEntity<E>, State['attributes'][number]>>
  : InferEntity<E>

export type FindOneKey<E extends AnyEntity> = Simplify<EntityKey<E['table']>>

export type FindOneModifiers = 'options' | 'attributes' | 'orThrow' | 'exec'

export type ResolveFindOneChain<Base, Status extends 'KEY_SET'> = Pick<
  Base,
  keyof Base & FindOneModifiers
>
