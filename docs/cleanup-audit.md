# CrisisSync Cleanup Audit

Audit date: 2026-09-09

## Scope

The active application is the Expo React Native project in `mobile/`. The root
package provides wrapper commands and the root Expo files are retained because
they are part of the workspace entry configuration. The application source is
organized under `mobile/src` by navigation, feature, shared component, service,
state, theme, type, and utility concerns.

## Dependency map

- `mobile/index.js` registers `mobile/App.tsx` with Expo.
- `mobile/App.tsx` initializes notifications and renders `AppNavigator` inside
  `AppStoreProvider`.
- `AppNavigator` wires authentication, citizen, map, alert, profile, admin,
  and operator screens.
- Shared services provide Supabase authentication, incidents, profiles,
  evidence/storage, responses, audit history, notifications, location, and
  deterministic incident intelligence.
- Shared utilities provide workflow validation, prioritization, escalation,
  response recommendations, map formatting, and admin filtering.
- `db/` contains the base schema plus incremental audit/evidence, storage,
  response, and RLS migrations. These files are database history and are kept.
- `supabase/.temp/` and `mobile/dist/` are generated local output. They are not
  application source and should remain untracked.

## Classification before cleanup

### Safe to remove

- `mobile/src/features/map/screens/MapIsolatedTestScreen.tsx`: an isolated map
  diagnostic screen referenced only by the disabled `RENDER_MAP_TEST` switch in
  `App.tsx`, not by navigation or production screens.
- `mobile/src/shared/services/mockApi.ts`: mock incident and alert data with no
  imports from application or test code; active data access uses Supabase.
- Debug-only success/tracing output in active source files, while preserving
  warnings and errors that communicate configuration or failed operations.

### Review before delete and therefore preserved

- Root and `mobile` Expo/configuration files, Android projects, and both entry
  files. They are duplicate-looking but configuration entry resolution is not
  proven safe to alter.
- All SQL files under `db/`, including files labelled as review-only. Migration
  history must remain reproducible.
- Root `android/`, `supabase/`, documentation, assets, lockfiles, and all
  untracked files already present in the worktree. These may be user or build
  outputs and are not deleted by this audit.
- `mobile/src/shared/utils/logger.ts`, which is used by operational services
  and is a deliberate logging abstraction rather than an orphaned debug file.

### Keep

- Supabase auth, PostgreSQL, RLS, storage/evidence, realtime, response/dispatch,
  audit/history, location, and deterministic intelligence implementations.
- Existing tests and lockfiles.
- Firebase references in archived planning documents only; no active Firebase
  dependency or source import was found.

## Findings

- Debug output is concentrated in `HomeScreen.tsx`, `supabase.ts`, and
  `appStore.tsx`; configuration warnings and operational error handling are
  retained, while development tracing is removed.
- No `.bak`, `.old`, or `.tmp` source backups were found. `supabase/.temp/`,
  `mobile/dist/`, and Android build folders are generated output.
- The root `.gitignore` did not ignore all generated Expo, Android, dist, or
  Supabase local output. Ignore rules should be added without deleting existing
  local output.
- The current baseline passes `npx tsc --noEmit` and 12 Jest suites (94 tests).
- No dependency is removed automatically: each declared mobile dependency is
  tied to application code or native/configuration behavior, and the root
  package is workspace configuration.

## Recommended actions

1. Remove the two proven orphaned diagnostic/mock source files and their only
   diagnostic switch.
2. Remove development tracing while retaining actionable warnings/errors.
3. Add ignore rules for generated output and local Supabase state.
4. Re-run TypeScript, Jest, Expo dependency checks, and the Android build
   validation available in this workspace.

## Validation note

`npx expo install --check` reported SDK patch mismatches and automatically
rewrote package metadata when run in this workspace. Those four version changes
were restored because this audit does not authorize dependency upgrades. The
compatibility result is therefore recorded as a review item rather than as a
cleanup change.
