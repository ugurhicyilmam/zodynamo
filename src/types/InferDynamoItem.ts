import { Entity } from '~/types/Entity'
import { InferEntity } from '~/types/InferEntity'

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type InferDynamoItem<T extends Entity<any, any, any, any, any>> = Prettify<
  InferEntity<T> &
    (T['table']['primaryIndex']['rangeKey'] extends string
      ? {
          [K in T['table']['primaryIndex']['hashKey']]: T['table']['fields'][K] extends 'number'
            ? number
            : string
        } & {
          [K in T['table']['primaryIndex']['rangeKey']]: T['table']['fields'][K] extends 'number'
            ? number
            : string
        }
      : {
          [K in T['table']['primaryIndex']['hashKey']]: T['table']['fields'][K] extends 'number'
            ? number
            : string
        }) &
    (NonNullable<T['entityType']> extends string
      ? T['table']['entityTypeField'] extends string
        ? { [K in T['table']['entityTypeField']]: NonNullable<T['entityType']> }
        : {}
      : {})
>
