# Query Builder API

## 1. Builder Flow (Step-by-Step)

### Base Chain (Always Required)

```ts
new Query()
  .entity(SomeEntity)
  .(primary | lsi | gsi)()
  .(partitionFrom | partitionValue)()
```

---

### Range Step (Conditional)

- **If the selected index defines a range key** → one of the following **must** be called:
  - `.range(...)`
  - `.rangeFrom(...)`
  - `.rangeNoCondition()`

- **If the selected index does NOT define a range key** → this step is skipped automatically.

---

### Options & Output Step

After the range step (or immediately if skipped):

- Optional:
  - `.options(QueryOptions)`

- Then choose **exactly one** output mode:
  - `.raw()`
  - `.select(paths)`
  - `.count()`

- Final step:
  - `.exec()`

---

## 2. Partition Step

### `.partitionValue(value)`

Provide the partition key value directly.

### `.partitionFrom(args)`

Compute the partition key automatically from provided fields.

---

## 3. Range Step (Only if Range Key Exists)

### `.range(options: RangeOptions)`

Provide an explicit range condition.

### `.rangeFrom(args)`

Compute the range key from fields used to generate the range key.

### `.rangeNoCondition()`

Proceed without defining any range condition.

---

### RangeOptions

Exactly **one** operator must be specified.

- `eq: T`
- `gt: T`
- `gte: T`
- `lt: T`
- `lte: T`
- `between: [T, T]`
- `beginsWith: string` _(only when range key type is string)_

Where `T` matches the range key type (`string | number | boolean`).

---

## 4. Options Step

### `.options(opts: QueryOptions)` _(Optional)_

```ts
interface QueryOptions {
  consistent?: boolean // default: false (primary | lsi only)
  tableName?: string
  limit?: number // integer >= 1
  order?: 'asc' | 'desc' // default: 'asc'
  filter?: Condition
  startKey?: DynamoKey
}
```

---

## 5. Output Modes (Choose Exactly One)

### `.raw()`

Return raw query results.

### `.select(paths: Path[])`

Select specific entity fields.

```ts
type Path = string[]
```

### `.count()`

Return count-only result.

---

## 6. Execution

### `.exec()`

Executes the query. Must be the final call in the chain.

---

## 7. Filter Conditions

### Condition Shape

Each condition targets either:

- `attr: string` – logical entity field
- `rawAttr: string` – internal attribute path

And defines **exactly one** operator.

---

### Value Operators

- `eq: scalar`
- `ne: scalar`
- `in: scalar[]`
- `contains: scalar`
- `exists: boolean`
- `type: 'string' | 'number' | 'boolean' | 'binary' | 'list' | 'map' | 'null' | 'number_set' | 'string_set' | 'binary_set'`

`scalar = boolean | number | string | binary`

---

### Range Operators

- `gte: sortable`
- `gt: sortable`
- `lte: sortable`
- `lt: sortable`
- `between: [sortable, sortable]`
- `beginsWith: sortable`

`sortable = string | number | binary`

---

### Logical Composition

```ts
{ and: Condition[] }
{ or: Condition[] }
```

### Examples

```ts
{ attr: 'name', eq: 'foo' }
{ rawAttr: 'n', eq: 'foo' }
{ attr: 'age', gte: 18 }

{ or: [{ attr: 'age', gte: 18 }, { attr: 'age', lte: 18 }] }
{ and: [{ attr: 'age', gte: 18 }, { attr: 'age', lte: 18 }] }
```
