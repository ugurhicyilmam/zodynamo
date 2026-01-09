import { Entity } from '../../types/Entity'
import { PickByPaths } from '../../types/FieldPath'
import { InferEntity } from '../../types/InferEntity'
import { Prettify } from '../../types/utils'

export type AnyEntity = Entity<any, any, any, any, any, any, any, any, any, any, any>

export type FindOneKey<E extends AnyEntity> = Prettify<
  (E['key']['hashKey']['calculate'] extends (item: infer Input) => any ? Input : never) &
    (E['key'] extends { rangeKey: { calculate: (item: infer Input) => any } } ? Input : unknown)
>

export type FindOneOptions = {
  consistent?: boolean
  capacity?: 'TOTAL' | 'INDEXES' | 'NONE'
  tableName?: string
}

export type FindOneStateObject = {
  status: 'INITIAL' | 'KEY_SET'
  key?: any
  options?: FindOneOptions
  attributes?: readonly string[]
  orThrow?: boolean
}

export type FindOneOutput<E extends AnyEntity, State extends FindOneStateObject> = State extends {
  orThrow: true
}
  ? {
      item: State extends { attributes: readonly (infer K extends string)[] }
        ? PickByPaths<InferEntity<E>, K>
        : InferEntity<E>
    }
  : {
      item:
        | (State extends { attributes: readonly (infer K extends string)[] }
            ? PickByPaths<InferEntity<E>, K>
            : InferEntity<E>)
        | undefined
    }

export type FindOneModifiers = 'options' | 'attributes' | 'orThrow' | 'exec'

export type ResolveFindOneChain<Base, State extends 'INITIAL' | 'KEY_SET'> = State extends 'INITIAL'
  ? Pick<Base, Extract<keyof Base, 'key'>>
  : Pick<Base, Extract<keyof Base, FindOneModifiers>>
