# Vitest + Playwright Migration — Design

## Summary

Replace this app's unit-test tooling (Karma + Jasmine) with Vitest (via
`@analogjs/vite-plugin-angular`, a standalone Vite config — see Amendment
below for why Angular's official unit-test builder doesn't work for this
app), and its e2e tooling
(Protractor, now a permanently-throwing stub as of Angular 21) with a plain
Playwright setup. This closes out the already-tracked "Phase 3: replace
Protractor" item and the Vitest half of "Phase 4: bump frozen test-tooling"
from the Angular-21-upgrade design.

## Amendment (during Task 1 implementation)

Decisions 1-3 below were revised after implementation revealed the original
approach doesn't work for this repo. Original text is struck through in
spirit (kept below for history) but superseded by the "Revised" notes:

- **Decision 1 is reversed**: `@angular/build:unit-test` explicitly does not
  support apps whose `build` architect target still uses the legacy
  `@angular-devkit/build-angular:browser` builder (this repo's actual
  configuration — an `NgModule`-based app, not yet migrated to
  `@angular/build:application`). Confirmed by reproducing identical
  `NG8001`/`NG8002` "not a known element" failures (components declared in
  `AppModule` unresolved) under two independent diagnostic configurations.
  Migrating the `build` target itself to the new builder is a much larger,
  separate, production-build-risk-bearing change (different builder options
  schema, output layout, `serve`/`e2e` knock-on effects) that was never
  authorized by "refactor tests to vitest and playwright" — **ruled out of
  scope**. Revised: use a standalone `vitest.config.ts` with
  `@analogjs/vite-plugin-angular` (the community-standard Angular+Vitest
  integration specifically for apps on the legacy build toolchain — its
  peer dependencies explicitly support `@angular-devkit/build-angular`
  17-22.x). `angular.json`'s `test` architect target is **removed entirely**
  (same treatment as the `e2e` target) — `npm test` becomes `vitest run`
  directly, no longer `ng test`. This is a real, acknowledged behavior
  change from the original "npm test/ng test keep working unchanged"
  promise, forced by the builder incompatibility above.
- **Decision 3 is reversed**: AnalogJS's setup helper
  (`@analogjs/vite-plugin-angular/setup-vitest`) works by monkey-patching
  Vitest's *global* `describe`/`it`/`beforeEach`/etc. to wrap Angular
  TestBed execution in zone.js proxy zones (required for
  `fixture.detectChanges()`/`waitForAsync` to behave correctly, matching
  what zone.js + Karma provided before). This patching only takes effect if
  spec files read `describe`/`it`/`vi`/etc. off the global scope — an
  explicit `import { describe, it, vi, ... } from 'vitest'` in a spec file
  would import the *unpatched* originals directly from the module,
  silently bypassing the zone wrapping. Revised: `vitest.config.ts` sets
  `test.globals: true`; spec files add **no import line** for
  `describe`/`it`/`expect`/`vi`/`beforeEach`/`beforeAll` at all (ambient
  globals, typed via `tsconfig.spec.json`'s `"types": ["vitest/globals",
  "node"]`) — closer to the original Jasmine files' shape than originally
  planned. A type-only `import type { Mock } from 'vitest'` is still needed
  wherever the `jasmine.Spy`-cast translation applies (Decision 5,
  unchanged) — type imports are erased at compile time and don't
  participate in the global-patching concern.
- **Decision 2 (jsdom environment) is unaffected** — AnalogJS's Vitest
  integration also defaults to/supports a jsdom environment the same way.
- Everything else (Decisions 4-10, the whole Playwright/e2e side) is
  unaffected by this amendment.

## Background

- This repo's `angular.json` `test` target uses
  `@angular-devkit/build-angular:karma`; `e2e` uses
  `@angular-devkit/build-angular:protractor`, whose builder is permanently
  stubbed to throw as of Angular 21 (`ng e2e` cannot run at all).
- 6 unit spec files exist (`app.component`, `build-msp.service`,
  `download-file.service`, `header-mapping.service`,
  `read-spreadsheet.component`, `read-spreadsheet-service`), all plain
  Jasmine + Angular `TestBed`, currently 99 passing / 1 pre-existing skip.
- 1 e2e spec file (`e2e/src/app.e2e-spec.ts`, ~25 cases) + 1 page object
  (`e2e/src/app.po.ts`), Protractor-based.
- **This repo's `build` architect target uses the legacy
  `@angular-devkit/build-angular:browser` builder** (webpack-based,
  `NgModule`-declarations, no `development` configuration defined — only
  `production`). This matters because it rules out Angular's official
  Vitest builder (see Amendment above) — `@angular/build:unit-test` is
  designed for apps already on `@angular/build:application`, which this
  app is not.
- Confirmed via `npm view`: `@analogjs/vite-plugin-angular@2.7.0` (latest
  stable) peer-depends on `@angular-devkit/build-angular` `^17.0.0` through
  `^22.0.0` (this repo has 21.2.21 — compatible) and `vite` `^6/^7/^8`
  (pinning `vite@8.2.1`, current stable). Its `./setup-vitest` export
  provides the zone.js/TestBed proxy-zone wiring `src/test.ts` used to do
  by hand under Karma.
- No official Angular+Playwright builder exists (Protractor was the last
  one Angular shipped a builder for). A plain `@playwright/test` setup —
  its own `playwright.config.ts` with a `webServer` block — is the standard
  community-recommended path and matches this project's existing
  hand-rolled (non-schematic) Protractor setup.
- Confirmed via isolation testing (documented in project memory) that the
  current e2e suite's download-verifying specs ALL fail today: headless
  Chrome 151 doesn't honor Protractor's legacy `chromeOptions.prefs.download`
  settings. Playwright's native `page.waitForEvent('download')` API is a
  real fix for this, not just a syntax port.
- No `.github/` CI workflows exist in this repo — all test/lint/build
  verification today is manual/local.

## Decisions

1. **Vitest via Angular's official builder**, not a standalone hand-rolled
   Vite config. `angular.json`'s `test` target becomes
   `@angular/build:unit-test` with `runner: "vitest"`. `npm test`/`ng test`
   keep working unchanged — no script rename needed for unit tests.
2. **Test environment: `jsdom`** (the builder's default) — fast, and
   nothing in the current specs depends on a real-browser-only feature.
3. **Explicit `vitest` imports in every spec file** (`import { describe,
   it, expect, vi, ... } from 'vitest'`), not global injection via a
   `globals: true` config flag — keeps dependencies visible per file.
4. **Coverage stays on a v8-based provider** (`@vitest/coverage-v8`), same
   80%-on-all-four-metrics threshold this repo already requires.
5. **All 6 spec files get their Jasmine-specific APIs translated**, not
   just re-imported — `jasmine.createSpy(...).and.returnValue(...)` →
   `vi.fn().mockReturnValue(...)`, `spy.calls.mostRecent().args[0]` →
   `spy.mock.lastCall[0]`, `jasmine.objectContaining` →
   `expect.objectContaining`, etc. A Jasmine-shaped test that merely
   compiles under Vitest's Jasmine-compat shims is not the goal — genuine
   translation is.
6. **Plain `@playwright/test`**, not a community Angular schematic package
   (`playwright-ng-schematics` or similar) — one more dependency to
   maintain for something a `playwright.config.ts` handles in a dozen
   lines, and it matches this project's existing preference for
   hand-rolled, transparent test config over generated scaffolding.
7. **`playwright.config.ts`'s `webServer` auto-starts `npm start`** against
   `http://localhost:4200`, reusing an already-running server outside CI.
   Chromium-only project for now — matches today's Chrome-only scope; a
   multi-browser matrix is an easy, separate follow-up.
8. **`e2e/src/app.po.ts` keeps its current method names and shape**
   (`navigateTo`, `uploadSpreadsheet`, `submitFile`, `isElementHidden`,
   `getErrorText`, `downloadErrorFile`, etc.), rewritten internally against
   Playwright's `Page`/`Locator` API — this minimizes the diff inside the
   spec file itself, which only needs its `describe`/`it` shape and
   assertion syntax changed, not its call sites into the page object.
9. **Known-broken e2e tests are fixed during the port, not ported as-is**:
   the stale `#title` selector (left over from the PR #85 navy/gold
   restyle) and the two newly-added specs that collide on one download
   filename both get fixed as part of translating their test intent to
   Playwright. A translated-but-still-broken suite would defeat the
   purpose of this migration.
10. **`angular.json`'s `e2e` architect target is removed entirely** once
    `package.json`'s `e2e` script is repointed to `playwright test` — the
    target currently does nothing but throw, so nothing depends on keeping
    it.

## Architecture

**Unit side**: swap the builder, translate the six spec files' assertion
API, remove Karma/Jasmine tooling entirely. Nothing about the app's own
source code changes — this is test-tooling-only.

**E2E side**: new `playwright.config.ts` replaces `e2e/protractor.conf.js`
+ `e2e/protractor-ci.conf.js` + `e2e/tsconfig.json`. `app.po.ts` is
rewritten against Playwright's API with its method surface preserved.
`app.e2e-spec.ts`'s ~25 cases are translated to `test()`/`expect()`, with
the two known bugs fixed inline.

## Components & data flow

**`angular.json`**
- `architect.test`: **removed entirely** (per the Amendment above) — no
  longer a valid `ng test` target.
- `architect.e2e`: removed.

**`vitest.config.ts`** (new, repo root):
```ts
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcovonly', 'text-summary'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
```
Coverage stays opt-in (matches the old `ng test --code-coverage` convention)
via `vitest run --coverage` — `test.coverage.enabled` is left unset
(defaults false) in the config itself.

**`src/test-setup.ts`** (new, replaces `src/test.ts`):
```ts
import '@analogjs/vite-plugin-angular/setup-vitest';
```

**`tsconfig.spec.json`**
- `types`: `["jasmine", "node"]` → `["vitest/globals", "node"]` (per the
  Amendment — Vitest globals are ambient, not per-file imports).
- `files`: drop the old `src/test.ts` reference — the new bootstrap file is
  `src/test-setup.ts`, wired via `vitest.config.ts`'s `setupFiles`, not
  `tsconfig.spec.json`.

**6 spec files** (`app.component.spec.ts`,
`build-msp.service.spec.ts`, `download-file.service.spec.ts`,
`header-mapping.service.spec.ts`, `read-spreadsheet.component.spec.ts`,
`read-spreadsheet-service.spec.ts`): **no new import line** for
`describe`/`it`/`expect`/`vi`/`beforeEach`/`beforeAll` (ambient globals,
per the Amendment) — translate every `jasmine.*`/`spyOn`/`.calls.*` usage
per Decision 5, adding only a type-only `import type { Mock } from
'vitest'` where a `jasmine.Spy` cast is translated. Test *bodies* (what's
being asserted) are unchanged — only the harness API calls change.

**`playwright.config.ts`** (new, repo root): `testDir: './e2e/src'`,
`webServer: { command: 'npm start', url: 'http://localhost:4200', reuseExistingServer: !process.env.CI }`,
`use: { baseURL: 'http://localhost:4200' }`, one Chromium project.

**`e2e/src/app.po.ts`**: rewritten against `Page`/`Locator` — e.g.
`uploadSpreadsheet(fileName)` becomes
`page.locator('input[type="file"]').setInputFiles(path)`;
`isElementHidden(id)` becomes reading the element's `hidden` attribute via
`page.locator('#' + id).getAttribute('hidden')`; `submitFile()` becomes
`page.locator('#submit').click()`; download-verifying helpers use
`page.waitForEvent('download')` + `download.saveAs(...)`.

**`e2e/src/app.e2e-spec.ts`**: `describe`/`it` → Playwright's
`test.describe`/`test`; each test takes a `{ page }` fixture instead of a
shared `AppPage` instance constructed in `beforeAll`. The stale `#title`
selector is corrected against the current navy/gold template; the two
filename-colliding download specs get distinct filenames (or a
`test.beforeEach` cleanup step) so both can assert their own downloaded
content independently.

**Removed files**: `karma.conf.js`, `src/test.ts` (replaced by
`src/test-setup.ts`), `e2e/protractor.conf.js`, `e2e/protractor-ci.conf.js`,
`e2e/tsconfig.json`.

**Removed dependencies**: `karma`, `karma-chrome-launcher`,
`karma-firefox-launcher`, `karma-jasmine`, `karma-jasmine-html-reporter`,
`karma-coverage-istanbul-reporter`, `jasmine-core`, `jasmine-spec-reporter`,
`@types/jasmine`, `@types/jasminewd2`, `protractor`, `webdriver-manager`,
`chromedriver`, and `ts-node` (pending confirmation nothing else in the
repo depends on it). `@angular/build` is NOT added at all (per the
Amendment — its `unit-test` builder is unused).

**Added dependencies**: `vitest@4.0.8`, `@vitest/coverage-v8@4.0.8`,
`jsdom@30.0.1`, `vite@8.2.1`, `@analogjs/vite-plugin-angular@2.7.0`,
`@playwright/test@1.62.1` — versions confirmed current-stable via `npm
view` at design time; re-check for advisories at implementation time.

**`package.json` scripts**: `"test": "vitest run"` (was `"ng test"` — see
Amendment); `"e2e": "playwright test"` (was `"ng e2e"`).

## Error handling

- If removing `ts-node` breaks something unrelated (unlikely, but
  unverified until implementation), keep it and note why.
- Playwright's `webServer` reuse setting (`reuseExistingServer:
  !process.env.CI`) means a developer's already-running `dev-start.sh`
  server is reused locally, while a clean server is always started when
  `CI` is set — matches this project's existing dev-server conventions.

## Testing plan

- **Unit**: after the builder swap and spec-file translation, `npm test`
  must report the same pass count as today's Karma baseline (99 passing, 1
  pre-existing skip) and coverage ≥80% on all four metrics.
- **E2E**: after the Playwright port, `npx playwright test` runs the full
  translated suite against a live `ng serve` instance with all specs
  passing — including, for the first time, specs that verify a real
  downloaded file's on-disk content.
- **Manual**: restart the dev server (`dev-stop.sh && dev-start.sh`) and
  confirm a clean start, per this project's standing convention.

## Out of scope

- `tslint` → `eslint` migration (separately tracked Phase 4 item; `ng
  lint` remains non-functional, unrelated to this change).
- `rxjs` 6→7 bump, removing other dead deps (`pandas-js`, `d3`,
  `underscore`).
- Zoneless change detection / standalone components (Phase 2).
- A multi-browser Playwright matrix (Chromium-only for now).
- Adding CI (`.github/` workflows) — this repo has none today; out of
  scope for a test-tooling swap.
