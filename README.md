# Zodynamo

![license](https://img.shields.io/badge/license-MIT-blue)
![npm](https://img.shields.io/npm/v/zodynamo)
![downloads](https://img.shields.io/npm/dm/zodynamo)

> ⚠️ **Note**: This project is currently in development. There are no official releases available yet.

Zodynamo is a type-safe DynamoDB modeling and access layer built on top of
`@aws-sdk/lib-dynamodb` and `zod`. It helps you define tables, entities, keys,
and indexes with strong TypeScript inference, then run common DynamoDB
operations through a small, composable API.

## Summary

Zodynamo focuses on three ideas:

1. **Model DynamoDB data with strong types** by defining tables and entities.
2. **Map external objects to internal DynamoDB items** (and back) with optional
   transformation logic.
3. **Execute common operations** (find, query, put, batch, transaction) with
   an ergonomic API powered by the AWS SDK v3 DocumentClient.

## Features

- Strongly typed table and entity definitions.
- Schema support via `zod`.
- Deterministic primary key generation from entity fields.
- Local and global index mapping with override helpers.
- Optional TTL mapping per entity.
- Clean internal <-> external mapping (`mapToInternal` / `mapToExternal`).
- Action classes for find, query, put, batch write, and transactions.
- Raw variants for internal item access when you want full control.

## Installation

```bash
npm install zodynamo @aws-sdk/lib-dynamodb zod
# or
yarn add zodynamo @aws-sdk/lib-dynamodb zod
```

Zodynamo uses utilities from `@infra-go/utils` for batching and backoff in
`BatchWrite`/`BatchWriteRaw`. If you plan to use those actions, ensure the
dependency is available.

## Quick Start

### 1) Define a table

```ts
import { defineTable, defineGlobalIndex, defineLocalIndex } from 'zodynamo';

export const DataTable = defineTable()({
  name: 'Data',
  key: {
    hashKey: 'pk',
    sortKey: 'sk'
  },
  entityTypeField: 'ety',
  timeToLiveField: 'ttl',
  globalIndexes: {
    'gsi-1': defineGlobalIndex({ key: 'gsi-1-pk', type: 'string' }),
    'gsi-2': defineGlobalIndex(
      { key: 'gsi-2-pk', type: 'string' },
      { key: 'gsi-2-sk', type: 'string' }
    )
  },
  secondaryIndexes: {
    'lsi-1': defineLocalIndex({ key: 'lsi-1-sk', type: 'string' })
  }
});
```

### 2) Define an entity with keys and indexes

```ts
import { z } from 'zod';
import {
  asGlobalIndex,
  asLocalIndex,
  defineEntity,
  defineKey
} from 'zodynamo';

export const UserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  gender: z.enum(['Male', 'Female']),
  provider: z.object({
    id: z.string(),
    customerId: z.string(),
    providerName: z.string()
  }),
  isBlocked: z.boolean()
});

export const UserEntity = defineEntity(DataTable)
  .schema(UserSchema)
  .key({
    hash: defineKey([], () => 'users'),
    sort: defineKey(['id'], (entity) => `user#${entity.id}`)
  })
  .indexes({
    lastName: asLocalIndex('lsi-1', (v) => v),
    provider: {
      __fields: {
        providerName: asGlobalIndex('hash', 'gsi-2', (v) => v),
        customerId: asGlobalIndex('sort', 'gsi-2', (v) => v)
      }
    },
    email: asGlobalIndex('hash', 'gsi-1', (value) => value.toUpperCase())
  })
  .timeToLive((entity) => (entity.isBlocked ? 0 : undefined))
  .map({
    toInternal: (entity) => ({
      fn: entity.firstName,
      ge: entity.gender === 'Male' ? 1 : 2,
      bl: entity.isBlocked ? true : undefined,
      p: { id: entity.provider.id }
    }),
    toExternal: (internal) => ({
      id: internal.sk.split('#')[1],
      firstName: internal.fn,
      lastName: internal['lsi-1-sk'],
      gender: internal.ge === 1 ? 'Male' : 'Female',
      isBlocked: Boolean(internal.bl),
      provider: {
        id: internal.p.id,
        customerId: internal['gsi-2-sk'],
        providerName: internal['gsi-2-pk']
      },
      email: internal['gsi-1-pk'].toLowerCase()
    })
  })
  .options({
    name: 'u'
  });
```

### 3) Use the service and actions

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBService, Find, Put, Query } from 'zodynamo';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const service = new DynamoDBService({ dynamo: ddb });

const user = await service.run(Find).one(UserEntity, { id: '335' });
const users = await service.run(Find).all(UserEntity, { args: { id: '335' } });

await service.run(Put).one(UserEntity, {
  id: '335',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  gender: 'Male',
  provider: {
    id: '3',
    customerId: 'G-123',
    providerName: 'Google'
  },
  isBlocked: false
});

const byEmail = await service.run(Query)
  .for(UserEntity.table, [UserEntity])
  .globalIndex('gsi-1', 'JOHN.DOE@EXAMPLE.COM')
  .exec();
```

## Core Concepts

### Table

Tables are created via `defineTable()`. You can specify:

- Primary key (hash + optional sort).
- Entity type discriminator field.
- Time-to-live (TTL) field.
- Global secondary indexes (GSIs).
- Local secondary indexes (LSIs).

The return type of `defineTable()` drives type inference for entities, index
names, and index key types.

### Entity

Entities describe a logical record stored in a table:

- **Schema**: A `zod` schema defines the external shape.
- **Key configuration**: Use `defineKey` for hash/sort keys derived from
  entity fields.
- **Indexes**: Map entity fields to GSI/LSI keys.
- **Mapping**: Optional `map.toInternal` and `map.toExternal` to transform
  between external data and internal DynamoDB shape.
- **TTL**: Optional per-entity TTL function.

### Key Helpers

`defineKey(fields, calculate)` creates a typed key definition that only
receives the fields you specify. This helps keep key generation explicit and
safe.

### Index Overrides

Use index overrides to map entity fields into GSI/LSI keys, with optional
transformations:

- `asGlobalIndex('hash' | 'sort', indexName, transform)`
- `asLocalIndex(indexName, transform)`

This supports nested index mapping via `__fields` when your schema contains
objects.

### Mapping

Zodynamo always stores:

- The table primary key fields.
- The `entityTypeField` (discriminator).
- Optional TTL.
- Any mapped index fields.
- Your mapped internal shape (if `map.toInternal` exists), otherwise the
  external object fields.

`mapToInternal` and `mapToExternal` handle these transformations. If no custom
mapping is provided, Zodynamo will drop internal key/index fields from the
returned object.

## Actions

All operations are modeled as action classes. The typical entry point is:

```ts
const service = new DynamoDBService({ dynamo });
const find = service.run(Find);
```

### Find

- `one(entity, args)` fetches a single item by primary key.
- `oneOrThrow(entity, args)` throws if not found.
- `all(entity, input)` queries by hash key, with optional range.
- `byGlobalIndex(entity, indexName, args)` queries a GSI.
- `byLocalIndex(entity, indexName, args)` queries an LSI.

```ts
await service.run(Find).one(UserEntity, { id: '335' });

await service.run(Find).all(UserEntity, {
  args: { id: '335' },
  range: { beginsWith: 'user#' }
});

await service.run(Find).byGlobalIndex(UserEntity, 'gsi-2', {
  provider: { providerName: 'Google', customerId: 'G-123' }
});

await service.run(Find).byLocalIndex(UserEntity, 'lsi-1', {
  id: '335',
  lastName: 'Doe'
});
```

### Query

The `Query` action is a fluent builder around DynamoDB Query operations:

```ts
await service.run(Query)
  .for(UserEntity.table, [UserEntity])
  .hash('users')
  .sort({ beginsWith: 'user#' })
  .exec();
```

You can also query by global and local indexes with the same chain.

### Put

```ts
await service.run(Put).one(UserEntity, user);
await service.run(Put).oneOrThrow(UserEntity, user);
await service.run(Put).all(UserEntity, [user1, user2]);
```

### BatchWrite

Batch operations use DynamoDB BatchWrite with chunking and exponential backoff.

```ts
await service
  .run(BatchWrite)
  .put(UserEntity, user)
  .delete(UserEntity, { id: '335' })
  .run();
```

### TransactWrite

```ts
await service
  .run(TransactWrite)
  .put(UserEntity, user)
  .delete(UserEntity, { id: '335' })
  .execOrFail();
```

### Raw Actions

`BatchWriteRaw`, `QueryRaw`, and `TransactWriteRaw` operate on internal item
shapes rather than external entity objects. Use these when you want to bypass
mapping and work directly with DynamoDB keys and attributes.

## Type Utilities

Zodynamo exposes a handful of type helpers:

- `InferExternal<TEntity>`: external (schema) shape.
- `InferInternal<TEntity>`: internal mapped shape.
- `EntityType` and `TableType`: advanced type definitions.
- Index and key helper types for composable config.

## Project Structure

- `actions/`: DynamoDB operations (Find, Query, Put, BatchWrite, TransactWrite)
- `functions/`: builders and mapping helpers
- `types/`: public and internal type helpers
- `utils/`: internal utilities for key and query construction
- `DynamoDBService.ts`: action runner
- `index.ts`: main public exports

## Design Notes

- **Entity type discriminator**: Zodynamo stores a short name (like `u`) in
  `entityTypeField` and uses it to safely map items back to entities.
- **Index flattening**: Index fields are flattened into DynamoDB attributes,
  while nested entity schemas remain intuitive for application code.
- **Typed key generation**: `defineKey` enforces only the fields used for key
  generation are available to the calculate function.

## FAQ

### Does Zodynamo validate data with Zod?

Zodynamo uses `zod` for type inference and schema definitions. Validation is
not automatically enforced on writes by default; you can validate explicitly
using your schema before passing data to actions.

### Can I use Zodynamo with multiple entities in the same table?

Yes. Pass multiple entities to `Query.for(table, [entityA, entityB])`. The
`entityTypeField` discriminator ensures items are mapped to the right entity.

### Does Zodynamo require DynamoDB single-table design?

No. It supports both single-table and multi-table layouts. Tables and entities
are defined explicitly, so you can model whichever strategy you prefer.

## Contributing

Issues and PRs are welcome.

Before submitting a change:

- Add or update tests when behavior changes.
- Keep API additions backward compatible when possible.
- Follow the existing code style and naming.

## License

MIT