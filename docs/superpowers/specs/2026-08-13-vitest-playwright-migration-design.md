# Vitest + Playwright Migration — Design

## Summary

Replace this app's unit-test tooling (Karma + Jasmine) with Vitest via
Angular's official experimental unit-test builder, and its e2e tooling
(Protractor, now a permanently-throwing stub as of Angular 21) with a plain
Playwright setup. This closes out the already-tracked "Phase 3: replace
Protractor" item and the Vitest half of "Phase 4: bump frozen test-tooling"
from the Angular-21-upgrade design.

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
- Confirmed via `npm view`: `@angular/build@21.2.21` (matching this
  project's Angular CLI version) ships Angular's official experimental
  Vitest integration (`@angular/build:unit-test` builder, `runner: "vitest"`
  option) — no need for a hand-rolled `@analogjs/vite-plugin-angular` setup.
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
- `architect.test`: builder → `@angular/build:unit-test`; options set
  `runner: "vitest"`, point at a new `vitest.config.ts` (or inline options,
  whichever the builder's schema expects — confirmed at implementation
  time by reading the installed builder's schema), keep the existing
  `tsConfig`/`polyfills`/`assets`/`styles` wiring adapted as needed.
- `architect.e2e`: removed.

**`vitest.config.ts`** (new, if the builder's schema requires a separate
config file rather than inline `angular.json` options) or inline
`angular.json` options — environment `jsdom`, coverage provider `v8`,
thresholds 80/80/80/80.

**`tsconfig.spec.json`**
- `types`: `["jasmine", "node"]` → `["node"]` (Vitest globals come from
  explicit imports, not ambient types, per Decision 3).
- `files`: drop `src/test.ts` if the new builder doesn't need a manual
  Zone/TestBed bootstrap entry point (confirmed at implementation time).

**6 spec files** (`app.component.spec.ts`,
`build-msp.service.spec.ts`, `download-file.service.spec.ts`,
`header-mapping.service.spec.ts`, `read-spreadsheet.component.spec.ts`,
`read-spreadsheet-service.spec.ts`): import `vitest`'s `describe`/`it`/
`expect`/`vi`/`beforeEach`/`beforeAll` etc.; translate every
`jasmine.*`/`spyOn`/`.calls.*` usage per Decision 5. Test *bodies*
(what's being asserted) are unchanged — only the harness API calls
change.

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

**Removed files**: `karma.conf.js`, `e2e/protractor.conf.js`,
`e2e/protractor-ci.conf.js`, `e2e/tsconfig.json`, and (pending
implementation-time confirmation) `src/test.ts`.

**Removed dependencies**: `karma`, `karma-chrome-launcher`,
`karma-firefox-launcher`, `karma-jasmine`, `karma-jasmine-html-reporter`,
`karma-coverage-istanbul-reporter`, `jasmine-core`, `jasmine-spec-reporter`,
`@types/jasmine`, `@types/jasminewd2`, `protractor`, `webdriver-manager`,
`chromedriver`, and `ts-node` (pending confirmation nothing else in the
repo depends on it).

**Added dependencies**: `vitest`, `@vitest/coverage-v8`,
`@playwright/test` — all pinned to specific versions compatible with
Angular 21 / Node's installed version, checked for advisories before
pinning.

**`package.json` scripts**: `"test": "ng test"` unchanged;
`"e2e": "playwright test"` (was `"ng e2e"`).

## Error handling

- If the Vitest builder's exact schema (config file vs. inline options,
  exact option names) differs from what's assumed above, resolve against
  the installed `@angular/build` package's actual schema at implementation
  time — this doc's Components section is the best understanding as of
  writing, not a guarantee of the exact builder API surface.
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
