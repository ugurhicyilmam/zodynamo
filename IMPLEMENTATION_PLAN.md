# Zodynamo Implementation Plan (Types → Type Validations → Runtime)

This document captures the planned implementation for Zodynamo’s **typed DSL and runtime layer**: define types first, validate them via compile-time tests, then implement `DynamoDBService` and the first command(s), starting with `Query`.

The current type system (table/entity/index typing + `InferEntity` / `InferDynamoItem`) is treated as the foundation. **Type safety and inference are hard requirements**: APIs must allow/disallow chains at compile time and infer correct outputs. Runtime code should preserve **strict typing**, avoid `any`, and remain consistent with the service/action architecture described in `AGENTS.md`.

---

## Goals

- Provide a **strongly typed, ergonomic DSL** for DynamoDB operations.
- Keep runtime code **small and composable**; push complex typing into `src/types/`.
- Support **single-table and multi-table designs** with:
  - explicit mapping between external (schema) and internal (DynamoDB item) shapes
  - index-aware querying (primary / GSI / LSI)
- Start with `Query` and then expand to `Get/Find`, `Put`, `Update`, `Delete`, `BatchGet/BatchWrite` later.

## Non-goals (for the first iteration)

- Table/index creation or migrations.
- Full expression builder completeness (every DynamoDB operator). Start with a minimal but practical set.
- Transaction APIs (`TransactWriteItems`, `TransactGetItems`) until core commands stabilize.

---

## Hard Requirements

- No `any` in new code (use generics + helper types).
- The DSL must compile-time enforce validity (index constraints, required steps before `exec`, etc.).
- The DSL must infer correct outputs (entity vs raw vs select vs count).
- Every DSL rule must be validated in `tests/type-validations/*` before runtime implementation.

---

## Step-by-step Plan (TODOs)

### Phase 1 — Types (Query DSL surface + helper types)

- [ ] Add query helper types (index selection, key/value resolution, output modes).
- [ ] Define multi-class Query surface types (no runtime behavior yet):
  - [ ] `Query` entry → `.entity(entity)` selector
  - [ ] `PrimaryQuery`
  - [ ] `GsiQuery`
  - [ ] `LsiQuery`
- [ ] Encode compile-time constraints:
  - [ ] `.consistentRead()` only on primary + LSI (never on GSI)
  - [ ] sort-key methods only when the chosen index has a range key
  - [ ] `.raw()` switches output to `InferDynamoItem`
  - [ ] `.select([...])` narrows output to `Pick<InferEntity, ...>`
  - [ ] `.count()` returns `number`
  - [ ] `.startKey(...)` accepts correctly typed keys
- [ ] Decide and encode “minimum required chain before exec” (e.g. partition required).

### Phase 2 — Type Validations (compile-time tests only)

- [ ] Add `tests/type-validations/Query.test.ts`.
- [ ] Add “allowed chain” tests:
  - [ ] primary: `.partitionFrom(...)` + optional sort ops + `.exec()`
  - [ ] GSI: `.partitionValue(...)` + optional sort ops + `.exec()`
  - [ ] LSI: `.partitionFrom(...)` + sort ops + `.exec()`
- [ ] Add “disallowed chain” tests (`@ts-expect-error`):
  - [ ] `.consistentRead()` on GSI
  - [ ] sort-key ops on indexes without a sort key
  - [ ] `.exec()` before partition is set (if required)
- [ ] Add return-type assertions (`expectTypeOf`) for:
  - [ ] default entity-mode results
  - [ ] `.raw()` results
  - [ ] `.select()` results
  - [ ] `.count()` results
- [ ] Ensure existing type-validation suite remains green (no regressions).

### Phase 3 — Runtime Implementation

- [ ] Add `@aws-sdk/lib-dynamodb` dependency (DocumentClient + command input/output types).
- [ ] Implement `src/DynamoDBService.ts` (service context + `run(ActionClass)`).
- [ ] Implement query runtime classes (multi-class chain):
  - [ ] `src/actions/query/Query.ts` (entry + entity binding)
  - [ ] `src/actions/query/PrimaryQuery.ts`
  - [ ] `src/actions/query/GsiQuery.ts`
  - [ ] `src/actions/query/LsiQuery.ts`
- [ ] Implement shared query internals:
  - [ ] KeyConditionExpression builder: partition equals + basic sort ops (eq/begins_with/between)
  - [ ] pagination: `.startKey()` + optional `.execPage()`
  - [ ] projection + `.select()` and `.count()`
- [ ] Implement entity mapping utilities:
  - [ ] read decode: `transform.decode` else passthrough (default `validateReads: false`)
  - [ ] optional read validation: when `validateReads: true`, apply `schema.parse`
  - [ ] raw mode: return internal item as-is (typed)
- [ ] Update `src/index.ts` exports (service + actions + builders + types).

---

## Proposed Source Structure

Create/standardize these folders (under `src/`):

- `src/DynamoDBService.ts` — service runner that hosts shared config.
- `src/actions/` — runtime commands (Query first).
  - `src/actions/query/Query.ts` — entrypoint action.
  - `src/actions/query/PrimaryQuery.ts` — query builder for table primary index.
  - `src/actions/query/GsiQuery.ts` — query builder for GSIs.
  - `src/actions/query/LsiQuery.ts` — query builder for LSIs.
  - `src/actions/query/types.ts` — shared query-specific types.
- `src/utils/` — runtime utilities.
  - `src/utils/expressions/` — expression helpers (names/values maps, condition building).
  - `src/utils/entityMapping.ts` — encode/decode utilities based on `entity.transform` and zod schema.
- `src/index.ts` — public exports (service + actions + builders + types).

Notes:

- Keep action classes **small** and share expression/mapping utilities.
- Use multiple runtime classes for query flavors to keep APIs readable and to avoid overloading one mega-builder.

---

## Runtime Primitives

### DynamoDBService

`DynamoDBService` should:

- Accept a client in the constructor:
  - Prefer `DynamoDBDocumentClient` from `@aws-sdk/lib-dynamodb` for ergonomic marshalling.
- Provide `run(ActionClass)`:
  - `run(Query)` returns an action instance bound to the service context.
  - Action instance then becomes a builder (multi-class chain for Query).

Suggested minimal context:

- `dynamo` (DocumentClient)
- `defaults` (optional): `consistentRead`, `limit`, `logger`, `marshallOptions` (future)

### Action Base (Optional but recommended)

Introduce a tiny base:

- `ActionContext` type
- `abstract class Action { protected readonly ctx: ActionContext }`

This keeps constructors uniform and prepares for cross-cutting concerns (logging, tracing, retries) without changing every action signature.

---

## Entity Mapping Rules (External <-> Internal)

We will apply a consistent decode/encode strategy:

- **Writes** (`Put`, `Update` later):
  1. validate external input via `entity.schema.parse`
  2. compute generated fields (pk/sk, gsi keys, lsi keys, ttl, entityType discriminator)
  3. if `entity.transform.encode` exists, use it; otherwise store `{...external, ...generated}`
- **Reads** (`Query`, `Get`):
  - If `entity.transform.decode` exists, use it.
  - Otherwise:
    - by default, **do not validate** (`validateReads: false`) and return items as the inferred external type.
    - when `validateReads: true`, parse using zod schema (`entity.schema.parse`) and return **external** shape only.
  - Provide an opt-in `.raw()` mode to return internal items (including key fields) when needed.

This aligns with the “separation of shapes” principle and keeps default results application-friendly.

---

## Query: Multi-Class Builder Design

### Why multi-class

- Keeps runtime logic and public API readable: primary/GSI/LSI differences are explicit.
- Allows us to enforce constraints (e.g. consistent reads) at the API layer clearly.
- Still supports shared internals via common helper functions and base types.

### High-level API

```ts
service.run(Query).entity(User).primary().partitionFrom({ id: '1' }).exec()
service.run(Query).entity(User).gsi('GSI1').partitionValue('abc').exec()
service.run(Query).entity(User).lsi('LSI1').partitionFrom({ id: '1' }).sortBeginsWith('X').exec()
```

### Class chain

1. `Query` (entry action)
   - `.entity(entity)` → returns an entity-bound selector object:
     - `.primary()` → `PrimaryQuery`
     - `.gsi(name)` → `GsiQuery`
     - `.lsi(name)` → `LsiQuery`

2. `PrimaryQuery`
   - Supports:
     - `.partitionFrom(domain)` (compute hash key from entity.key.hashKey)
     - `.partitionValue(value)` (escape hatch, typed to primary hash key value)
     - Sort-key ops **only if table has a sort key**:
       - `.sortEquals(value)`
       - `.sortBeginsWith(prefix)`
       - `.sortBetween(min, max)`
     - `.filter(...)` (non-key filters, phased)
     - `.limit(n)`, `.forward(bool)`, `.startKey(key)`
     - `.consistentRead()` (allowed)
     - `.selectAll()` / `.select(keys)` / `.count()`
     - `.raw()` to switch output to internal items
     - `.exec()`

3. `GsiQuery`
   - Same as primary except:
     - `.consistentRead()` is **not available** (GSI does not support consistent reads).
     - Key types depend on the chosen GSI name.

4. `LsiQuery`
   - Similar to primary, but:
     - Hash key is the table primary hash key (same as primary).
     - Sort key operations are based on the chosen LSI range key.
     - `.consistentRead()` is available (LSI supports consistent reads).

### Query result typing

Default:

- `Promise<Array<InferEntity<typeof entity>>>`

Options:

- `.raw()` → `Promise<Array<InferDynamoItem<typeof entity>>>`
- `.select(['a','b'] as const)` → `Promise<Array<Pick<InferEntity<typeof entity>, 'a' | 'b'>>>`
- `.count()` → `Promise<number>`

### Minimal expression coverage (v1)

KeyCondition (primary/GSI/LSI):

- partition key: equals only
- sort key:
  - equals
  - begins_with
  - between
  - `>=`, `>`, `<=`, `<` (optional in v1)

Filters (optional in v1, but plan for it):

- equals / exists
- `and` composition

### Pagination and exclusive start key

Expose:

- `.startKey(key)` where `key` is typed (internal key shape; at least pk/sk)
- `.execPage()` variant (optional v1):
  - returns `{ items, lastKey }`
  - useful for building pagination loops without leaking DynamoDB response types.

### Index name and table name

- Index name derives from the selected builder (`gsi(name)` or `lsi(name)`).
- Table name is always `entity.table.name`.

---

## Required New Types (in `src/types/` or `src/actions/query/types.ts`)

To keep builder code readable, introduce small helper types:

- `EntityAny` alias for `Entity<any, ...>` (avoids repeating long generic lists).
- `QueryIndexSelector` union:
  - `{ kind: 'primary' } | { kind: 'gsi'; name: ... } | { kind: 'lsi'; name: ... }`
- `QueryOutputMode`:
  - `'entity' | 'raw' | { select: readonly (keyof InferEntity<E>)[] } | 'count'`
- `QueryKeyTypes`:
  - resolves partition/sort key field names and value types based on selector.

Keep these helpers pure-types; runtime code should not need to understand conditional typing details.

---

## Implementation Notes

The authoritative roadmap is the “Step-by-step Plan (TODOs)” section above.

---

## Decisions / Open Questions

- Do we officially depend on `@aws-sdk/lib-dynamodb` now? Yes.
- Do we want `.partitionFrom(domain)` for GSIs/LSIs in v1?
  - Primary is easy (your entity primary key stores `fields` as const generic).
  - GSI/LSI field-path preservation may need additional typing work; otherwise provide `.partitionValue()` / `.sortValue()` first. That’ll come next.
- How strict should runtime validation be on reads? It’s an option; by default no (`validateReads: false`).
  - `schema.parse` is safe but can be expensive; keep it opt-in.
