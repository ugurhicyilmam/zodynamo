# AGENTS.md - Zodynamo

> **Note for Agents**: This file guides AI assistants in working effectively with the Zodynamo codebase.

## 1. Project Context
**Zodynamo** is a strongly-typed abstraction layer for Amazon DynamoDB, built with **TypeScript** and **Zod**. It aims to provide a developer-friendly API for defining tables, entities, and indexes while maintaining strict type safety and supporting both single-table and multi-table designs.

## 2. Technology Stack
- **Language**: TypeScript (Strict mode essential)
- **Package Manager**: pnpm
- **Dependencies**:
  - `zod` (Schema validation & inference)
  - `@aws-sdk/lib-dynamodb` (AWS SDK v3 Document Client)
  - `@aws-sdk/client-dynamodb` (AWS SDK v3 Core)

## 3. Architecture & Patterns
The library follows a specific architectural style described in the README:

- **Service/Action Pattern**: The `DynamoDBService` acts as a runner. Operations (`Find`, `Put`, `Query`) are isolated "Action" classes.
  - *Example*: `service.run(Find).one(...)`
- **Definition Builders**: Tables and Entities are defined using functional builders (`defineTable`, `defineEntity`).
- **Separation of Shapes**:
  - **External Shape**: The application-facing object, defined by the Zod schema.
  - **Internal Shape**: The actual item stored in DynamoDB (often with abbreviated keys like `pk`, `sk`, `lsi-1-sk`).
- **Explicit Mapping**: Transformations between Internal and External shapes are handled via `map.toInternal` and `map.toExternal`.

## 4. Coding Standards
- **Strict Typing**: No `any`. Use generics to propagate types from `defineTable` -> `defineEntity` -> `Actions`.
- **Immutability**: Builder chains should generally be immutable.
- **Explicit Returns**: Ensure all functions have explicit return types where complex inference is involved.
- **Directory Structure** (to be implemented):
  - `actions/`: Action classes (logic for Find, Put, etc.).
  - `functions/`: Builder functions (defineTable, defineKey).
  - `types/`: Shared type definitions.
  - `utils/`: Internal utilities.
  - `DynamoDBService.ts`: Main service runner.
  - `index.ts`: Public exports.

## 5. Development Rules
- **Package Management**: Always use `pnpm` for installing dependencies.
- **File Organization**: Keep the root clean. Source code should ideally reside in `src/` (implied by standard practices, though README lists folders directly. Confirm with user if `src/` is preferred).
- **Testing**: Future tests should be placed alongside code or in a `tests/` directory, using `vitest` or `jest`.

## 6. Common Workflows
- **Adding a Feature**:
  1. Define the Action class in `actions/`.
  2. Implement the fetching/writing logic using the underlying DynamoDB client.
  3. Ensure types flow correctly for Input and Output.
- **Refactoring**:
  - Be careful with generic constraints in `types/`. Changing `TableDef` or `EntityDef` propagates across the entire library.
