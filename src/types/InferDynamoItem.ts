import { Entity } from '~/types/Entity'
import { InferEntity } from '~/types/InferEntity'
import { Prettify, ResolveDynamoType } from '~/types/utils'

export type InferDynamoItem<T extends Entity<any, any, any, any, any, any, any>> = Prettify<
  InferEntity<T> &
    (T['table']['primaryIndex']['rangeKey'] extends string
      ? {
          [K in T['table']['primaryIndex']['hashKey']]: ResolveDynamoType<T['table']['fields'][K]>
        } & {
          [K in T['table']['primaryIndex']['rangeKey']]: ResolveDynamoType<T['table']['fields'][K]>
        }
      : {
          [K in T['table']['primaryIndex']['hashKey']]: ResolveDynamoType<T['table']['fields'][K]>
        }) &
    (NonNullable<T['entityType']> extends string
      ? T['table']['entityTypeField'] extends string
        ? { [K in T['table']['entityTypeField']]: NonNullable<T['entityType']> }
        : {}
      : {})
>
