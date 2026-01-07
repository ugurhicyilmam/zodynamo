import z from 'zod'

import { Entity } from '~/types/Entity'

export type InferEntity<T extends Entity<any, any, any, any, any>> = z.infer<T['schema']>
