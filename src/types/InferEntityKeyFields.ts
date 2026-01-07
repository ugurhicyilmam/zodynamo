import { Entity } from './Entity'
import { PickByPaths } from './FieldPath'
import { InferEntity } from './InferEntity'
import { Prettify } from './utils'

type PickByPathsOrEmpty<T, P> = [P] extends [never] ? {} : PickByPaths<T, Extract<P, string>>

export type InferHashKeyFields<T extends Entity<any, any, any, any, any, any, any>> = Prettify<
  PickByPathsOrEmpty<InferEntity<T>, T['key']['hashKey']['fields'][number]>
>

export type InferRangeKeyFields<T extends Entity<any, any, any, any, any, any, any>> = Prettify<
  T['key'] extends { rangeKey: { fields: readonly unknown[] } }
    ? PickByPathsOrEmpty<InferEntity<T>, T['key']['rangeKey']['fields'][number]>
    : {}
>

export type InferKeyFields<T extends Entity<any, any, any, any, any, any, any>> = Prettify<
  InferHashKeyFields<T> & InferRangeKeyFields<T>
>
