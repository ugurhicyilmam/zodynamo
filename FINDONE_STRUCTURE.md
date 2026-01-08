# FindOne Action Structure

## Overview

The `FindOne` action allows retrieving a single item from the DynamoDB table using its primary key. It supports consistency options, attribute selection, and capacity consumption tracking. It requires strict type safety for keys and options.

## Interface

```typescript
const { item } = await Entity.build(Table)
  .findOne({ pk: 'user_123', sk: 'profile' })
  .options({ consistent: true })
  .attributes(['name', 'email'])
  .exec()
```

## Methods

### `findOne(key)`

- **Arguments**:
  - `key`: An object containing the primary key attributes (Hash Key and Range Key if applicable).
- **Behavior**: Initializes the `FindOne` action with the specified key.
- **Type Safety**: The `key` argument must match the entity's primary key structure exactly.

### `options(opts)`

- **Arguments**:
  - `opts`: An object containing the following optional properties:
    - `consistent` (boolean): Whether to use strongly consistent reads. Default: `false`.
    - `capacity` ('NONE' | 'TOTAL' | 'INDEXES'): Level of throughput consumption detail. Default: `'NONE'`.
    - `tableName` (string): Overrides the table name.
- **Behavior**: Configures the read operation options.

### `attributes(attributes)`

- **Arguments**:
  - `attributes`: An array of strings representing the paths of attributes to retrieve.
- **Behavior**: Specifies strict projection of attributes to return.
- **Type Safety**: The array elements must be valid paths of the entity's schema.

### `orThrow()`

- **Behavior**: Modifies the execution to throw an error if the item is not found.
- **Return**: Changes the return type of `exec()` to exclude `undefined` for the item.

### `exec()`

- **Behavior**: Executes the `GetItem` command.
- **Return**: A promise resolving to an object containing the `item` (typed as the Entity or a partial projection) and metadata (e.g., `consumedCapacity`).

## Type Definitions

### `FindOneOptions`

```typescript
interface FindOneOptions {
  consistent?: boolean
  capacity?: 'NONE' | 'TOTAL' | 'INDEXES'
  tableName?: string
}
```

### `FindOneState`

Strict typing for the state machine to prevent invalid method chaining.

## Modifiers

- **orThrow**: Ensures that the result is never null/undefined. If the item is missing, it throws a predefined error.

## Usage Example

```typescript
// Basic retrieval
const result = await User.findOne({ id: '123' }).exec()
if (result.item) {
  console.log(result.item.name)
}

// With options and projection
const { item } = await User.findOne({ id: '123' })
  .options({ consistent: true })
  .attributes(['email'])
  .orThrow()
  .exec()

// item is typed as { email: string }, and is guaranteed to exist.
```
