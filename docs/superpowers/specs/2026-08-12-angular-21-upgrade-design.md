# Angular 8 → 21 Upgrade

Date: 2026-08-12
Status: Approved

## Context

This project (`msp-from-ss`, a small Angular 8.3.3 app that builds `.msp`
files from spreadsheets of mass spectrometry data) is 13 major Angular
versions behind current. It's small in scope — 2 components, 2 services,
no routing beyond the default shell, no state management library — which
makes a full upgrade to Angular 21 tractable in one project.

Current state:
- Angular 8.2.4 / CLI 8.3.3, RxJS ~6.4, zone.js ~0.9.1, TypeScript ~3.5.3
- Karma + Jasmine unit tests (5 spec files, all currently passing)
- Protractor e2e tests (Protractor is removed entirely from modern Angular
  tooling — deprecated at v12, gone by v20)
- Dependencies with unclear status: `pandas-js` and `d3` are declared in
  `package.json` but not imported anywhere in `src/` (dead weight).
  `underscore` is used in exactly two call sites (`_.map`, `_.pick` in
  `BuildMspService`). `chromedriver`/`webdriver-manager` exist only to
  support Protractor.
- Node v24.18.0 is already installed locally, which satisfies Angular 21's
  baseline — no Node upgrade needed as part of this work. (Note: running
  the *current* Angular 8 toolchain under Node 24 requires
  `NODE_OPTIONS=--openssl-legacy-provider` because webpack 4's hashing
  breaks under OpenSSL 3 — this incompatibility disappears once we're on a
  modern Angular/webpack version, so it's a temporary, Phase-1-only
  workaround, not a permanent fix.)

## Goals

- Reach Angular 21 with dependencies current and compatible.
- Modernize to current Angular idioms: standalone components, `@if`/`@for`
  control-flow syntax, signals where they're a natural fit, and zoneless
  change detection.
- Replace Protractor with Playwright for e2e (Angular CLI's current
  default).
- Drop dead/unnecessary dependencies encountered along the way.
- Preserve all existing behavior exactly — this is a platform upgrade, not
  a feature change. The 5 existing unit test files are the behavioral
  contract; they must stay green (updated only for testing-API syntax
  changes, never for new expected behavior) through every phase.

## Non-goals

- No new features, no UI redesign, no change to the spreadsheet →
  `.msp`/error-file logic in `BuildMspService` or `ReadSpreadsheetService`.
- No migration of the unit test runner off Karma/Jasmine — Karma remains
  supported through Angular 21 and wasn't in scope for this round.

## Approach: four sequential branches/PRs

Each phase is its own branch, its own PR, reviewed and merged before the
next phase starts. This keeps diffs small and bisectable, and means the
app is always in a fully working, shippable state after each merge —
if a later phase stalls, everything before it has already landed.

### Phase 1 — Version chain (8 → 21)

Step through every major version one at a time — never skip a major —
using `ng update @angular/core@N @angular/cli@N` for N in
9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21. Apply whatever
automatic migration schematics each version ships with (Ivy defaults at 9,
etc.). No manual code-style changes beyond what's needed to make the app
build and the existing tests pass under each version — that's Phase 2's
job.

`ngx-spinner` is bumped in lockstep at each hop (its major versions track
Angular's 1:1 — confirmed `ngx-spinner@21.1.0` requires
`@angular/core >= 20.0.0`), pinned explicitly rather than left to
`ng update`'s guess, since it's the one Angular-aware third-party
dependency in the app.

RxJS moves 6→7 and zone.js/TypeScript move along whatever `ng update`
requires at each step.

**Gate:** all 5 existing spec files pass after *every single* major-version
hop, not just at the end. If a hop breaks a test, fix forward before
moving to the next version — don't batch fixes across multiple hops.

### Phase 2 — Modernization

- Convert `AppComponent` and `ReadSpreadsheetComponent` to standalone;
  remove `AppModule`/`AppRoutingModule` in favor of `bootstrapApplication`.
- Migrate templates from `*ngIf`/`*ngFor` to `@if`/`@for`.
- Move component-local state to signals where it's a natural fit (e.g.
  spinner visibility, error/warning strings currently held as plain
  fields).
- Switch to zoneless change detection via
  `provideZonelessChangeDetection()`. Reasonable here because there's no
  zone-dependent third-party code once `ngx-spinner` is on a version that
  supports it (confirmed by Phase 1).

**Gate:** existing specs still pass, updated only for
`TestBed.configureTestingModule` no longer using `declarations` for
standalone components — no new test cases, no behavior change.

### Phase 3 — E2E: Protractor → Playwright

Use Angular CLI's Playwright e2e schematic (current default since v16) to
scaffold the harness, then port the existing Protractor scenarios 1:1:
- Load the app.
- Upload `example_spreadsheet_small.xlsx`, verify a `.msp` download is
  triggered.
- Upload a malformed spreadsheet, verify the error banner appears with the
  expected message.

**Gate:** Playwright suite covers the same scenarios the Protractor suite
did — coverage parity, not necessarily identical test structure.

### Phase 4 — Dependency cleanup

- Remove `pandas-js` and `d3` from `package.json` (unused in `src/`).
- Remove `chromedriver` and `webdriver-manager` (Protractor-only, already
  unused after Phase 3).
- Replace the two `underscore` call sites in `BuildMspService`
  (`_.map`, `_.pick`) with native `Array.prototype.map` and a small inline
  pick helper; remove the `underscore` dependency.

**Gate:** existing suite passes untouched — no behavior change expected,
so "tests still pass" is the only gate for this phase.

## Risks

- **RxJS 6→7 semantics + Ivy template strictness** may surface latent bugs
  in `read-spreadsheet.component` that happened to work under the old,
  looser compiler. Mitigation: fix forward within Phase 1, don't defer
  discovered issues to Phase 2.
- **Zoneless change detection** (Phase 2) is the one structural change with
  some behavioral risk even in a simple app — if `ngx-spinner` or any
  update-driven timing assumption breaks under zoneless, fall back to
  zone-based change detection for this app rather than blocking Phase 2 on
  it; standalone components + new control-flow syntax are the higher-value
  part of that phase.
- Each phase being an independently shippable PR means a stall in a later
  phase never blocks what's already merged.

## Testing strategy summary

| Phase | Test gate |
|---|---|
| 1 | 5 existing specs green after every major-version hop |
| 2 | Same specs green, updated only for standalone `TestBed` syntax |
| 3 | New Playwright specs at coverage parity with old Protractor specs |
| 4 | Existing suite green, unchanged |
