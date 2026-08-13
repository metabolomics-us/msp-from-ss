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

zone.js/TypeScript move along whatever `ng update` requires at each step.
(RxJS did not move to 7 in practice — see Phase 1 exit notes below.)

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
  supports it (not yet verified — Phase 1 kept the app zone-based
  throughout via `provideZoneChangeDetection()` in `main.ts`; this needs
  confirming when Phase 2 actually adopts zoneless, see Phase 1 exit notes
  below).

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

## Phase 1 exit notes

Phase 1 (the version chain, 8 → 21) is merged as reviewed: the final
whole-branch review found no correctness defect, no behavior change, and
no code it wanted changed — the 5 existing spec files report the same
`35 SUCCESS` / 1 skipped contract at Angular 21 as at the 8.2.4 baseline.
What the cumulative review did surface is a set of carry-overs that no
individual version-hop owned, plus one claim above that needed
correcting. Recording them here so Phase 2 (and later phases) inherit
them deliberately rather than rediscovering them mid-work.

**TestBed and the app now run different change-detection models.** As of
Angular 21, `TestBed` provides zoneless change detection internally by
default, while this app's `main.ts` explicitly bootstraps zone-based CD
via `provideZoneChangeDetection()`. In practice this means the spec suite
no longer exercises the zone-driven `onMicrotaskEmpty → tick()` render
path that the real main user flow — `buildMsp`'s `subscribe` callback in
`read-spreadsheet.component.ts` — actually relies on in production. One
spec (`read-spreadsheet.component.spec.ts`, "should display a different
test title") needed an explicit `markForCheck()` call to keep passing
under the harness's now-default zoneless CD. That call is a test-harness
artifact, not an app behavior change — the real app's zone-patched
`FileReader` callbacks still trigger CD automatically, confirmed during
Phase 1. This is an explicit decision point for Phase 2: either accept the
harness/app CD-model mismatch as-is, or add `provideZoneChangeDetection()`
to the `TestBed` setup (e.g. in `src/test.ts`) so specs exercise the app's
actual CD model before Phase 2 does further work on this component. (This
is also why the Phase 2 zoneless-adoption line above no longer claims
Phase 1 verification of `ngx-spinner` under zoneless — it didn't happen.)

**The linter is dead, and no phase currently plans to fix it.** Angular
13's schematic removed the `lint` architect target from `angular.json` —
correct, since the CLI's `tslint` builder was deleted at v13 — but
`package.json` still declares `"lint": "ng lint"` (now broken), and
`tslint`, `tslint-eslint-rules`, and `codelyzer` remain as devDependencies
for a linter that no longer runs, alongside a 62-line `tslint.json`
enforced by nothing. Worth calling out: `tslint-eslint-rules`'s
`typescript@^2||^3` peer dependency is what forced `--force` on every
single `ng update` hop in this phase; removing it would remove that
friction from future dependency work too. Phase 4 (or its own small PR)
should get an explicit item to migrate to `@angular-eslint`, delete
`tslint.json` and the three dead lint devDeps, and fix the `lint` script.

**`npm run e2e` is now a stub that always throws, by design.** As of
Angular 21, the `@angular-devkit/build-angular:protractor` builder is an
error stub whose only job is to throw "Protractor is end-of-life."
`angular.json`'s `e2e` target is preserved in form but non-functional —
this is the expected Phase 1 outcome (Phase 3 replaces it with Playwright
per the plan above), not a regression, but it's worth stating explicitly
so it doesn't read as one. Also, for the record: the earlier claim that
`e2e/protractor.conf.js` and the e2e directory were left completely
untouched was slightly too strong. The Angular 10 hop's schematic changed
`e2e/tsconfig.json`'s `target` from `es5` to `es2018` and bumped the
`protractor` npm package version in `package.json` — both harmless,
automatic, non-interactive schematic output, not a hand-edit, and no
actual Protractor spec or `.conf.js` file was touched. Still, Phase 3's
planner should know `e2e/tsconfig.json` was already modified once before
Phase 3 starts.

**Test-support tooling is frozen at the Angular 11–12 era.** `ng update`
stopped managing several test/dev dependencies after roughly Angular 12,
so they never advanced through the remaining 9 majors: `jasmine-core
~3.6.0`, `@types/jasmine ~3.6.0`, `karma-jasmine ~4.0.0`,
`karma-jasmine-html-reporter ^1.5.0`, `karma-coverage-istanbul-reporter
~3.0.2` (unmaintained since 2020), `karma-firefox-launcher ^1.2.0`,
`@types/node ^12.11.1` (paired with TypeScript 5.9 and Node 24 — a real
type-mismatch hazard for later work), `ts-node ~7.0.0`, and
`jasmine-spec-reporter ~5.0.0`. This isn't a current blocker — the suite
passes — but it's a Phase 4 (or dedicated) item: bump these to their
current Angular-21-template equivalents (jasmine/`@types/jasmine` 5.x,
`karma-jasmine` 5.x, current `@types/node`, and swap the unmaintained
`karma-coverage-istanbul-reporter` for the maintained `karma-coverage`).

**RxJS was never bumped to 7 — correcting the Phase 1 section above.**
That section used to say "RxJS moves 6→7"; it didn't. The final state is
`rxjs ~6.6.7`, which is legal (`@angular/core@21`'s peer range is
`^6.5.3 || ^7.4.0`) and green, but rxjs 6 is EOL. Unlike the rest of this
phase's dependency movement, rxjs 6→7 has real semantic differences —
import paths, some operator behavior — so it's called out as its own
Phase 4 item with its own dedicated test gate, rather than folded into the
version-chain's already-passing suite.

**Two minor stale artifacts, worth a one-line flag for Phase 2 planning.**
`angular.json` carries an orphaned `"defaultConfiguration": ""` key left
by the Angular 12 hop — benign, since an empty string is falsy and `ng
build` behaves as if it were unset, but it's meaningless noise sitting
next to a build target it never wired up. And `src/test.ts` still carries
an Angular-13-era `teardown: { destroyAfterEach: false }` opt-out that
several of `read-spreadsheet.component.spec.ts`'s specs structurally
depend on — they query `document.getElementById(...)` directly rather
than through the fixture. Whoever removes that opt-out in Phase 2 should
expect those specs to be the first thing that breaks, and should plan the
conversion to fixture-scoped queries as part of that same change.
