# architecture-governance Specification

## Purpose

Defines the structural and automated-enforcement rules that every DuoMatch package and pull request must satisfy, so that layering, typing, and code-quality standards are guaranteed by tooling rather than by manual review discipline.

## Requirements

### Requirement: Layered package structure

The codebase SHALL be organized into packages named after their architectural layer (`domain`, `application`, `infrastructure-supabase`, and app shells for `presentation`), not after technology or feature area.

#### Scenario: New package added

- **WHEN** a contributor adds a new package to the monorepo
- **THEN** the package lives under `packages/` or `apps/` and is named after the architectural layer it implements

### Requirement: Enforced dependency direction

The system SHALL automatically verify, on every pull request, that source-level imports only point inward: `presentation` may depend on `application`, `application` may depend on `domain`, `infrastructure-supabase` may depend on `domain`, and `domain` SHALL NOT import from any other layer.

#### Scenario: Domain package imports outside itself

- **WHEN** a file in `packages/domain` imports from `application`, `infrastructure-supabase`, `presentation`, or any third-party SDK (database client, HTTP framework, UI library)
- **THEN** the pull request check fails and the merge is blocked

#### Scenario: Application imports infrastructure directly

- **WHEN** a file in `packages/application` imports directly from `packages/infrastructure-supabase` instead of through a port/interface defined in `application`
- **THEN** the pull request check fails and the merge is blocked

#### Scenario: Valid inward dependency

- **WHEN** a file in `packages/application` imports from `packages/domain`
- **THEN** the pull request check passes for this rule

### Requirement: Strict static typing

All packages SHALL be written in a statically typed language configured in its strictest mode (no implicit `any`, no unchecked nulls), and every pull request SHALL be type-checked with zero errors before merge.

#### Scenario: Type error introduced

- **WHEN** a pull request introduces a type error or an unjustified type-safety suppression
- **THEN** the pull request check fails and the merge is blocked

### Requirement: Automated code style and lint enforcement

The system SHALL enforce a single, shared code style and lint ruleset (including import ordering, cyclomatic complexity limits, and a ban on unstructured debug logging) both locally before a commit is created and again in the pull request pipeline.

#### Scenario: Lint violation committed locally

- **WHEN** a contributor attempts to commit code that violates the lint or format rules
- **THEN** the commit is rejected locally before it is created

#### Scenario: Lint violation reaches a pull request

- **WHEN** a pull request contains code that violates the lint or format rules
- **THEN** the pull request check fails and the merge is blocked, regardless of whether the local check was bypassed

#### Scenario: Unstructured debug logging

- **WHEN** a pull request adds a raw debug print statement instead of using the structured logger
- **THEN** the pull request check fails and the merge is blocked

### Requirement: Conventional commit messages

Every commit merged into the main line SHALL follow the Conventional Commits format, verified automatically.

#### Scenario: Non-conforming commit message

- **WHEN** a commit message does not match the Conventional Commits format
- **THEN** the commit is rejected before it is created

### Requirement: Required, non-bypassable CI gate

Every pull request SHALL run an automated pipeline that installs dependencies, lints, type-checks, verifies the dependency-direction rule, scans for committed secrets, audits third-party dependencies for known high/critical-severity vulnerabilities, and runs the automated test suite. A pull request that changes files under `domain/` or `application/` SHALL require at least one human approval in addition to a fully passing pipeline, with no mechanism to merge while any required check is failing.

#### Scenario: All checks pass

- **WHEN** a pull request's pipeline completes with every required check passing and, for changes touching `domain/` or `application/`, at least one human approval recorded
- **THEN** the pull request is eligible to merge

#### Scenario: One required check fails

- **WHEN** any required pipeline check fails (lint, type-check, architecture rule, secret scan, dependency audit, or tests)
- **THEN** the merge is blocked and no override path exists to merge anyway

#### Scenario: Secret committed to source

- **WHEN** a pull request diff contains a credential, API key, or token pattern
- **THEN** the secret-scan check fails and the merge is blocked

#### Scenario: High-severity vulnerable dependency

- **WHEN** a pull request introduces or retains a dependency with a known high- or critical-severity vulnerability
- **THEN** the dependency-audit check fails and the merge is blocked

### Requirement: Dead code detection

The system SHALL automatically detect exported code that is never imported anywhere else in the codebase, on a recurring schedule independent of individual pull requests.

#### Scenario: Unused export introduced

- **WHEN** a package exports a function, hook, or component that no other package or app imports
- **THEN** the next scheduled dead-code scan reports it for removal

### Requirement: Recorded architecture decisions

Any decision that establishes or changes a rule in this capability (choice of monorepo tool, choice of lint/type-check tooling, or any deviation from these requirements) SHALL be recorded as an Architecture Decision Record before or alongside the pull request that implements it.

#### Scenario: New architectural decision made

- **WHEN** a contributor makes a decision that changes how these governance rules are enforced or introduces a new cross-cutting tooling choice
- **THEN** an ADR document describing the context, decision, alternatives considered, and consequences is added to the repository in the same change
