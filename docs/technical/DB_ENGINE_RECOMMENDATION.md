# Database Engine Recommendation

Date: 2026-03-07
Status: Active recommendation

## Question

Current DB engine is Firebird. Is there a better DB for this project?

## Recommendation

1. Keep Firebird as the primary database for now.
2. Improve the Firebird client layer in Electron before considering engine migration.
3. If the core ecosystem is ready for a full migration, target PostgreSQL with pgvector.

## Why this is the best fit right now

- This app is tightly coupled to a shared Firebird database produced by the core `image-scoring` pipeline.
- The Electron app, scripts, and MCP tooling already assume Firebird (`SCORING_HISTORY.FDB`).
- Migrating only this frontend to another engine would create sync and ownership problems.

## Better immediate upgrade than changing engines

- Replace or harden the Node Firebird access layer (`node-firebird` is old).
- Keep all DB calls in main process and strengthen typed query boundaries.
- Continue improving connection handling, retries, and error surfaces.

These changes reduce risk and improve responsiveness without a cross-project migration.

## When a DB engine migration becomes justified

Re-evaluate if one or more of these become core requirements:

- Multi-user or service-style concurrent workloads at larger scale
- Rich operational tooling (replication, advanced monitoring, backup orchestration)
- Native vector search as a first-class query path for embeddings
- Need to standardize on broader ecosystem tooling used by other services

## Preferred long-term target (if migrating)

PostgreSQL + pgvector is the strongest candidate for ecosystem/tooling reasons and vector workflows.

Important constraint: migration should be coordinated across both projects (core scorer and Electron app), not frontend-only.

## Decision summary

- Near term: stay on Firebird, improve client/connection layer.
- Long term: migrate to PostgreSQL + pgvector only as a coordinated platform move.