# Zodynamo

## Project Overview

**Zodynamo** is a schema-first, strongly-typed abstraction layer for the Amazon DynamoDB DocumentClient, built with **TypeScript** and **Zod**.

This project focuses strictly on **modeling and interaction**, not infrastructure. Tables are defined as static schemas (no deployment, migrations, or lifecycle management). Entities are declared on top of tables and act as the primary unit of interaction with DynamoDB.

Agents working on this system should assume the following core principles:

- All table, entity, and key definitions must be **fully type-inferred and schema-safe**
- Zod schemas define the **external/domain shape** of an entity
- Entity key calculation and attribute enrichment occur during **encoding**
- DynamoDB persistence shape is an **internal representation**, distinct from the domain model
- `encode` and `decode` explicitly control this boundary and must preserve full type inference
- DynamoDB commands are exposed only through **typed action wrappers**, never raw client usage

Zodynamo supports both **single-table** and **multi-table** designs and must maintain strict type safety across all supported access patterns.

## Build and Test Commands

### Development Workflow

- Always run `pnpm typecheck` after any change, make sure it passes
- Always run `pnpm test` after any change, make sure it passes
- Always run `pnpm format` after any change, make sure it succeeds
- Always add tests for new features unless user explicitly requests otherwise.
- Always add type tests for new features unless user explicitly requests otherwise.

## Code Style Guidelines

- **TypeScript**: Strict mode enabled. Use `pnpm typecheck` to verify.
- **Mocking**: External modules are mocked using `vitest.fn()`
- **Formatting**: Use `pnpm format` to format code.

## Testing Insructions

### Test Types

- **Unit Tests** (`*.test.ts`): Located in the `tests/runtime` directory. These tests focus on runtime behavior and functionality. Use `pnpm test` to run unit tests.
- **Type Tests** (`*.test.ts`): Located in the `tests/type-validations` directory. These tests focus on type safety and functionality. Use `pnpm typecheck` to run type tests.

### Key Testing Principles

1. **Four-layer describe structure**: Class → Method → Input → Flow scopes
2. **Vitest mocking**: Use `vitest.fn()` and `vitest.mock()` for external dependencies
3. **Fixture classes**: Create reusable test fixtures with static methods
4. **Clear naming**: Use descriptive test names with "when called, and [condition]" pattern

### Agent Behavior Specification

> This document defines mandatory behavioral and technical standards.
> Compliance is assumed by default unless the user explicitly waives specific rules.
> These rules apply to both reasoning and output quality.

#### General Principles

- Before producing any output, fully understand:
  - Project context
  - User intent
  - The applicable technical stack
- When conclusions depend on external or uncertain information:
  - Consult at least one authoritative source (official documentation, standards, or source code)
  - Cite the source using links or version identifiers
- If requirements are ambiguous:
  - Restate known facts in one sentence
  - List clarification questions
  - Continue only after confirmation
- For complex tasks:
  - Decompose into explicit subtasks
  - Present results in subtask order

All technical output must be deliberate, accurate, and reasoned. Mechanical or filler content is strictly prohibited.

#### Scope Guard

##### 1. Implementing New Features, Types, or Public APIs

- Always review existing implementations before writing new code:
  - Types
  - Public exports
  - Utility patterns
- Follow established project conventions for:
  - Type definitions
  - Generic constraints
  - File and export structure

##### 2. Type Safety & Type Inference (Non-Negotiable)

- The project must compile with:
  - `strict: true`
  - `noImplicitAny`
  - `noUncheckedIndexedAccess`
- **Type assertions (`as`) are forbidden** unless:
  - There is no expressible alternative
  - The assertion is localized and documented
- Avoid `any` entirely. `unknown` must be used when the type is not yet known.
- Public API types must:
  - Infer correctly in common usage
  - Fail loudly and clearly when misused
- Conditional types, mapped types, and inference helpers must:
  - Be readable
  - Be documented when exported
  - Avoid “type-level cleverness” that obscures intent

##### Testing Scope

- **Only unit tests are allowed**. Integration tests, end-to-end tests, and snapshot tests are not permitted unless explicitly requested.
- Unit tests must cover:
  - Runtime logic
  - Edge cases
  - Error conditions
  - Type behavior
- Type behavior must be tested using:
  - `vitest`, using preferably `expectTypeOf`.
  - Compile-time assertions for inference correctness
- Every exported generic or conditional type must have:
  - At least one positive inference test
  - At least one negative (error) case
- Runtime tests must:
  - Be deterministic
  - Avoid mocking internals unnecessarily
  - Focus on observable behavior
- Tests must not assert implementation details unless unavoidable.

##### 3. Public API Documentation (Open Source Standard)

**Documentation Is Mandatory**

- Any change to the public API **must update documentation**.
- Documentation is considered part of the deliverable.
- Every exported symbol must have:
  - A clear description
  - Usage semantics
  - Type behavior explanation (when non-trivial)
- Public APIs must be documented using:
  - TSDoc or JSDoc-compatible comments
- Documentation must explain:
  - Default behavior
  - Edge cases
  - Error conditions
  - Type inference expectations
- Examples are allowed **only for public APIs**.
- Examples must:
  - Be minimal
  - Compile under `strict` mode
  - Demonstrate inference, not verbose typing

##### 9. Self-Learning, Consistency, and Reuse

- Before implementing new functionality:
  - Search existing exports
  - Review prior art in the codebase
- Do not reimplement solved problems.
- If an existing solution is insufficient:
  - Document what was reviewed
  - Explain why it does not meet the requirement
- Maintain consistency across:
  - Types
  - Naming
  - Documentation
  - Test style
