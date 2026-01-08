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

## Non-Goals

Agents must not introduce or assume:

- Table creation, deployment, or lifecycle management
- DynamoDB infrastructure abstractions (CDK, Terraform, etc.)
- Runtime schema mutation or dynamic typing

## Build and Test Commands

### Setup

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run typecheck
pnpm typecheck
```

### Development Workflow

```bash
# Format code
pnpm format

# Typecheck
pnpm typecheck

# Run tests
pnpm test
```

## Code Style Guidelines

- **TypeScript**: Strict mode enabled. Use `pnpm typecheck` to verify.
- **Testing**: Use `vitest` with extensive unit test coverage.
- **Mocking**: External modules are mocked using `vitest.fn()`
- **Formatting**: Use `pnpm format` to format code.

## Testing Insructions

### Test Types

- **Unit Tests** (`*.test.ts`): Use `vitest` with extensive unit test coverage. Tests should focus on type safety and functionality. Tests are located in the `tests` directory.
- **Type Tests** (`*.test.ts`): TypeScript type checking tests. These tests are located in the `tests/type-validations` directory. Use `pnpm typecheck` to run type tests. Extensive type tests are required to ensure type safety.

### Key Testing Principles

1. **Four-layer describe structure**: Class → Method → Input → Flow scopes
2. **Vitest mocking**: Use `vitest.fn()` and `vitest.mock()` for external dependencies
3. **Fixture classes**: Create reusable test fixtures with static methods
4. **Clear naming**: Use descriptive test names with "when called, and [condition]" pattern

### Running Tests

```bash
# Run all tests
pnpm test

# Run typechecks
pnpm typecheck
```

### Repository Structure

```bash
.changeset/             # Changesets release metadata
.github/workflows/      # CI workflows

dist/                   # Built outputs
src/
├── actions/            # DynamoDB action wrappers
├── functions/          # Core public functions
├── types/              # Type definitions
└── index.ts            # Public exports

tests/                  # Unit tests
├── fixtures/           # Unit test fixtures
└── type-validations/   # Type-level tests (tsc)
```

### Workspace Configuration

- **pnpm**: Use `pnpm` as the package manager
- **changesets**: Use `changesets` for versioning and release management
- **vitest**: Use `vitest` for unit testing
- **tsdown**: Use `tsdown` for code generation
- **prettier**: Use `prettier` for code formatting

## Pull Request Guidelines

1. **Branch Naming**: Use descriptive feature branch names
2. **Commit Messages**: Follow conventional commit format
3. **Testing**: All changes must include appropriate tests
4. **Build**: Ensure `pnpm run build` passes
5. **Typecheck**: Ensure `pnpm run typecheck` passes
6. **Coverage**: Maintain or improve test coverage
7. **Documentation**: Update relevant docs for public API changes
