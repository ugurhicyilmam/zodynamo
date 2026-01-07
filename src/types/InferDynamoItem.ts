import { Entity } from '~/types/Entity'
import { InferEntity } from '~/types/InferEntity'
import { Prettify, ResolveDynamoType } from '~/types/utils'

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
    (Exclude<T['ttl'], undefined> extends (domain: any) => number | undefined
      ? T['table']['ttl'] extends keyof T['table']['fields']
        ? { [K in T['table']['ttl']]?: ResolveDynamoType<T['table']['fields'][K]> }
        : {}
      : {})
  >
