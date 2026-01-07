import { IsPlainObject, Prettify, UnionToIntersection } from './utils'

export type FieldPath<T> = T extends object
  ? {
      [K in keyof T & string]: IsPlainObject<NonNullable<T[K]>> extends true
        ? K | `${K}.${FieldPath<NonNullable<T[K]>>}`
        : K
    }[keyof T & string]
  : never

type Prop<T, K extends keyof T, V> = {} extends Pick<T, K> ? { [P in K]?: V } : { [P in K]: V }

export type PickByPath<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? Prop<T, Head, PickByPath<NonNullable<T[Head]>, Rest>>
    : never
  : P extends keyof T
    ? Prop<T, P, T[P]>
    : never

export type PickByPaths<T, P extends string> = Prettify<
  UnionToIntersection<P extends unknown ? PickByPath<T, P> : never>
>
