# Vitest + Playwright Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace this app's Karma/Jasmine unit-test tooling with Vitest (via a standalone `@analogjs/vite-plugin-angular` config — Angular's official unit-test builder doesn't support this app's build setup, see amended spec), and its dead-stub Protractor e2e tooling with a plain Playwright setup — no application source code changes, test-tooling only.

**Architecture:** Add a repo-root `vitest.config.ts` using `@analogjs/vite-plugin-angular` with `test.globals: true`, remove `angular.json`'s `test` architect target entirely (`npm test` becomes `vitest run`, not `ng test`), translate all 6 spec files' Jasmine-specific APIs to Vitest's, then replace Protractor with a standalone `@playwright/test` config and port the e2e page object + spec file, fixing two known-broken tests along the way.

**Tech Stack:** Angular 21.2.21, `rxjs` 7.8.2 (bumped from 6.6.7), Vitest 4.0.8, `@vitest/coverage-v8` 4.0.8, jsdom 30.0.1, `vite` 8.2.1, `@analogjs/vite-plugin-angular` 2.7.0, `@angular/build` 21.2.21 (AnalogJS internal dependency only), `@playwright/test` 1.62.1.

**Spec:** `docs/superpowers/specs/2026-08-13-vitest-playwright-migration-design.md` (see its two "Amendment" sections — the original plan assumed Angular's official `@angular/build:unit-test` builder would work (Amendment 1: it doesn't, for this app's legacy build target), and after correcting that, a second retry found this app's pinned `rxjs` version is incompatible with any Vite/Vitest-based runner (Amendment 2). Both were discovered by Task-1 implementers who correctly escalated instead of guessing, and both were resolved with the user's input before this plan was corrected and re-dispatched.)

## Global Constraints

- **`rxjs` is bumped from `~6.6.7` to `^7.8.2` (Task 1, a real production `dependencies` change) — a discovered prerequisite, not a discretionary cleanup.** rxjs 6's legacy CommonJS-style packaging of `rxjs/operators` is rejected by Node's strict ESM resolver when Angular's modern bundles import it; this blocks any Vite/Vitest-based test runner for this app. Verified low-risk: the app's only rxjs usage (`Observable`, `Subscription`, `timeout`/`take` via `rxjs/operators`) is stable, unchanged API across the 6→7 boundary.
- Vitest via a standalone `vitest.config.ts` + `@analogjs/vite-plugin-angular` — NOT Angular's official `@angular/build:unit-test` builder (confirmed incompatible with this app's legacy `@angular-devkit/build-angular:browser` build target) and NOT a hand-rolled Vite config without the Angular plugin.
- `@angular/build` IS an explicit devDependency (unlike what an earlier version of this plan said) — not because this app's `build` target uses it, but because `@analogjs/vite-plugin-angular@2.7.0`'s own internals do an unconditional `require('@angular/build/private')` for any Angular major version ≥18, with no fallback if it's absent.
- `angular.json`'s `test` architect target is removed entirely — `npm test` runs `vitest run` directly.
- Test environment: jsdom.
- `vitest.config.ts` sets `test.globals: true`. **Spec files add NO import line for `describe`/`it`/`expect`/`vi`/`beforeEach`/`beforeAll`** — these are ambient globals (typed via `tsconfig.spec.json`'s `"types": ["vitest/globals", "node"]`). This is required, not a style choice: AnalogJS's `setup-vitest` helper monkey-patches the *global* `describe`/`it`/etc. to wrap Angular TestBed execution in zone.js proxy zones; an explicit per-file `import { describe, ... } from 'vitest'` would import the unpatched originals and silently break `fixture.detectChanges()`/`waitForAsync` behavior. A type-only `import type { Mock } from 'vitest'` is still needed wherever a `jasmine.Spy` cast is translated (type imports are erased, so they don't participate in this concern).
- `src/test-setup.ts` (new, replaces `src/test.ts`) contains exactly one line: `import '@analogjs/vite-plugin-angular/setup-vitest';`, wired via `vitest.config.ts`'s `setupFiles`.
- Coverage stays on `@vitest/coverage-v8`, thresholds 80/80/80/80 (statements/branches/functions/lines), same as today — opt-in via `vitest run --coverage`, matching the old `ng test --code-coverage` convention (not enabled by default in config).
- **Every bare `spyOn(obj, 'method')` (no `.and.*` chain) MUST translate to `vi.spyOn(obj, 'method').mockImplementation(...)` — never a bare `vi.spyOn(...)` alone.** Jasmine's bare `spyOn` replaces the method with a no-op by default; Vitest's `vi.spyOn` calls through to the real implementation by default unless you also stub it. Getting this wrong means tests silently start executing real side effects (writing real files via `saveFile`/`saveAs`, real DOM manipulation via `downloadFile`). This does NOT apply to direct-assignment spies (`obj.method = jasmine.createSpy(...)` → `obj.method = vi.fn()`), which are safe as bare `vi.fn()` since they fully replace the method rather than wrap it.
- **`isElementHidden`/`isMappingPanelHidden`/`isSubmitDisabled` in the new Playwright page object must return the string `'true'`/`null` (not `''`/`null`)**, matching Protractor/Selenium's boolean-attribute normalization that every existing assertion already expects — Playwright's plain-DOM `getAttribute('hidden')` returns `''` for a hidden element, not `'true'`, so the page-object method must normalize this internally rather than changing every call-site assertion.
- Plain `@playwright/test`, not a community Angular schematic package.
- `playwright.config.ts`'s `webServer` auto-starts `npm start`, Chromium-only project.
- The stale `#title` selector and the 2-spec filename collision are fixed as part of the e2e port, not ported as-is.
- Out of scope: `tslint`→`eslint` migration, removing other dead deps (`pandas-js`, `d3`, `underscore`), zoneless CD, multi-browser Playwright matrix, adding CI workflows.

---

### Task 1: Bump `rxjs` 6→7 (prerequisite for Vitest)

**Files:**
- Modify: `package.json` (`rxjs` dependency version)
- Modify: `package-lock.json` (via `npm install`)

**Interfaces:**
- Produces: this repo running on `rxjs@^7.8.2` instead of `~6.6.7`, verified safe under the EXISTING Karma/Jasmine test runner (untouched by this task) before any Vitest work begins. This isolates "did the rxjs bump alone break anything" from "does Vitest also work" — if Task 2 hits a problem later, it won't be confused with an rxjs-compatibility issue, because this task already proves rxjs 7 is safe on its own.

**Why this task exists:** an earlier attempt at Task 2 (the Vitest setup) discovered that this app's pinned `rxjs@~6.6.7` is packaged in a way that Node's strict ESM module resolver rejects when Angular's modern bundles import it — this blocks any Vite/Vitest-based test runner, not specific to any one integration approach. Angular 21 officially supports rxjs 6.5.3+ too, so this wasn't a forced fix, but the user chose to bump rxjs as the cleanest resolution (see the amended spec's "Amendment 2").

- [ ] **Step 1: Bump the `rxjs` dependency**

In `package.json`, change:
```json
"rxjs": "~6.6.7"
```
to:
```json
"rxjs": "^7.8.2"
```
(This is in `dependencies`, not `devDependencies` — a real production dependency change.)

Run: `npm install --legacy-peer-deps` (this repo's known ERESOLVE pattern — see project memory — always needs this flag).

- [ ] **Step 2: Run the full existing (Karma/Jasmine) unit test suite**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: 99/99 passing (1 pre-existing skip) — identical to the pre-bump baseline. This confirms the app's actual rxjs usage (`Observable`, `Subscription`, `timeout`/`take` via `rxjs/operators` in `read-spreadsheet.component.ts`/`read-spreadsheet.service.ts`; `Subject`, `of`, `throwError` in test files) is unaffected by the 6→7 bump. If anything fails here, STOP — this means the bump itself has a real compatibility problem with this app's code, which is a bigger issue than anything about test tooling and needs its own investigation before continuing.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: succeeds with no new errors — confirms the app itself still compiles and builds correctly with the new rxjs, independent of the test-tooling changes still to come.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Bump rxjs 6->7: discovered prerequisite for any Vite/Vitest-based test runner"
```

---

### Task 2: Stand up the Vitest builder end-to-end

**Files:**
- Create: `vitest.config.ts` (repo root)
- Create: `src/test-setup.ts`
- Modify: `angular.json` (remove the `test` architect target)
- Modify: `tsconfig.spec.json`
- Modify: `package.json` (`test` script + devDependencies/dependencies updated)
- Delete: `karma.conf.js`
- Delete: `src/test.ts`
- Modify: `src/app/app.component.spec.ts`
- Modify: `src/app/header-mapping-service/header-mapping.service.spec.ts`

**Interfaces:**
- Produces: a working `npm test` (→ `vitest run`) command, with these 2 spec files passing (11 tests total: 1 from `app.component.spec.ts`, 10 from `header-mapping.service.spec.ts` — confirmed by running both under the current Karma runner before this migration), proving the whole pipeline (AnalogJS plugin + zone.js setup + jsdom + TestBed) works end-to-end before the remaining 4 (larger) spec files are translated in later tasks.

**Note on why this task looks the way it does:** an earlier attempt at this task used Angular's official `@angular/build:unit-test` builder (per the plan's original design) and hit a hard, well-diagnosed blocker — that builder doesn't support apps whose `build` target still uses the legacy `@angular-devkit/build-angular:browser` builder, which is this app's actual configuration. Migrating the `build` target itself is a much larger, riskier, out-of-scope change. The steps below use the corrected approach instead: a standalone `vitest.config.ts` with `@analogjs/vite-plugin-angular`, which explicitly supports apps on the legacy build toolchain. `rxjs` is already bumped to 7.x by Task 1 — a prerequisite discovered on the first attempt at this corrected approach.

- [ ] **Step 1: Update `package.json`**

Remove these devDependencies entirely: `@types/jasmine`, `@types/jasminewd2`, `jasmine-core`, `jasmine-spec-reporter`, `karma`, `karma-chrome-launcher`, `karma-coverage-istanbul-reporter`, `karma-firefox-launcher`, `karma-jasmine`, `karma-jasmine-html-reporter`.

Bump `@types/node` from `"^12.11.1"` to `"^24.0.0"` (Vitest 4's peer dependency requires `^20 || ^22 || >=24`; this repo's installed Node is v24).

Add these devDependencies:
```json
"@analogjs/vite-plugin-angular": "2.7.0",
"@angular/build": "21.2.21",
"@vitest/coverage-v8": "4.0.8",
"jsdom": "30.0.1",
"vite": "8.2.1",
"vitest": "4.0.8"
```
(`@angular/build` IS needed here, even though this app's `build` target doesn't use it — `@analogjs/vite-plugin-angular@2.7.0`'s own internals do an unconditional `require('@angular/build/private')` for Angular ≥18, with no fallback if it's absent. Confirmed by reproducing the `Cannot find module '@angular/build/private'` load failure without it.)

Change the `"test"` script from `"ng test"` to `"vitest run"`.

Do not touch `protractor`/`webdriver-manager`/`chromedriver`/`ts-node` in this task — those are removed in Task 6, when the e2e side is migrated. Do not touch `tslint`/`codelyzer`/`tslint-eslint-rules` (out of scope).

Run: `npm install --legacy-peer-deps` (this repo's known ERESOLVE pattern — see project memory — always needs this flag; plain `npm install` will fail with a peer-dependency error unrelated to this change).

- [ ] **Step 2: Remove the `test` architect target from `angular.json`**

Delete the entire `test` block:
```json
"test": {
    "builder": "@angular-devkit/build-angular:karma",
    "options": {
        "main": "src/test.ts",
        "polyfills": "src/polyfills.ts",
        "tsConfig": "tsconfig.spec.json",
        "karmaConfig": "karma.conf.js",
        "assets": [
            "src/favicon.ico",
            "src/assets"
        ],
        "styles": [
            "src/styles.css"
        ],
        "scripts": []
    }
}
```
(No replacement — `vitest.config.ts`, created in Step 3, is now the single source of truth for how tests run. `ng test` is no longer a valid command after this task; `npm test` → `vitest run` is the new entry point.)

- [ ] **Step 3: Create `vitest.config.ts` at the repo root**

```typescript
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
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```
(`globals: true` is required, not a style choice — see the Global Constraints section on why. Coverage stays disabled by default; enable it per-run with `vitest run --coverage`.)

- [ ] **Step 4: Create `src/test-setup.ts`**

```typescript
import '@analogjs/vite-plugin-angular/setup-vitest';
```
(Replaces `src/test.ts`'s old manual `getTestBed().initTestEnvironment(...)` call — AnalogJS's setup helper does the equivalent zone.js/TestBed wiring, plus the global `describe`/`it`/etc. zone-patching described in the Global Constraints section.)

- [ ] **Step 5: Update `tsconfig.spec.json`**

Replace the entire file with:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": [
      "vitest/globals",
      "node"
    ]
  },
  "include": [
    "src/**/*.spec.ts",
    "src/**/*.d.ts"
  ]
}
```
(`"vitest/globals"` replaces `"jasmine"` — this ambient-types the global `describe`/`it`/`expect`/`vi`/`beforeEach`/`beforeAll`/etc. that `vitest.config.ts`'s `globals: true` injects at runtime. Dropped the `files` array — `src/test-setup.ts` is wired via `vitest.config.ts`'s `setupFiles`, not `tsconfig.spec.json`.)

- [ ] **Step 6: Delete the now-unused Karma config and old TestBed bootstrap file**

```bash
rm karma.conf.js
rm src/test.ts
```

- [ ] **Step 7: Translate `src/app/app.component.spec.ts`**

No changes needed to this file's content at all — it uses no Jasmine-specific API (`describe`/`it`/`expect`/`beforeEach`/`waitForAsync`/`TestBed` are either ambient globals now or already-correct Angular imports). Confirm it is byte-identical to its pre-migration content; if so, this step requires no edit.

- [ ] **Step 8: Translate `src/app/header-mapping-service/header-mapping.service.spec.ts`**

No changes needed to this file's content at all either, for the same reason — pure `describe`/`it`/`expect`/`beforeEach`/`TestBed`, no `spyOn`/`jasmine.*`/`.calls.*` usage. Confirm it is byte-identical to its pre-migration content.

- [ ] **Step 9: Run the two translated spec files**

Run: `npx vitest run src/app/app.component.spec.ts src/app/header-mapping-service/header-mapping.service.spec.ts`
Expected: both suites pass (11 tests total: 1 from `app.component.spec.ts`, 10 from `header-mapping.service.spec.ts`). If the AnalogJS/zone.js pipeline itself has a configuration problem, it will surface here as a build/config error rather than a test failure — resolve that before proceeding to any other task. If you hit a NEW blocker not anticipated by this corrected brief, STOP and report it the same way the previous attempt did — do not silently work around a second unanticipated incompatibility.

- [ ] **Step 10: Commit**

```bash
git add vitest.config.ts src/test-setup.ts angular.json tsconfig.spec.json package.json package-lock.json src/app/app.component.spec.ts src/app/header-mapping-service/header-mapping.service.spec.ts
git rm karma.conf.js src/test.ts
git commit -m "Stand up Vitest via @analogjs/vite-plugin-angular, remove Karma/Jasmine"
```

---

### Task 3: Translate the two small remaining unit spec files

**Files:**
- Modify: `src/app/download-file-service/download-file.service.spec.ts`
- Modify: `src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`

**Interfaces:**
- Consumes: nothing new from Task 2 beyond the now-working Vitest builder.

- [ ] **Step 1: Translate `download-file.service.spec.ts`**

Replace the entire file with (no `vitest` import line needed — `describe`/`it`/`expect`/`vi`/`beforeEach` are ambient globals per this plan's Global Constraints):
```typescript
import { TestBed } from '@angular/core/testing';

import { DownloadFileService } from './download-file.service';

describe('DownloadFileService', () => {
	let service: DownloadFileService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [DownloadFileService] });
		service = TestBed.inject(DownloadFileService);
	});

	it('should be created', () => {
		const dFService: DownloadFileService = TestBed.inject(DownloadFileService);
		expect(dFService).toBeTruthy();
	});

	it('should download example files', () => {

		// create spy object with a click() method
		const spyObj = { click: vi.fn() };
		// spy on document.createElement() and return the spy object
		vi.spyOn(document, 'createElement').mockReturnValue(spyObj as unknown as HTMLElement);

		service.downloadFile('../assets/files-to-read/', 'example.msp');

		expect(document.createElement).toHaveBeenCalledTimes(1);
		expect(document.createElement).toHaveBeenCalledWith('a');

		expect((spyObj as any).href).toBe('../assets/files-to-read/example.msp');
		expect((spyObj as any).target).toBe('_blank');
		expect((spyObj as any).download).toBe('example.msp');
		expect(spyObj.click).toHaveBeenCalledTimes(1);
		expect(spyObj.click).toHaveBeenCalledWith();
	});
});
```
(`jasmine.createSpyObj('a', ['click'])` → a plain `{ click: vi.fn() }` object, since Vitest has no built-in `createSpyObj` equivalent. `spyOn(document, 'createElement').and.returnValue(spyObj)` → `vi.spyOn(document, 'createElement').mockReturnValue(spyObj as unknown as HTMLElement)` — cast needed since the real `createElement` return type doesn't structurally match a bare `{ click }` object. The service's `downloadFile` method sets `.href`/`.target`/`.download` on the object it gets back from `createElement`, which is why the assertions read them back with an `any` cast — those properties don't exist on the plain object's declared type.)

- [ ] **Step 2: Translate `read-spreadsheet.service.spec.ts`**

Replace the entire file with (no `vitest` import line needed — same reason as Step 1):
```typescript
import { TestBed } from '@angular/core/testing';
import { ReadSpreadsheetService } from './read-spreadsheet.service';
import { BuildMspService } from '../build-msp-service/build-msp.service';

import { Observable } from 'rxjs';

describe('ReadSpreadsheetService', () => {
	let service: ReadSpreadsheetService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [ReadSpreadsheetService, BuildMspService] });
		service = TestBed.inject(ReadSpreadsheetService);
	});

	   it('should be created', () => {
		const rsService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		expect(rsService).toBeTruthy();
	});

	it('should return observable from readXlsx', () => {

		const blob = new Blob(['text'], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.xlsx';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		expect(service.readXlsx(fileList) instanceof Observable).toBe(true);
	});

	it('should return observable from readAlignmentResultTxt', () => {
		const blob = new Blob(['text'], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.txt';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		expect(service.readAlignmentResultTxt(fileList) instanceof Observable).toBe(true);
	});

	it('should parse tab-delimited text into a 2D array of strings', (done) => {
		const content = 'Alignment ID\tAverage Rt(min)\tMetabolite name\n1\t6.23\t1-Methyltryptophan\n';
		const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.txt';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		service.readAlignmentResultTxt(fileList).subscribe(msmsArray => {
			expect(msmsArray).toEqual([
				['Alignment ID', 'Average Rt(min)', 'Metabolite name'],
				['1', '6.23', '1-Methyltryptophan']
			]);
			done();
		});
	});

	it('should not produce a trailing empty row for a file ending in a newline', (done) => {
		const content = 'Alignment ID\tAverage Rt(min)\n1\t6.23\n';
		const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.txt';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		service.readAlignmentResultTxt(fileList).subscribe(msmsArray => {
			expect(msmsArray.length).toBe(2);
			done();
		});
	});

	it('should not produce an extra row for a whitespace-only line between real data lines', (done) => {
		const content = 'Alignment ID\tAverage Rt(min)\n1\t6.23\n\t\t\n2\t9.543\n';
		const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.txt';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		service.readAlignmentResultTxt(fileList).subscribe(msmsArray => {
			expect(msmsArray).toEqual([
				['Alignment ID', 'Average Rt(min)'],
				['1', '6.23'],
				['2', '9.543']
			]);
			done();
		});
	});

	it.skip('should call buildMspFile from subscriber', () => {

		const blob = new Blob(['0', '1', '2'], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.xlsx';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
        } as unknown as FileList;

		const errorText = '';
		const bMService = TestBed.inject(BuildMspService);
		bMService.buildMspFile = vi.fn();

		const observable = service.readXlsx(fileList);
		observable.subscribe({
			next(arr) {
				bMService.buildMspFile(arr, file.name, '');
				expect(bMService.buildMspFile).toHaveBeenCalled();
			},
			error(err) { console.error('something wrong occurred: ' + err); },
			complete() {
				console.log('Done');
			}
		});
	});

});
```
(Only two changes from the original (besides dropping the now-unneeded `vitest` import): `xit(...)` → `it.skip(...)`, and `jasmine.createSpy('bMF spy')` → `vi.fn()` — a direct method-replacement assignment, safe as a bare `vi.fn()` since it fully replaces `buildMspFile` rather than wrapping it. Every other line, including the `(done) => {...}` async-completion callback style, is unchanged — Vitest supports the same `done`-callback test signature.)

- [ ] **Step 3: Run both translated files**

Run: `npx vitest run src/app/download-file-service/download-file.service.spec.ts src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`
Expected: `download-file.service.spec.ts` — 2/2 passing. `read-spreadsheet.service.spec.ts` — 6 passing, 1 skipped (the `it.skip`'d test, matching today's `xit`-skipped behavior). Combined: 9 total, 8 passing, 1 skipped.

- [ ] **Step 4: Commit**

```bash
git add src/app/download-file-service/download-file.service.spec.ts src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts
git commit -m "Translate download-file and read-spreadsheet service specs to Vitest"
```

---

### Task 4: Translate `build-msp.service.spec.ts`

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.spec.ts`

**Interfaces:**
- Consumes: the Global Constraint's bare-`spyOn` rule (every bare `spyOn(service, 'saveFile')` in this file must get `.mockImplementation(() => {})`, since `saveFile`'s real body calls `saveAs()` from `file-saver`, which must never actually run during a test).

- [ ] **Step 1: Add the type-only `Mock` import**

Add as the new first line of the file:
```typescript
import type { Mock } from 'vitest';
```
(No runtime `vitest` import for `describe`/`it`/`expect`/`vi`/`beforeAll`/`beforeEach` — those are ambient globals per this plan's Global Constraints. `Mock` is a compile-time-only type (erased at build time, doesn't participate in the globals-vs-import concern), needed for the `jasmine.Spy` cast translations below.)

- [ ] **Step 2: Translate the single bare `spyOn` with no `.and.*` chain**

Find:
```typescript
		it('should call lineHasHeaders', () => {
			spyOn(service, 'lineHasHeaders');
			service.buildMspFile(arr, name, '');
			expect(service.lineHasHeaders).toHaveBeenCalled();
		});
```
Replace with:
```typescript
		it('should call lineHasHeaders', () => {
			vi.spyOn(service, 'lineHasHeaders').mockImplementation(() => false);
			service.buildMspFile(arr, name, '');
			expect(service.lineHasHeaders).toHaveBeenCalled();
		});
```

- [ ] **Step 3: Translate the 10 direct-assignment `jasmine.createSpy` lines**

Find (inside `'should call functions from buildMspFile()'`):
```typescript
			service.getHeaderPosition = jasmine.createSpy('getHeaderPosition() spy').and.returnValue(0);
			service.processText = jasmine.createSpy('processText() spy').and.returnValue(arr[0]);
			service.hasHeaderErrors = jasmine.createSpy('hasHeaderErrors() spy').and.returnValue(false);
			service.buildJsonArray = jasmine.createSpy('buildJsonArray() spy').and.returnValue(jsonArr);
			service.removeAttributes = jasmine.createSpy('removeAttributes() spy').and.returnValue(jsonArr);
			service.collectMissingData = jasmine.createSpy('collectMissingData() spy');
			service.removeDuplicates = jasmine.createSpy('removeDuplicates() spy').and.returnValue(jsonArr);
			service.removeRowsWithoutSpectrum = jasmine.createSpy('removeRowsWithoutSpectrum() spy').and.returnValue(jsonArr);
			service.buildMspStringFromArray = jasmine.createSpy('buildMspStringFromArray() spy').and.returnValue(testStr);
			service.saveFile = jasmine.createSpy('saveFile() spy');
```
Replace with (these are direct method-replacement assignments, not `spyOn`-wrapped — safe as bare `vi.fn()` where no return value is needed):
```typescript
			service.getHeaderPosition = vi.fn().mockReturnValue(0);
			service.processText = vi.fn().mockReturnValue(arr[0]);
			service.hasHeaderErrors = vi.fn().mockReturnValue(false);
			service.buildJsonArray = vi.fn().mockReturnValue(jsonArr);
			service.removeAttributes = vi.fn().mockReturnValue(jsonArr);
			service.collectMissingData = vi.fn();
			service.removeDuplicates = vi.fn().mockReturnValue(jsonArr);
			service.removeRowsWithoutSpectrum = vi.fn().mockReturnValue(jsonArr);
			service.buildMspStringFromArray = vi.fn().mockReturnValue(testStr);
			service.saveFile = vi.fn();
```

- [ ] **Step 4: Translate the 4 bare `spyOn(service, 'saveFile')` calls**

There are 4 occurrences of this exact line, each as the first line of its `it(...)` block (inside: `'should build the .msp string applying msdial-specific rules...'`, `'should drop a row missing only its spectrum...'`, `'should accept a file whose headers only match via user-supplied mapping...'`, `'should include a comment-mapped column's per-row value...'`). In every one of these 4 places, find:
```typescript
			spyOn(service, 'saveFile');
```
Replace with:
```typescript
			vi.spyOn(service, 'saveFile').mockImplementation(() => {});
```
(`saveFile`'s real body calls `saveAs(blob, name)` from `file-saver`, which must never actually execute during a test — a bare `vi.spyOn` without `.mockImplementation` would call through and attempt a real file save.)

- [ ] **Step 5: Translate the 4 `jasmine.Spy` cast + `.calls.mostRecent()` lines**

There are 4 occurrences of this exact pattern (one per test listed in Step 4, immediately after the `buildMspFile(...)` call in each). Find:
```typescript
			const mspString = (service.saveFile as jasmine.Spy).calls.mostRecent().args[0] as string;
```
Replace with:
```typescript
			const mspString = (service.saveFile as Mock).mock.calls.at(-1)[0] as string;
```

- [ ] **Step 6: Run the translated file**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts`
Expected: 51/51 passing (same count as before this translation — no test bodies changed, only the spy-creation API).

- [ ] **Step 7: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "Translate build-msp.service.spec.ts to Vitest"
```

---

### Task 5: Translate `read-spreadsheet.component.spec.ts`

**Files:**
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`

**Interfaces:**
- Consumes: the same bare-`spyOn` rule from the plan's Global Constraints (first exercised heavily in Task 4) — this file has several bare `spyOn(...)` calls on methods with real, non-trivial side effects (`downloadExample`, `fileSelected`, `downloadFile`, `saveErrorFile`) that must not call through.

- [ ] **Step 1: No import changes needed**

This file's existing import line (`import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';`) and every other import (`CUSTOM_ELEMENTS_SCHEMA`, `CommonModule`, `FormsModule`, `ReadSpreadsheetComponent`, `BuildMspService`, `ReadSpreadsheetService`, `path`, and the `rxjs` import of `Observable, of, throwError, Subject`) stay exactly as-is — no `vitest` import line is added, since `describe`/`it`/`expect`/`vi`/`beforeEach` are ambient globals per this plan's Global Constraints, and this file has no `jasmine.Spy` type cast (so no type-only `Mock` import is needed here either, unlike Task 4's file).

- [ ] **Step 2: Translate the 3 bare `spyOn` calls with no `.and.*` chain**

Find (3 separate occurrences — one in `'should call downloadExample when user clicks <a>'`, two identical ones in `'should call fileSelected when change event occurs'` and `'should call readFile when submit button is clicked'`):
```typescript
		spyOn(component, 'downloadExample');
```
```typescript
		spyOn(component, 'fileSelected');
```
(appearing twice, once per test)

Replace each with:
```typescript
		vi.spyOn(component, 'downloadExample').mockImplementation(() => {});
```
```typescript
		vi.spyOn(component, 'fileSelected').mockImplementation(() => {});
```
(both `downloadExample` and `fileSelected` have real side-effecting bodies — DOM/file-download calls and component-state mutation respectively — that must not run when these tests are only checking that the methods were *called*, not what they do.)

- [ ] **Step 3: Translate the `.and.returnValue(...)`-chained `spyOn` calls**

Find each of these 8 lines (each appears once, in the test named in the surrounding comment) and apply the same mechanical substitution (`spyOn(...)` → `vi.spyOn(...)`, `.and.returnValue(x)` → `.mockReturnValue(x)`):

```typescript
// in 'should eagerly parse the file and populate headerMappings on a valid file selection'
spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([
```
→
```typescript
vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(of([
```

```typescript
// in 'should pass the cached array and headerMappings to buildMspFile on submit...'
const readSpy = spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([
```
→
```typescript
const readSpy = vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(of([
```

```typescript
// same test, next line
spyOn(component.buildMspService, 'buildMspFile').and.returnValue('');
```
→
```typescript
vi.spyOn(component.buildMspService, 'buildMspFile').mockReturnValue('');
```

```typescript
// in 'should clear headerMappings when no header row is found while parsing'
spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([['not', 'a', 'header', 'row']]));
spyOn(component.buildMspService, 'getHeaderPosition').and.returnValue(-1);
```
→
```typescript
vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(of([['not', 'a', 'header', 'row']]));
vi.spyOn(component.buildMspService, 'getHeaderPosition').mockReturnValue(-1);
```

```typescript
// in 'should clear cachedMsmsArray and headerMappings when parsing the selected file errors'
spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(throwError(() => new Error('boom')));
```
→
```typescript
vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(throwError(() => new Error('boom')));
```

```typescript
// in 'should set parsing=true and disable Submit while the async parse is still in flight (C1)'
spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(new Observable<string[][]>(subscriber => {
```
→
```typescript
vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(new Observable<string[][]>(subscriber => {
```

```typescript
// in 'should report ".msp created with some issues"...'
spyOn(component.buildMspService, 'buildMspFile').and.returnValue('some error text');
```
→
```typescript
vi.spyOn(component.buildMspService, 'buildMspFile').mockReturnValue('some error text');
```

```typescript
// in 'should report "Fix errors, then retry upload"...'
spyOn(component.buildMspService, 'buildMspFile').and.returnValue('fatal error text');
```
→
```typescript
vi.spyOn(component.buildMspService, 'buildMspFile').mockReturnValue('fatal error text');
```

- [ ] **Step 4: Translate the `.and.returnValues(...)` (plural) call**

Find (in `'should not let a stale, slower parse subscription overwrite a later file selection's cached state (I1)'`):
```typescript
		spyOn(readSpreadsheetService, 'readXlsx').and.returnValues(
			fileASubject.asObservable(),
			fileBSubject.asObservable()
		);
```
Replace with:
```typescript
		vi.spyOn(readSpreadsheetService, 'readXlsx')
			.mockReturnValueOnce(fileASubject.asObservable())
			.mockReturnValueOnce(fileBSubject.asObservable());
```

- [ ] **Step 5: Translate the remaining bare `spyOn` calls with side-effecting real bodies**

Find (in `'should call downloadFileService.downloadFile with the mapped file name when downloadExample is called'`):
```typescript
		spyOn(downloadFileService, 'downloadFile');
```
Replace with:
```typescript
		vi.spyOn(downloadFileService, 'downloadFile').mockImplementation(() => {});
```

Find (in `'should delegate to buildMspService.saveErrorFile with a derived file name when getErrorFile is called'`):
```typescript
		spyOn(component.buildMspService, 'saveErrorFile');
```
Replace with:
```typescript
		vi.spyOn(component.buildMspService, 'saveErrorFile').mockImplementation(() => {});
```
(`saveErrorFile`'s real body ultimately calls `saveFile` → `saveAs`, a real download side effect that must not run.)

- [ ] **Step 6: Translate the `jasmine.any(...)` matcher usage**

Find (in `'should pass the cached array and headerMappings to buildMspFile on submit...'`):
```typescript
		expect(component.buildMspService.buildMspFile).toHaveBeenCalledWith(
			[['METABOLITE NAME'], ['Test Compound']],
			jasmine.any(String),
			jasmine.any(String),
			'spreadsheet',
			component.headerMappings
		);
```
Replace with:
```typescript
		expect(component.buildMspService.buildMspFile).toHaveBeenCalledWith(
			[['METABOLITE NAME'], ['Test Compound']],
			expect.any(String),
			expect.any(String),
			'spreadsheet',
			component.headerMappings
		);
```

- [ ] **Step 7: Run the translated file**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: 29/29 passing (same count as before this translation).

- [ ] **Step 8: Run the full unit suite**

Run: `npx vitest run`
Expected: 99/99 passing (1 pre-existing skip, matching the `it.skip` from Task 3) — no regressions across any of the 6 translated files.

- [ ] **Step 9: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.spec.ts
git commit -m "Translate read-spreadsheet.component.spec.ts to Vitest"
```

---

### Task 6: Add Playwright, remove Protractor

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json` (scripts + devDependencies)
- Modify: `angular.json` (remove the `e2e` architect target)
- Delete: `e2e/protractor.conf.js`
- Delete: `e2e/protractor-ci.conf.js`
- Delete: `e2e/tsconfig.json`

**Interfaces:**
- Produces: `npx playwright test` as the e2e entry point; `playwright.config.ts`'s `testDir: './e2e/src'` is what Task 7/8 will populate.

- [ ] **Step 1: Update `package.json`**

Remove these devDependencies entirely: `protractor`, `webdriver-manager`, `ts-node` (confirmed used only by `e2e/protractor.conf.js`, which this task deletes). Remove `chromedriver` from `dependencies`.

Add `"@playwright/test": "1.62.1"` to devDependencies.

Change the `"e2e"` script from `"ng e2e"` to `"playwright test"`.

Run: `npm install --legacy-peer-deps`
Run: `npx playwright install chromium` (downloads the Chromium browser binary Playwright needs — a one-time, machine-local setup step, not a repo file change).

- [ ] **Step 2: Remove the `e2e` architect target from `angular.json`**

Delete the entire `e2e` block:
```json
"e2e": {
    "builder": "@angular-devkit/build-angular:protractor",
    "options": {
        "protractorConfig": "e2e/protractor.conf.js",
        "devServerTarget": "Read-Spreadsheet:serve"
    },
    "configurations": {
        "production": {
            "devServerTarget": "Read-Spreadsheet:serve:production"
        }
    }
}
```
(Nothing depends on this target once `package.json`'s `e2e` script points at `playwright test` directly — the target only ever threw a permanent stub error anyway.)

- [ ] **Step 3: Create `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/src',
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4200',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npm start',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
});
```
(`fullyParallel: false` matches this suite's existing serial execution model — several tests write to fixed, shared filenames under `./e2e/downloads/`, and the suite was never designed for concurrent workers.)

- [ ] **Step 4: Delete the old Protractor config files**

```bash
rm e2e/protractor.conf.js
rm e2e/protractor-ci.conf.js
rm e2e/tsconfig.json
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts package.json package-lock.json angular.json
git rm e2e/protractor.conf.js e2e/protractor-ci.conf.js e2e/tsconfig.json
git commit -m "Add Playwright, remove Protractor config and dependencies"
```

(This task intentionally leaves `e2e/src/app.po.ts` and `e2e/src/app.e2e-spec.ts` untouched and still Protractor-shaped — they're translated in Tasks 7 and 8. The e2e suite will not run correctly between this task and Task 8's completion; that's expected and reflects the natural sequencing of a config-then-content migration.)

---

### Task 7: Port `app.po.ts` to Playwright

**Files:**
- Modify: `e2e/src/app.po.ts`

**Interfaces:**
- Produces: `AppPage` class (constructor takes a Playwright `Page`), plus two standalone functions `deleteDownloads()` and `fileExists(name: string): boolean` (extracted out of the class since they have no dependency on a `Page` instance). New methods `submitFileAndWaitForDownload(): Promise<Download>` and `downloadErrorFile(): Promise<Download>` that Task 8 will use for real on-disk download verification.
- Consumes: nothing from earlier tasks — this file has no dependency on the unit-test side.

- [ ] **Step 1: Replace the entire file**

```typescript
import { Page, Download } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export function deleteDownloads() {
    let files: string[];
    let filePath: string;
    const dirPath = './e2e/downloads';
    try {
        files = fs.readdirSync(dirPath);
    } catch (e) {
        return;
    }
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
    }
    fs.rmdirSync(dirPath);
}

export function fileExists(name: string): boolean {
    return fs.existsSync(name);
}

export class AppPage {
    constructor(private page: Page) {}

    async navigateTo() {
        await this.page.goto('/');
    }

    async getTitleText(): Promise<string> {
        return this.page.locator('.app-navbar__brand').innerText();
    }

    getElementById(identifier: string) {
        return this.page.locator('#' + identifier);
    }

    async elementExists(identifier: string): Promise<boolean> {
        return (await this.page.locator('#' + identifier).count()) > 0;
    }

    async isElementHidden(identifier: string): Promise<string | null> {
        // Protractor/Selenium's getAttribute('hidden') normalized a hidden boolean
        // property to the string 'true'; Playwright's plain-DOM getAttribute returns
        // '' for a hidden element. Normalize here so every existing call-site
        // assertion (.toBe('true') / .toBe(null)) keeps working unchanged.
        const attr = await this.page.locator('#' + identifier).getAttribute('hidden');
        return attr !== null ? 'true' : null;
    }

    async uploadSpreadsheet(fileName: string) {
        const absolutePath = path.resolve(__dirname, fileName);
        await this.page.locator('input[type="file"]').setInputFiles(absolutePath);
    }

    async isSubmitDisabled(): Promise<string | null> {
        const attr = await this.page.locator('#submit').getAttribute('disabled');
        return attr !== null ? 'true' : null;
    }

    async submitFile() {
        await this.page.locator('#submit').click();
    }

    async submitFileAndWaitForDownload(): Promise<Download> {
        const [download] = await Promise.all([
            this.page.waitForEvent('download'),
            this.page.locator('#submit').click(),
        ]);
        return download;
    }

    async getErrorText(): Promise<string> {
        return this.page.locator('#error-text').innerText();
    }

    async downloadErrorFile(): Promise<Download> {
        const [download] = await Promise.all([
            this.page.waitForEvent('download'),
            this.page.locator('#get-error-file').click(),
        ]);
        return download;
    }

    async toggleMappingPanel() {
        await this.page.locator('#show-mapping-button').click();
    }

    async isMappingPanelHidden(): Promise<string | null> {
        const attr = await this.page.locator('#mapping-table').getAttribute('hidden');
        return attr !== null ? 'true' : null;
    }

    async isMappingRowPresent(header: string): Promise<boolean> {
        return (await this.page.locator(`tr[data-header="${header}"]`).count()) > 0;
    }

    async selectMappingOption(header: string, optionText: string) {
        await this.page.locator(`tr[data-header="${header}"] select`).selectOption({ label: optionText });
    }
}
```

Notes on specific translations:
- `getTitleText()` now targets `.app-navbar__brand` (the actual `<h1>` in `app.component.html`'s navbar, containing the text "MSP Creator") instead of the old `app-root #page-wrapper read-spreadsheet #title` selector — that selector targeted an element inside `read-spreadsheet` that has never existed under that ID since the PR #85 navy/gold redesign moved the title into a sibling `<header>` outside `#page-wrapper` entirely. This fixes the suite's first, always-failing test.
- `selectMappingOption` now uses Playwright's native `selectOption({ label: ... })` instead of Protractor's click-on-`<option>`-by-text-match workaround — a real `<select>` element API, not a manual click simulation.
- `submitFileAndWaitForDownload`/`downloadErrorFile` race a real `page.waitForEvent('download')` against the click that triggers it, returning Playwright's `Download` object — this is what actually fixes the pre-existing "headless Chrome doesn't honor legacy download prefs" bug: Playwright's download event fires regardless of the browser's OS-level download-directory configuration.

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit -p tsconfig.json` (or equivalent — this file has no dedicated tsconfig anymore since `e2e/tsconfig.json` was deleted in Task 6; confirm it type-checks under the root `tsconfig.json`, and if it doesn't compile under that config, escalate rather than guessing at a new e2e-specific tsconfig — that would be a plan gap to report, not silently patch).

- [ ] **Step 3: Commit**

```bash
git add e2e/src/app.po.ts
git commit -m "Port app.po.ts from Protractor to Playwright"
```

---

### Task 8: Port `app.e2e-spec.ts` to Playwright

**Files:**
- Modify: `e2e/src/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `AppPage` (constructor `(page: Page)`), `deleteDownloads()`, `fileExists(name): boolean` from Task 7's `app.po.ts`.

- [ ] **Step 1: Replace the entire file**

```typescript
import { test, expect } from '@playwright/test';
import { AppPage, deleteDownloads, fileExists } from './app.po';
import * as fs from 'fs';

test.describe.configure({ mode: 'serial' });

test.describe('workspace-project App', () => {
    let page: AppPage;
    const consoleErrors: string[] = [];

    test.beforeAll(() => {
        deleteDownloads();
    });

    test.beforeEach(async ({ page: rawPage }) => {
        consoleErrors.length = 0;
        rawPage.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        rawPage.on('pageerror', err => {
            consoleErrors.push(err.message);
        });
        page = new AppPage(rawPage);
        await page.navigateTo();
    });

    test.afterEach(() => {
        expect(consoleErrors).toEqual([]);
    });

    test.afterAll(() => {
        deleteDownloads();
    });

    test('should have instruction elements', async () => {
        expect(await page.elementExists('instructions')).toBe(true);
        expect(await page.elementExists('examples')).toBe(true);
        expect(await page.elementExists('file-name-text')).toBe(true);
        expect(await page.getTitleText()).toEqual('MSP Creator');
    });

    test('should have interaction elements', async () => {
        expect(await page.elementExists('rs-buttons')).toBe(true);
        expect(await page.elementExists('file-input')).toBe(true);
        expect(await page.elementExists('submit')).toBe(true);
    });

    test('should have correctly disabled and hidden elements to start', async () => {
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should have a hidden error box and enabled submit button after uploading a valid .xlsx spreadsheet', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should have button and error box states change when uploading valid and then invalid files', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
    });

    test('should have button and error box states change when uploading invalid and then valid files', async () => {
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should have disabled submit button, correct error text with an unsupported file extension', async () => {
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
        const text = 'Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers, .txt';
        expect(await page.getErrorText()).toEqual(text);
    });

    test('should not show error file button when uploading wrong file type', async () => {
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('error-file')).toBe('true');
    });

    test('should download .msp with small complete file', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created');
    });

    test('should download .msp and show error box with small file with duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small_duplicates.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created with some issues');
        const errorFile = './e2e/downloads/error_file_Height_0_20198281030_QTOF_small_duplicates.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should download .msp and show error box with large file with missing data', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20197191136negCSH_columns_renamed.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20197191136negCSH_columns_renamed.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created with some issues');
    });

    test('should download error file when submitting small file with duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        await download.saveAs('./e2e/downloads/Height_0_20198281030_QTOF_small_duplicates.txt');
        const errorFile = './e2e/downloads/error_file_Height_0_20198281030_QTOF_small_duplicates.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should download error file when submitting large file with missing data', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20197191136negCSH_columns_renamed.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        await download.saveAs('./e2e/downloads/Height_0_20197191136negCSH_columns_renamed.txt');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('error-file')).toBe(null);
        const errorFile = './e2e/downloads/error_file_Height_0_20197191136negCSH_columns_renamed.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should NOT show error box with medium sized complete file', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe('true');
    });

    test('should have correct error text when user submits file that does not exist', async () => {
        const BOM = '﻿';
        const testData = BOM + 'test,data\ntest,data';
        const dummyPath = './e2e/testing-files/not_a_file.csv';
        fs.writeFileSync(dummyPath, testData);
        await page.uploadSpreadsheet('../testing-files/not_a_file.csv');
        fs.unlinkSync(dummyPath);
        await page.submitFile();
        expect(await page.isElementHidden('error-box')).toBe(null);
        const text = 'Error: file may be corrupted or may not exist; Check uploaded file';
        expect(await page.getErrorText()).toEqual(text);
    });

    test('should tell the user that headers are not found', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_no_headers.ods');
        await page.submitFile();
        const text = 'Error: column headers not found';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
    });

    test('should tell the user what headers are missing', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20197191136negCSH.xlsx');
        await page.submitFile();
        const text = 'These headers may be misspelled or missing: ADDUCT TYPE';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
    });

    test('should tell the user headers are not found when uploading a comma-delimited .txt file', async () => {
        await page.uploadSpreadsheet('../testing-files/test_spreadsheet.txt');
        expect(await page.isSubmitDisabled()).toBe(null);
        await page.submitFile();
        const text = 'Error: column headers not found';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
    });

    test('should have a hidden error box and enabled submit button after uploading a valid MS-DIAL AlignmentResult .txt file', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should download .msp from a MS-DIAL AlignmentResult .txt file, keeping the Unknown-but-spectrum row and dropping the no-spectrum row', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/msdial_alignment_result_small.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        const text = 'Warning: Some entries have missing data; these attributes were left blank';
        expect(await page.getErrorText()).toEqual(text);
        const mspContent = fs.readFileSync(name, 'utf8');
        expect(mspContent).toContain('Name: 1-Methyltryptophan');
        expect(mspContent).toContain('Name: Unknown');
        expect(mspContent).not.toContain('ShouldBeFiltered');
    });

    test('should download an error file listing the msdial row with missing data', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        const download = await page.submitFileAndWaitForDownload();
        await download.saveAs('./e2e/downloads/msdial_alignment_result_small.txt');
        const errorFile = './e2e/downloads/error_file_msdial_alignment_result_small.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should show a hidden-by-default mapping panel after uploading a file with unmatched columns', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        expect(await page.elementExists('show-mapping-button')).toBe(true);
        expect(await page.isMappingPanelHidden()).toBe('true');
    });

    test('should exclude a Sample N style column from the mapping panel', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        await page.toggleMappingPanel();
        expect(await page.isMappingRowPresent('SAMPLE 1')).toBe(false);
        expect(await page.isMappingRowPresent('NOTES')).toBe(true);
    });

    test('should include a user-added MSP Comment from an unmatched column after a mapping override', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        await page.toggleMappingPanel();
        await page.selectMappingOption('NOTES', 'Add as comment');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/msdial_alignment_result_with_extra_column_override.txt';
        await download.saveAs(name);
        const mspContent = fs.readFileSync(name, 'utf8');
        expect(mspContent).toContain('Comments: NOTES: Interesting peak');
    });

    test('should still download an unmodified .msp when the mapping panel is left untouched', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/msdial_alignment_result_with_extra_column_untouched.txt';
        await download.saveAs(name);
        const mspContent = fs.readFileSync(name, 'utf8');
        expect(mspContent).toContain('Name: 1-Methyltryptophan');
        expect(mspContent).not.toContain('Comments:');
        expect(mspContent).not.toContain('Interesting peak');
    });
});
```

Notes on specific translations:
- `browser.waitForAngularEnabled(false)` is dropped everywhere — that was a Protractor-specific workaround for Angular zone-stability detection; Playwright has no equivalent need.
- The `afterEach` console-error check is reimplemented via `page.on('console', ...)` (filtered to `'error'`-type messages) plus `page.on('pageerror', ...)` for uncaught exceptions, replacing Protractor's `browser.manage().logs().get(logging.Type.BROWSER)` + `jasmine.objectContaining` check.
- The two previously filename-colliding specs (`'...mapping override'` and `'...left untouched'`) now save to `msdial_alignment_result_with_extra_column_override.txt` and `msdial_alignment_result_with_extra_column_untouched.txt` respectively — distinct filenames, fixing the collision.
- The "file does not exist" test uses synchronous `fs.writeFileSync`/`fs.unlinkSync` instead of the old `browser.driver.wait`-based polling — Node's synchronous fs calls complete in one call, no polling needed.
- Every download-verifying test now uses `submitFileAndWaitForDownload()`/`downloadErrorFile()` (Task 7) instead of a `browser.driver.wait(() => fs.existsSync(...))` polling loop — this is the concrete fix for the pre-existing "no download ever verifiable under headless Chrome" bug.

- [ ] **Step 2: Run the full Playwright suite against a real dev server**

Run: `npx playwright test`
Expected: all 25 specs pass (Playwright's `webServer` config auto-starts `npm start` and waits for `http://localhost:4200` to respond before running tests).

- [ ] **Step 3: Fix any failures**

If a locator or timing issue surfaces that isn't accounted for above, adjust `app.po.ts`/`app.e2e-spec.ts` accordingly — do not touch application source code (`src/app/**`) to work around an e2e issue; if a failure looks like a genuine application bug rather than a test-porting issue, stop and report it rather than patching around it.

- [ ] **Step 4: Commit**

```bash
git add e2e/src/app.e2e-spec.ts
git commit -m "Port app.e2e-spec.ts from Protractor to Playwright, fixing the stale title selector and filename collision"
```

---

### Task 9: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite with coverage**

Run: `npx vitest run --coverage`
Expected: 99/99 passing (1 pre-existing skip), coverage ≥80% on all four metrics (statements/branches/functions/lines) — matching the Karma-era baseline. If any metric falls short, add the missing test case(s) to the relevant spec file (spec-only changes, no implementation changes for coverage's sake) and re-run.

- [ ] **Step 2: Run the full Playwright suite once more**

Run: `npx playwright test`
Expected: 25/25 passing.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: succeeds with no new errors (the `build`/`serve` targets are unaffected by this migration, but this confirms nothing in `angular.json`/`tsconfig.json` was accidentally broken).

- [ ] **Step 4: Confirm `ng lint` status is unchanged**

Run: `npm run lint`
Expected: same pre-existing failure as before this migration (`Cannot find "lint" target for the specified project` — this is separately tracked debt, untouched by this plan). If this migration somehow changed that error's shape, investigate — otherwise, no action needed.

- [ ] **Step 5: Restart the dev server and manually verify**

Run: `./dev-stop.sh && ./dev-start.sh`, then in a browser: upload a file, submit, confirm the `.msp` downloads correctly and the mapping panel still works — this migration's application-facing change is limited to the rxjs 6→7 bump (Task 1), already verified safe under both Karma (Task 1) and the app's own build (Task 1, Step 3); the rest is test tooling only, so the running app's behavior should be unchanged.

- [ ] **Step 6: Commit any fixes from this task**

```bash
git add -A
git commit -m "Fix coverage/build issues found in full regression pass"
```

(Only if Steps 1–4 required changes; skip this commit if everything passed cleanly.)
