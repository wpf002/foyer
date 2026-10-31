# Foyer

Foyer reads a house and writes a renovation brief. Fifteen intake answers and six photos per room
become a phased plan: what to change, in what order, what it costs in your zip code, and what to
leave alone. The brief is the product. Renders, when they arrive, only illustrate a recommendation
that already exists and already cites the intake answer that justifies it.

## The four decisions this repo is built around

| Decision | What it means in the code |
| --- | --- |
| The brief is the product | Renders are last in the sequence. `Render` cannot exist without a `Recommendation`. |
| Quality is measured, not asserted | `packages/rubric` and `eval/` exist before the UI has anything real in it. |
| The moat is local cost data | `CostDataPoint` is written from Phase 3 on, while it is still worthless at n=50. |
| Pros pay, consumers seed | Handoff artifacts are the paid surface. The consumer brief is the funnel. |

## Schema invariants

Two rules are enforced by required foreign keys in `packages/db/prisma/schema.prisma`, not by
convention:

1. Every `Recommendation` has a required `briefAnswerId`. A recommendation that cites nothing
   cannot be written to the database.
2. Every `Render` has a required `recommendationId`. An orphan render cannot exist.

The judge in `eval/` scores a missing citation as traceability 1, so the invariant is checked twice.

## Safety discipline

Foyer never states that something is or is not load bearing, and never states that a permit is or
is not required. Permit flags come from a rules table, not a model guess. Structural and
safety adjacent items carry a `riskNote` and route to a licensed professional. These rules are
written into `packages/rubric/src/prompts.ts` and enforced by the judge's safety floor.

## Stack

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces, Turborepo |
| Web | Next.js 15 App Router, React 19, Tailwind CSS v4 |
| API | Fastify 5 |
| Data | Prisma 6, Postgres |
| AI | Claude via `@anthropic-ai/sdk`, server-side only. |

## Layout

```
apps/web         Next.js app. Intake, brief, rooms, recommendations, roadmap, costs, artifacts.
apps/api         Fastify. Health and cost endpoints today.
packages/db      Prisma schema and client. The invariants live here.
packages/ai      Claude client, model tiering, spend ledger.
packages/rubric  Design rubric, problem vocabulary, critique and judge prompts.
packages/cost    Baseline unit costs, zip3 region factors, range estimates.
packages/ui      Design tokens and primitives.
packages/artifacts  Handoff document shapes.
eval             Golden set and the regression runner.
```

## Local setup

```
./scripts/bootstrap.sh
```

The script checks Node and pnpm versions, copies `.env.example` to `.env` if you do not have one,
installs, generates the Prisma client, validates the schema, and typechecks. It is idempotent.

Then:

```
pnpm dev
```

Web runs on 3000, API on 4000. The web app renders from `apps/web/lib/mock.ts` until Phase 1 wires
the critique chain, so every screen works without a database.

## Environment

Copy `.env.example` to `.env`. Two things to know:

- `DATABASE_URL` points at Postgres. Nothing else needs a connection string.
- `ANTHROPIC_API_KEY` is read only by `packages/ai`. It never goes in `apps/web` or a `NEXT_PUBLIC_` var.

Model tiering is configured by task, not globally. Intake parsing and classification use the cheap
model. Design critique and sequencing use the reasoning model. Photo analysis uses vision. The
eval judge is its own tier. See `packages/ai/src/tiers.ts`.

Spend caps are enforced before every call in `packages/ai/src/spend.ts`, per user and globally.

## Phases

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Monorepo, data model, AI gateway, eval harness, design system, screens | Done |
| 1 | Intake persistence, photo analysis, the critique chain | Done |
| 2 | Roadmap sequencing and dependency reasoning | Built |
| 3 | Cost engine on real zip data, flywheel writes |  |
| 4 | Handoff artifacts and PDF export |  |
| 5 | Pro accounts |  |
| 6 | Renders, locked to a recommendation |  |
| 7 | Scan based dimensions |  |
| 8 | Cost data as a product |  |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web and API in watch mode |
| `pnpm build` | Build everything through Turborepo |
| `pnpm typecheck` | Typecheck every package |
| `pnpm lint` | ESLint across the workspace |
| `pnpm db:migrate` | Create and apply a migration |
| `pnpm db:studio` | Prisma Studio |
| `pnpm eval` | Run the golden set against the current rubric |
