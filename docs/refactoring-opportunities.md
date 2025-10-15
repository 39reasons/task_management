# Refactoring Opportunities & Readability Improvements

This document highlights the heaviest areas of the codebase where refactoring would provide immediate readability wins. Each section captures why the current implementation is difficult to follow today and concrete steps to simplify it.

## Backend

### `backend/src/index.ts`
*Observations.* The entrypoint wires Apollo Server, HTTP handling, CORS, JSON parsing, and context creation inside one file and even a single `httpServer.on` callback.【F:backend/src/index.ts†L1-L227】 Combining transport concerns with auth/token parsing makes it harder to reason about failures or reuse the logic.

*Suggestions.*
- Extract the token helpers (`getUserFromToken`, `extractToken`, `buildContext`) into a dedicated auth module so they can be shared by HTTP and WebSocket paths and unit-tested independently.
- Move the raw Node HTTP handling (health check, CORS headers, JSON parsing) into a small adapter function or swap in a framework like Fastify/Express to lean on battle-tested middleware.
- Split WebSocket bootstrap (`useServer`) into its own setup function so the lifecycle plugin just calls `dispose`. That keeps the index focused on composing pieces rather than doing the work itself.

## Frontend

### `TaskModal` component
*Observations.* The modal orchestrates queries, mutations, optimistic cache writes, AI draft generation, tag management, and UI state in a single 600+ line component with more than a dozen `useState` calls and many deeply nested callbacks.【F:frontend/src/components/TaskModal/TaskModal.tsx†L1-L200】【F:frontend/src/components/TaskModal/TaskModal.tsx†L191-L400】 The mix of concerns makes it hard to trace which state drives which UI section.

*Suggestions.*
- Extract domain hooks (`useTaskComments`, `useTaskTags`, `useTaskDraft`) to encapsulate GraphQL wiring and cache writes; let the component consume clean handlers and status flags.
- Collocate UI-only state (e.g., draft prompt visibility, edit toggles) into smaller presentational components such as `<TaskDraftPanel>` and `<TaskCommentsPanel>` that receive minimal props.
- Replace the large `mutateTask` helper with intent-specific helpers (`updateTaskStatus`, `updateTaskMetadata`) so each describes the fields it touches, improving type inference and readability.

### `KanbanBoard` component
*Observations.* The board component mixes DnD configuration, scroll/drag gesture tracking, form handling for new stages, and stage equality utilities. Utility functions like `areStagesEquivalent` and `cloneStages` live inline, adding 120+ lines before the component definition and obscuring the actual render path.【F:frontend/src/components/KanbanBoard/KanbanBoard.tsx†L1-L200】

*Suggestions.*
- Move pure helpers (`collisionDetectionStrategy`, `cloneStages`, `areStagesEquivalent`) into a colocated `utils.ts` file; export them for testing.
- Extract the “Add Stage” form into a child component or hook so the top-level render focuses on DnD and column rendering logic.
- Wrap drag/scroll state management into a `useKanbanDrag` hook that returns callbacks (`onDragStart`, `onDragEnd`, `onWheel`) and the `activeTask`. This separates gesture bookkeeping from JSX markup.

### `ProjectBoardPage` screen
*Observations.* The page blends routing, project metadata editing, invite modal triggers, AI workflow generation, and destructive actions in one component. There are many `useState` blocks that largely manage modal state, confirmation flows, and form errors, making the main render hard to scan.【F:frontend/src/pages/ProjectBoardPage.tsx†L1-L200】

*Suggestions.*
- Introduce a `useProjectSettingsDialog` hook to own the derived state (`hasSettingsChanges`, error handling) and expose semantic callbacks (`openSettings`, `saveSettings`, `closeSettings`).
- Separate destructive actions (delete/leave project) into a `ProjectDangerZone` component that receives the `mutations` and state, keeping the primary board layout cleaner.
- Group the AI workflow prompt toggles and mutation into a lightweight component so the page component can focus on wiring `useProjectBoard` to `KanbanBoard`.

### `useProjectBoard` hook
*Observations.* The hook manages routing, subscriptions, cache-normalization utilities, and every mutation’s optimistic response, yielding a 300+ line hook that is difficult to test or modify incrementally.【F:frontend/src/hooks/useProjectBoard.ts†L1-L140】

*Suggestions.*
- Move reusable cache-normalization (`normalizeTaskForCache`) and optimistic update helpers into a `boardCache.ts` module to shrink the hook and facilitate testing.
- Split mutation handlers into separate hooks (e.g., `useTaskMutations`, `useStageMutations`) so each file stays below ~150 lines and focuses on a single responsibility.
- Derive memoized selectors (`stages`, `workflow`) after data normalization to avoid re-sorting tasks in multiple places and reduce duplication with `KanbanBoard` utilities.

