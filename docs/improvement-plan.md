# Task Management Application Improvement Plan

This document summarizes the key technical and product investments that would materially improve the stability, maintainability, and velocity of the Task Management application. It builds on the refactoring notes already captured in `docs/refactoring-opportunities.md` by mapping broader architectural, UX, and operational next steps.【F:docs/refactoring-opportunities.md†L1-L60】 The recommendations are grouped by scope and ordered roughly by priority within each section.

## 1. Platform & Cross-Cutting Foundations

### 1.1 Production Observability & Runtime Safety
- **Introduce structured logging, tracing, and runtime guards at the server edge.** The Apollo/Node bootstrap currently wires HTTP parsing, context creation, and WebSocket lifecycles by hand with minimal diagnostics or validation, which makes it hard to debug failures and enforce headers consistently.【F:backend/src/index.ts†L1-L54】【F:backend/src/http/createHttpRequestListener.ts†L15-L97】 Add request/response logging (e.g., pino + pino-http), structured error reporting, and schema-level validation middleware (Zod/Yup) before operations execute.
- **Harden configuration management.** Database and secret selection rely on raw environment variables with no validation layer, so a misconfigured deployment fails late and noisily.【F:backend/src/db/index.ts†L1-L26】 Introduce a configuration module that validates required env vars at boot and injects defaults only for local development.
- **Secure client identity propagation.** The frontend injects a per-browser `x-client-id` into both HTTP and WebSocket links, but the backend simply forwards it without validation or rate limiting.【F:frontend/src/main.tsx†L1-L76】【F:backend/src/http/createHttpRequestListener.ts†L60-L97】 Establish expectations for the header (format, expiration) and persist recent IDs to detect replay or abuse.

### 1.2 Testing & Automation Culture
- **Stand up unit and integration test harnesses.** Neither package declares test scripts today, so regressions rely on manual QA.【F:backend/package.json†L1-L35】【F:frontend/package.json†L1-L42】 Adopt Vitest/React Testing Library on the frontend and Jest (or Vitest) with supertest against the GraphQL API. Seed the suite with critical-path scenarios (auth, task CRUD, board drag/drop).
- **Add contract tests for GraphQL schema.** Generate typed artifacts (e.g., using GraphQL Code Generator) and assert resolver behaviour, ensuring schema evolution remains safe.

## 2. Backend (GraphQL API)

### 2.1 Authorization & Data Ownership
- **Enforce membership checks in task mutations/queries.** Task resolvers currently gate only on `ctx.user`, meaning any authenticated user can mutate any task if they know its ID.【F:backend/src/resolvers/taskResolvers.ts†L31-L164】 Reuse the `ProjectService` permission helpers (e.g., `assertProjectPermission`) to verify team/project access before allowing reads/writes.【F:backend/src/services/ProjectService.ts†L108-L176】 Extend the context builder to inject resolved membership so resolvers do not re-query per call.
- **Backfill ownership metadata into emitted events.** Pub/Sub notifications should include the actor and enforce that listeners receive only data they are authorized to view.

### 2.2 Data Layer Robustness
- **Factor data access into composable repositories.** `TaskService` mixes SQL construction, normalization, event broadcasting, and cache hydration in a single 700+ line module, making it difficult to reason about and test.【F:backend/src/services/TaskService.ts†L1-L520】【F:backend/src/services/TaskService.ts†L648-L708】 Split responsibilities into repositories (pure SQL), mappers (row → domain), and orchestrators (business rules & events). Co-locate transactional workflows using `BEGIN/COMMIT` to guarantee reorder + publish happens atomically.
- **Centralize transaction helpers.** Many operations (task creation, reorder, assignment) run multiple queries without wrapping them in transactions, risking partial updates if an error occurs after the first mutation.【F:backend/src/services/TaskService.ts†L400-L520】 Introduce a `withTransaction` helper that exposes a scoped client so multi-step operations stay consistent.
- **Normalize timestamp/enum handling.** The services manually sanitize status strings and timestamps; move this into database constraints (`CHECK` on status) and use typed parsers to reduce duplication.【F:backend/src/services/TaskService.ts†L65-L125】

### 2.3 Real-Time & Background Work
- **Make board event delivery resilient.** Real-time updates rely on an in-process `EventEmitter` with optional Redis fan-out, but error handling simply logs and continues, risking silent desyncs.【F:backend/src/events/taskBoardPubSub.ts†L1-L195】 Add reconnect/backoff logic, metrics on publish/subscribe failures, and dead-letter/compaction strategies so consumers can recover missed events.
- **Implement subscription-level filtering server-side.** The WebSocket setup only extracts headers and delegates to the shared context factory; it should validate project access before streaming events to avoid over-sharing across tabs.【F:backend/src/websocket/setup.ts†L15-L37】

### 2.4 AI Service Governance
- **Wrap external AI calls with observability and quotas.** The AI helper calls `fetch` directly, falls back silently on failure, and returns heuristic drafts without signalling degraded quality.【F:backend/src/services/AIService.ts†L1-L170】 Introduce circuit breaking, retry with exponential backoff, and telemetry (duration, failure type). Persist generated content or prompts for audit trails and enable per-team usage quotas.
- **Allow pluggable providers.** Externalize model choice and base URLs via configuration so alternative providers (Anthropic, Azure OpenAI) can be swapped without code changes.【F:backend/src/services/AIService.ts†L8-L45】

### 2.5 Schema & Persistence Lifecycle
- **Expand the migration history.** The initial migration sets up core tables but wipes data on reruns, making iterative schema changes dangerous.【F:backend/migrations/0001_initial.sql†L1-L172】 Adopt incremental migrations (node-pg-migrate or Prisma migrate) and stop dropping tables in production scripts. Add seeds for demo environments.
- **Document caching & denormalized fields.** Clarify how `tasks.position`, `stages.position`, and `workflows` interplay so future contributors understand ordering semantics.【F:backend/src/services/TaskService.ts†L648-L708】

## 3. Frontend (React + Apollo)

### 3.1 Application Shell & State Management
- **Break apart the monolithic `App` component.** Routing, authentication, modal coordination, and navbar/sidebar rendering all live in a single file today.【F:frontend/src/App.tsx†L1-L200】 Extract an `AuthGate`, a `Layout` component, and modal controllers so each concern can be tested in isolation and SSR/React Server Components become feasible.
- **Introduce a global app store for cross-cutting state.** Modal state is maintained in an array without deduplication or z-index handling, leading to duplicate entries when a modal is opened twice.【F:frontend/src/components/ModalStack.tsx†L1-L33】 Consider Zustand or Redux Toolkit for session-level data (auth, toasts, modals) with persistence middleware.

### 3.2 Task Experience & Board Workflow
- **Modularize the task modal.** `TaskModal` and its controller hook coordinate title editing, description, AI drafts, assignee search, and comments across 150+ state variables and GraphQL operations.【F:frontend/src/components/TaskModal/TaskModal.tsx†L1-L176】【F:frontend/src/components/TaskModal/useTaskModalController.ts†L1-L200】 Break this into domain hooks (`useTaskComments`, `useTaskAssignee`), lazy-loaded panels, and skeleton states to improve responsiveness.
- **Decouple drag-and-drop orchestration.** `KanbanBoard` handles sensors, resize listeners, optimistic UI, and scroll management in one component, which complicates testing and reuse.【F:frontend/src/components/KanbanBoard/KanbanBoard.tsx†L1-L200】 Move drag state into a hook, memoize derived stages, and virtualize long task columns.
- **Streamline board page responsibilities.** The `ProjectBoardPage` wires board data, project settings dialogs, destructive actions, and AI workflow prompts together, making the render tree hard to follow.【F:frontend/src/pages/ProjectBoardPage.tsx†L1-L200】 Split this into `ProjectBoardHeader`, `ProjectSettingsDialog`, and `WorkflowGeneratorPanel` components and prefetch required data via route loaders.

### 3.3 Data Fetching Strategy
- **Reduce redundant refetches.** Hooks such as `useNotifications` and `TeamProvider` default to `network-only` with unconditional `refetchQueries`, adding load and slowing UI feedback.【F:frontend/src/hooks/useNotifications.ts†L1-L72】【F:frontend/src/providers/TeamProvider.tsx†L1-L58】 Adopt normalized cache updates, subscription payload handling, and background revalidation to keep UI responsive.
- **Codify GraphQL typing & fragments.** Generate typed hooks via GraphQL Code Generator to avoid manual casting (`as Task`) and ensure cache writes stay aligned with the schema.【F:frontend/src/hooks/boardCache.ts†L1-L160】
- **Improve error surfaces.** Centralize Apollo error boundaries and toast messaging so network failures do not silently fail (e.g., board refetch on subscription errors today simply swallows errors).【F:frontend/src/hooks/useProjectBoard.ts†L31-L84】

### 3.4 UX & Accessibility Enhancements
- **Audit accessibility in shared components.** Key UI like the navbar, dropdowns, and modals rely on Radix primitives but should expose ARIA labels (e.g., the notifications badge) and keyboard shortcuts explicitly.【F:frontend/src/components/Navbar.tsx†L31-L152】 Add integration tests to verify focus traps.
- **Introduce skeleton/loading states.** Many pages render bare `<div>` placeholders during loading; replace with skeleton components and optimistic UI where safe (e.g., project board header while workflow loads).【F:frontend/src/pages/ProjectBoardPage.tsx†L175-L189】

### 3.5 Frontend Testing & Tooling
- **Adopt component-level testing.** With no current test harness, start with Storybook/Chromatic for visual regression and Vitest for hooks/components. Target complex flows like task editing and drag/drop interactions.
- **Enable ESLint and type checks in CI.** Surface lint/type errors before deploys and add bundle-size monitoring to catch regressions early.【F:frontend/package.json†L7-L27】

## 4. Infrastructure & Delivery

### 4.1 Kubernetes & Runtime Configuration
- **Parameterize container images and secrets.** The base deployment hardcodes registry paths and expects a pre-created secret, making environment promotion brittle.【F:infra/k8s/base/backend-deployment.yaml†L1-L82】 Use Kustomize vars or Helm charts to inject image tags and credentials per environment.
- **Define resource requests/limits and autoscaling.** Current manifests omit CPU/memory requests, liveness backoff tuning, and pod disruption budgets, leading to unpredictable scheduling under load.【F:infra/k8s/base/backend-deployment.yaml†L19-L82】 Add HPA configuration tied to queue length or response latency once observability exists.
- **Externalize database connectivity.** The config map still references a specific Postgres host/credentials even though the service prefers a single `DATABASE_URL`, risking drift between env vars.【F:infra/k8s/base/backend-configmap.yaml†L10-L18】 Standardize on one approach and document secrets rotation in `infra/README.md`.

### 4.2 Release & Ops Workflow
- **Automate migrations on deploy.** Wire a Kubernetes job or entrypoint script that runs pending migrations before exposing new pods, preventing schema drift.【F:backend/migrations/0001_initial.sql†L1-L172】
- **Integrate CI/CD with quality gates.** Update the infrastructure docs with GitHub Actions/Argo CD automation (build, test, scan images) so environments remain reproducible.【F:infra/README.md†L1-L70】

## 5. Suggested Execution Roadmap

| Horizon | Key Outcomes |
| --- | --- |
| **0–1 month (Foundations)** | Implement env validation & structured logging; enforce task/project authorization; extract minimal task modal hooks; add initial automated tests; parameterize Kubernetes images. |
| **1–3 months (Stability & UX)** | Refactor TaskService into layered modules with transactions; modularize ProjectBoard and Kanban components; optimize notification/team data fetching; add AI provider safeguards and metrics. |
| **3–6 months (Scale & Innovation)** | Build observability stack (logs, metrics, traces); introduce feature flag framework for AI experiences; roll out autoscaling, blue/green deploys, and cross-project dashboards; expand Storybook + visual regression coverage. |

By tackling these areas in sequence, the team can strengthen reliability, unlock faster iteration on collaboration features, and support future enterprise requirements such as audit trails and advanced reporting.
