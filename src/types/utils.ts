/**
 * Placeholder for now. This is intentionally a pass-through type so the API can evolve later (for example, to support lazy or computed inputs).
 */
export type Input<T> = T

export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Function

export type IsPlainObject<T> = T extends Primitive
  ? false
  : T extends readonly unknown[]
    ? false
    : T extends object
      ? true
      : false

export type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
  arg: infer I
) => void
  ? I
  : never

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type ResolveDynamoType<T extends 'string' | 'number' | 'binary'> = T extends 'number'
  ? number
  : string
