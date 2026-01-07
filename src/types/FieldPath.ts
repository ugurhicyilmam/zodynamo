import { IsPlainObject, Prettify, UnionToIntersection } from './utils'

/**
 * Extracts all valid dot-notation paths from an object type.
 *
 * Recursively traverses the object structure to generate string literal types
 * representing valid field paths, including nested paths using dot notation.
 *
 * @template T - The object type to extract paths from
 *
 * @example
 * ```ts
 * type User = { id: string; address: { street: string; city: string } }
 * type Paths = FieldPath<User>
 * // Result: "id" | "address" | "address.street" | "address.city"
 * ```
 */
export type FieldPath<T> = T extends object
  ? {
      [K in keyof T & string]: IsPlainObject<NonNullable<T[K]>> extends true
        ? K | `${K}.${FieldPath<NonNullable<T[K]>>}`
        : K
    }[keyof T & string]
  : never

/**
 * Internal helper that creates a property with appropriate optionality.
 *
 * If the property is optional in the source type, it remains optional.
 * Otherwise it becomes required.
 *
 * @internal
 */
type Prop<T, K extends keyof T, V> = {} extends Pick<T, K> ? { [P in K]?: V } : { [P in K]: V }

/**
 * Extracts a subset of an object type based on a single dot-notation path.
 *
 * Preserves the nested structure leading to the specified field,
 * maintaining proper optionality at each level.
 *
 * @template T - The source object type
 * @template P - The dot-notation path string
 *
 * @example
 * ```ts
 * type User = { id: string; address: { street: string } }
 * type AddressStreet = PickByPath<User, "address.street">
 * // Result: { address: { street: string } }
 * ```
 */
export type PickByPath<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? Prop<T, Head, PickByPath<NonNullable<T[Head]>, Rest>>
    : never
  : P extends keyof T
    ? Prop<T, P, T[P]>
    : never

/**
 * Extracts a subset of an object type based on multiple dot-notation paths.
 *
 * Merges multiple path selections into a single type, preserving the
 * nested structure for all specified paths.
 *
 * @template T - The source object type
 * @template P - Union of dot-notation path strings
 *
 * @example
 * ```ts
 * type User = { id: string; name: string; address: { street: string } }
 * type Selected = PickByPaths<User, "id" | "address.street">
 * // Result: { id: string; address: { street: string } }
 * ```
 */
export type PickByPaths<T, P extends string> = Prettify<
  UnionToIntersection<P extends unknown ? PickByPath<T, P> : never>
>
