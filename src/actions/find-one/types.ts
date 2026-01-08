import { Simplify } from 'type-fest'

import { Entity } from '../../types/Entity'
import { EntityKey } from '../../types/EntityKey'
import { PickByPaths } from '../../types/FieldPath'
import { InferEntity } from '../../types/InferEntity'

export interface FindOneOptions {
  consistent?: boolean
  capacity?: 'NONE' | 'TOTAL' | 'INDEXES'
  tableName?: string
}

export interface FindOneState {
  attributes?: string[]
  options?: FindOneOptions
  orThrow?: boolean
}

export type FindOneOutput<
  E extends Entity<any, any, any, any, any, any, any, any, any, any, any>,
  State extends FindOneState
> = {
  item: State['orThrow'] extends true
    ? ResolveFindOneItem<E, State>
    : ResolveFindOneItem<E, State> | undefined
  // TODO: Add capacity and other metadata if needed based on options
  consumedCapacity?: any
}

export type ResolveFindOneItem<
  E extends Entity<any, any, any, any, any, any, any, any, any, any, any>,
  State extends FindOneState
> = State['attributes'] extends readonly string[]
  ? Simplify<PickByPaths<InferEntity<E>, State['attributes'][number]>>
  : InferEntity<E>

export type FindOneKey<E extends Entity<any, any, any, any, any, any, any, any, any, any, any>> =
  Simplify<EntityKey<E['table']>> // TODO: Verify if EntityKey is sufficient or if we need more logic from Entity definition

// Helper type to resolve the chain based on state changes (not strictly needed if we just return new instances, but good for tracking)
