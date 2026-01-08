# Put Builder API

## 1. Builder Flow (Step-by-Step)

### Base Chain (Always Required)

```ts
new Put(entity).item(data)
```

---

### Options Step (Optional)

After defining the item:

- Optional:
  - `.options(PutOptions)`

---

### Execution

- Final step:
  - `.exec()`

---

## 2. Item Step

### `.item(data: InferEntityInput<E>)`

Provide the item data. The input type is inferred from the entity's schema, specifically handling:

- Implementation of `defaults` via `z.input` (making fields optional).
- handling of `transform` if defined (input type vs storage type).

---

## 3. Options Step

### `.options(opts: PutOptions)` _(Optional)_

```ts
interface PutOptions<E extends Entity<any, any, any, any, any, any, any, any, any>> {
  condition?: Condition<InferEntity<E>>
  returnValues?: 'NONE' | 'ALL_OLD' // default: 'NONE'
  returnValuesOnConditionFalse?: 'NONE' | 'ALL_OLD' // default: 'NONE'
  metrics?: 'NONE' | 'SIZE' // default: 'NONE'
  capacity?: 'NONE' | 'TOTAL' | 'INDEXES' // default: 'NONE'
  tableName?: string
}
```

#### Option Details

- **condition**: A condition that must be satisfied for the write to succeed. Uses the same `Condition` type as Query/Scan.
- **returnValues**: 'ALL_OLD' returns the item attributes as they appeared before the update.
- **returnValuesOnConditionFalse**: 'ALL_OLD' returns the item attributes if the condition fails (useful for optimistic locking checks).
- **metrics**: 'SIZE' returns item collection metrics.
- **capacity**: Return consumed capacity details.
- **tableName**: Override the table name (e.g., for multi-tenancy).

---

## 4. Execution

### `.exec()`

Executes the `PutItem` command.

**Returns:**

- Promise resolving to `PutItemOutput`.
- If `returnValues` is 'ALL_OLD', the result includes `attributes` containing the old item.
