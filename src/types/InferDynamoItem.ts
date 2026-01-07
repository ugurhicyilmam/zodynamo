import { Entity } from '~/types/Entity'
import { InferEntity } from '~/types/InferEntity'
import { Prettify, ResolveDynamoType, UnionToIntersection } from '~/types/utils'

type TableGlobalIndexes<T extends Entity<any, any, any, any, any, any, any, any, any>> = Extract<
  T['table']['globalIndexes'],
  Record<string, any>
>

type TableLocalIndexes<T extends Entity<any, any, any, any, any, any, any, any, any>> = Extract<
  T['table']['localIndexes'],
  Record<string, any>
>

type EntityGlobalIndexes<T extends Entity<any, any, any, any, any, any, any, any, any>> = Extract<
  T['globalIndexes'],
  Record<string, any>
>

type EntityLocalIndexes<T extends Entity<any, any, any, any, any, any, any, any, any>> = Extract<
  T['localIndexes'],
  Record<string, any>
>

type GlobalIndexKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends keyof EntityGlobalIndexes<T>
> =
  TableGlobalIndexes<T> extends Record<string, any>
    ? {
        [K in Extract<
          TableGlobalIndexes<T>[Extract<TIndexName, keyof TableGlobalIndexes<T>>]['hashKey'],
          string
        >]: ResolveDynamoType<T['table']['fields'][K]>
      } & (TableGlobalIndexes<T>[Extract<TIndexName, keyof TableGlobalIndexes<T>>]['rangeKey'] extends string
        ? {
            [K in Extract<
              NonNullable<
                TableGlobalIndexes<T>[Extract<TIndexName, keyof TableGlobalIndexes<T>>]['rangeKey']
              >,
              string
            >]: ResolveDynamoType<T['table']['fields'][K]>
          }
        : {})
    : {}

type LocalIndexKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends keyof EntityLocalIndexes<T>
> =
  TableLocalIndexes<T> extends Record<string, any>
    ? {
        [K in Extract<
          TableLocalIndexes<T>[Extract<TIndexName, keyof TableLocalIndexes<T>>]['rangeKey'],
          string
        >]: ResolveDynamoType<T['table']['fields'][K]>
      }
    : {}

type InferGlobalIndexItemFields<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  [keyof EntityGlobalIndexes<T>] extends [never]
    ? {}
    : UnionToIntersection<
        {
          [K in keyof EntityGlobalIndexes<T>]: GlobalIndexKeyFields<T, K>
        }[keyof EntityGlobalIndexes<T>]
      >

type InferLocalIndexItemFields<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  [keyof EntityLocalIndexes<T>] extends [never]
    ? {}
    : UnionToIntersection<
        {
          [K in keyof EntityLocalIndexes<T>]: LocalIndexKeyFields<T, K>
        }[keyof EntityLocalIndexes<T>]
      >

/**
 * Infers the complete DynamoDB item type for an Entity.
 *
 * This type combines three components:
 * 1. The base entity schema fields (from Zod schema)
 * 2. The DynamoDB primary key fields (pk/sk or custom names)
 * 3. The entity type discriminator field (if configured)
 *
 * Use this when you need the full shape of what's actually stored in
 * the DynamoDB table, including all internal key fields.
 *
 * @template T - The Entity type to infer from
 *
 * @example
 * ```ts
 * const userEntity = defineEntity(table, {
 *   schema: z.object({ id: z.string(), name: z.string() }),
 *   key: { hashKey: { fields: ['id'], calculate: ... } },
 *   entityType: 'USER'
 * })
 *
 * type UserItem = InferDynamoItem<typeof userEntity>
 * // Result: { id: string; name: string; pk: string; sk?: string; type?: 'USER' }
 * ```
 */
export type InferDynamoItem<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  Prettify<
    InferEntity<T> &
    InferGlobalIndexItemFields<T> &
    InferLocalIndexItemFields<T> &
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
      : {}) &
    (Exclude<T['ttl'], undefined> extends (domain: any) => infer R
      ? T['table']['ttl'] extends keyof T['table']['fields']
        ? undefined extends R
          ? {
              [K in T['table']['ttl']]?: R extends number ? number : R
            }
          : {
              [K in T['table']['ttl']]: R extends number ? number : R
            }
        : {}
      : {})
  >
