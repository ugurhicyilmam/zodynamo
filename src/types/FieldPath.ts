type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Function

type IsPlainObject<T> = T extends Primitive ? false : T extends readonly unknown[] ? false : T extends object ? true : false

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

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type PickByPaths<T, P extends string> = Prettify<
  UnionToIntersection<P extends unknown ? PickByPath<T, P> : never>
>
