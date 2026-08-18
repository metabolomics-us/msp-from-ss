# Angular 22 QA Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 30 findings from the "MSP Creator Health Check" Angular 22 QA audit (performance, code quality/cleanup, and testing/coverage), each isolated into its own branch and PR so risk stays bounded and reviewable.

**Architecture:** Eight sequential phases, each its own git branch merged to `master` via `/gw:merge-it` before the next phase starts (later phases assume earlier ones already landed). Phases are ordered low-risk → high-risk: mechanical cleanup, dependency hygiene, lint setup, architecture/typing cleanup, TS strict mode, standalone component migration, Web Worker parsing, test quality/coverage.

**Tech Stack:** Angular 22.1.2, Angular Material/CDK, RxJS 7.8, Vitest 4 (+ `@analogjs/vite-plugin-angular`), Playwright 1.62, TypeScript ~6.0.3, xlsx (SheetJS), file-saver.

**Spec:** The "MSP Creator Health Check" report (published artifact, findings coded P1–P8 performance, Q1–Q18 quality, T1–T4 testing — referenced by those codes throughout this plan).

## Global Constraints

- Branch per phase, name `<type>/<description>` (e.g. `fix/mechanical-cleanup`) — never commit to `master` directly.
- TDD where the change has new/changed behavior: failing test first, implement, refactor, commit. Pure deletions/renames with existing coverage use "run suite for baseline → change → run suite again" instead of a new failing test — there's nothing to fail.
- No code without a test; no mocks/stubs/fakes in new or rewritten tests — real dependencies only (this is exactly what Phase 8 fixes existing violations of).
- 80%+ coverage (statements, branches, functions, lines) — must hold after every phase; verify with `npx vitest run --coverage`.
- Full verification before every commit that touches source: `npm test`, and before opening a PR: `npm run build`.
- Ship every phase via `/gw:merge-it` — never merge manually.
- TypeScript strict, no `any` introduced in **new** code (Phase 5 deals with **existing** `any`/non-strict code separately, per its own task).

---

## Phase 1 — Mechanical cleanup (branch: `fix/mechanical-cleanup`)

Behavior-preserving cleanup covered by existing tests. No new tests needed; each task runs the full suite before and after as its safety net.

**Files:**
- Delete: `src/app/app.component-old.html`
- Modify: `src/app/app.module.ts`
- Modify: `src/app/build-msp-service/build-msp.service.ts`
- Modify: `src/app/build-msp-service/build-msp.service.spec.ts` (only the `underscore` removal's dependent test stays unchanged — no test edits needed here since behavior is identical)
- Modify: `src/app/declare-modules.d.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
- Modify: `src/app/app.component.ts`
- Modify: `package.json`
- Modify: `docker/nginx.conf`

### Task 1: Delete dead placeholder file (Q4)

- [ ] **Step 1: Run baseline**

Run: `npm test`
Expected: all suites PASS (this is your baseline — nothing here should reference the file you're about to delete)

- [ ] **Step 2: Confirm nothing references it**

Run: `grep -rn "app.component-old" src/ e2e/ --include="*.ts" --include="*.html"`
Expected: no output

- [ ] **Step 3: Delete the file**

```bash
rm src/app/app.component-old.html
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead app.component-old.html placeholder"
```

### Task 2: Remove unused FormsModule/ReactiveFormsModule imports (Q14)

**Files:** Modify `src/app/app.module.ts`

- [ ] **Step 1: Confirm they're unused**

Run: `grep -rn "ngModel\|formGroup\|formControl\|FormGroup\|FormControl" src/app`
Expected: no output (confirms Q14's finding still holds)

- [ ] **Step 2: Edit app.module.ts**

Remove these two lines:
```typescript
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
```
And remove `FormsModule, ReactiveFormsModule` from the `imports: [...]` array (leave every other entry as-is).

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/app.module.ts
git commit -m "chore: remove unused FormsModule/ReactiveFormsModule imports"
```

### Task 3: Remove commented-out dead code (Q15)

**Files:** Modify `src/app/build-msp-service/build-msp.service.ts`, `src/app/read-spreadsheet/read-spreadsheet.component.ts`

- [ ] **Step 1: Edit build-msp.service.ts**

In `saveErrorFile`, delete this line (it sits directly above the live implementation):
```typescript
            // missingDataText += this.missingData.map(x => String(x)).join(', ');
```

- [ ] **Step 2: Edit read-spreadsheet.component.ts**

Delete this line from the class body:
```typescript
    // form: FormGroup;
```

- [ ] **Step 3: Verify**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts src/app/read-spreadsheet/read-spreadsheet.component.ts
git commit -m "chore: remove commented-out dead code"
```

### Task 4: Replace deprecated `srcElement` with `target` (Q16)

**Files:** Modify `src/app/read-spreadsheet/read-spreadsheet.component.ts`, `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`

- [ ] **Step 1: Edit the component**

In `getTextFromTextArea`, change:
```typescript
    getTextFromTextArea(changeEvent: Event) {
        const textArea = changeEvent.srcElement as HTMLInputElement;
        this.notesText = textArea.value;
    }
```
to:
```typescript
    getTextFromTextArea(changeEvent: Event) {
        const textArea = changeEvent.target as HTMLInputElement;
        this.notesText = textArea.value;
    }
```

- [ ] **Step 2: Update the dependent test**

In `read-spreadsheet.component.spec.ts`, find:
```typescript
	it('should update notesText when getTextFromTextArea is called', () => {
		const textArea = document.createElement('textarea');
		textArea.value = 'Some notes';
		component.getTextFromTextArea({ srcElement: textArea } as unknown as Event);
		expect(component.notesText).toBe('Some notes');
	});
```
Change `{ srcElement: textArea }` to `{ target: textArea }`.

- [ ] **Step 3: Verify**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.ts src/app/read-spreadsheet/read-spreadsheet.component.spec.ts
git commit -m "fix: use standard event.target instead of deprecated srcElement"
```

### Task 5: Fix app naming consistency (Q17)

`app.component.spec.ts` already asserts the navbar brand text is exactly `'MSP Creator'` — that's the app's real, user-facing, already-locked-in name. Leave the navbar HTML untouched; align the two internal names to match it.

**Files:** Modify `package.json`, `src/app/app.component.ts`

- [ ] **Step 1: Edit package.json**

Change:
```json
  "name": "read-csv",
```
to:
```json
  "name": "msp-creator",
```

- [ ] **Step 2: Edit app.component.ts**

Change:
```typescript
  title = 'Read-Spreadsheet';
```
to:
```typescript
  title = 'MSP Creator';
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: both PASS (no test asserts on `package.json`'s name or `AppComponent.title`, so this is a safe rename)

- [ ] **Step 4: Commit**

```bash
git add package.json src/app/app.component.ts
git commit -m "chore: align app name to 'MSP Creator' across package.json and AppComponent"
```

### Task 6: Add cache headers for hashed static assets (P6)

**Files:** Modify `docker/nginx.conf`

- [ ] **Step 1: Edit nginx.conf**

Change:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
to:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location ~* \.(js|css|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Verify**

Run: `docker build -f docker/Dockerfile -t msp-creator-test .`
Expected: build succeeds (nginx config syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add docker/nginx.conf
git commit -m "perf: cache hashed static assets for a year at the nginx layer"
```

### Task 7: DROPPED — `ChangeDetectionStrategy.Eager` is not a no-op on Angular 22 (P3)

**Ruling (recorded during Phase 1 execution):** This task's premise was wrong and it must NOT be implemented as originally written. `Eager` and `Default` are numerically identical (both `1`), but Angular 22's `@Component({changeDetection})` falls back to `OnPush` (`0`) — not `Eager`/`Default` — when the property is omitted entirely ("OnPush is enabled by default" per the decorator's own doc comment). Removing the explicit `changeDetection: ChangeDetectionStrategy.Eager` line therefore silently converts both components to `OnPush`, which is a real behavior change, not cleanup — confirmed empirically (2 of 112 tests fail with the line removed; both pass again with it restored) during the Phase 1 batch implementation.

**Action:** leave `changeDetection: ChangeDetectionStrategy.Eager` in place, unchanged, in both `src/app/app.component.ts` and `src/app/read-spreadsheet/read-spreadsheet.component.ts`, for the remainder of this plan — including Phase 6's standalone-conversion tasks (Task 29, Task 30), which must preserve this line and its `ChangeDetectionStrategy` import rather than omitting them. No commit exists for this task. A genuine `OnPush` migration (re-verifying every state-mutation path both components rely on) is a reasonable candidate for a future, dedicated phase — out of scope here.

### Task 8: Remove `underscore` dependency (Q13)

**Files:** Modify `src/app/build-msp-service/build-msp.service.ts`, `src/app/declare-modules.d.ts`, `package.json`

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts`
Expected: PASS (this is your regression net — the existing "should keep only the given requiredHeaders..." and "should default to vitalHeaders..." tests fully specify `removeAttributes`'s behavior)

- [ ] **Step 2: Edit build-msp.service.ts**

Remove the import:
```typescript
import _ from 'underscore';
```
Change:
```typescript
    removeAttributes(jsonArray: any[], requiredHeaders: string[] = this.vitalHeaders): any[] {
        return _.map(jsonArray, (entry: any) => _.pick(entry, ...requiredHeaders));
    }
```
to:
```typescript
    removeAttributes(jsonArray: any[], requiredHeaders: string[] = this.vitalHeaders): any[] {
        return jsonArray.map((entry: any) => Object.fromEntries(
            requiredHeaders.filter(header => header in entry).map(header => [header, entry[header]])
        ));
    }
```

- [ ] **Step 3: Remove the ambient type shim**

In `src/app/declare-modules.d.ts`, remove:
```typescript
declare module 'underscore';
```

- [ ] **Step 4: Remove the dependency**

```bash
npm uninstall underscore
```

- [ ] **Step 5: Verify**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts`
Expected: PASS, identical results to Step 1

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: replace underscore's map/pick with native JS, drop the dependency"
```

### Task 9: Replace string concatenation with array-join (P8)

**Files:** Modify `src/app/build-msp-service/build-msp.service.ts`

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts -t "buildMspStringFromArray"`
Expected: PASS — the exact-string-equality test ("should produce formatted string from array") and the three Comments-line-merge tests are your regression net for byte-identical output.

- [ ] **Step 2: Replace the implementation**

Replace the entire `buildMspStringFromArray` method with:
```typescript
    // Create a string from a 2x2 array of MSMS data
	buildMspStringFromArray(dataArray: any[], mspNotes: string): string {

		// Each pushed string is later joined into the final .msp text
		const lines: string[] = [];

		// Traverse each row of dataArray and build mspString
		//  Each row represents data for one metabolite
		dataArray.forEach((element: any) => {

            lines.push(
                'Name: ' + (element['Name'] || '') + '\n' +
                'InChIKey: ' + (element['InChIKey'] || '') + '\n' +
                'Precursor_type: ' + (element['Precursor_type'] || '') + '\n' +
                'ExactMass: ' + (element['ExactMass'] || '') + '\n' +
                'Formula: ' + (element['Formula'] || '') + '\n'
            );

            const commentParts: string[] = [];
            if (mspNotes) {
                commentParts.push(mspNotes);
            }
            if (element['_extraComments']) {
                element['_extraComments'].forEach((comment: { header: string, value: string, isSubfield?: boolean }) => {
                    commentParts.push(comment.isSubfield ? comment.header + '=' + comment.value : comment.header + ': ' + comment.value);
                });
            }
            if (commentParts.length > 0) {
                lines.push('Comments: ' + commentParts.join('; ') + '\n');
            }
            // Create array of mass/intensity peaks to be written into the string line by line
            //  First check that MSMS spectrum data exists
            if (element['MSMS SPECTRUM'] && element['MSMS SPECTRUM'].length > 0) {
                const spectrum: string[] = element['MSMS SPECTRUM'].split(' ');
                lines.push('Num Peaks: ' + spectrum.length.toString() + '\n');
                spectrum.forEach(massIntensity => {
                    lines.push(massIntensity.replace(':', ' ') + '\n');
                });
            } else {
                lines.push('Num Peaks: ');
            }
            lines.push('\n\n');
        });
		return lines.join('');
    } // end buildMspStringFromArray
```
(Note: this also drops the `let dataMissing = '';` variable from the original, which was declared but never referenced anywhere in the method — genuinely dead.)

- [ ] **Step 3: Verify**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts`
Expected: PASS, identical to baseline

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts
git commit -m "perf: build .msp output via array push + join instead of string concatenation"
```

### Task 10: Ship Phase 1

- [ ] **Step 1: Full verification**

Run: `npm test && npx vitest run --coverage && npm run build`
Expected: all PASS, coverage still ≥80% on all four metrics

- [ ] **Step 2: Ship via merge-it**

Invoke the `/gw:merge-it` skill to open, review, and merge the PR for branch `fix/mechanical-cleanup` into `master`.

---

## Phase 2 — Dependency & build config hygiene (branch: `fix/dependency-hygiene`)

Branch from updated `master` after Phase 1 merges.

**Files:**
- Modify: `package.json`
- Modify: `src/app/declare-modules.d.ts`
- Modify: `src/app/read-spreadsheet-service/read-spreadsheet.service.ts`
- Modify: `tsconfig.json`
- Modify: `angular.json`
- Modify: `docker/Dockerfile`

### Task 11: Install `xlsx` from the npm registry instead of a CDN tarball (Q1)

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`
Expected: PASS

- [ ] **Step 2: Replace the dependency**

```bash
npm uninstall xlsx
npm install xlsx@0.20.3
```
Confirm `package.json`'s `xlsx` entry now reads `"xlsx": "^0.20.3"` (or the exact resolved semver), not a CDN URL.

- [ ] **Step 3: Verify**

Run: `npx vitest run src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`
Expected: PASS, identical results — the npm-published package is the same code as the CDN tarball at the same version

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install xlsx from the npm registry instead of a CDN tarball"
```

### Task 12: Remove dead `fs` dependency (Q2)

- [ ] **Step 1: Confirm it's unused**

Run: `grep -rn "from 'fs'\|require('fs')" src/`
Expected: no output

- [ ] **Step 2: Remove it**

```bash
npm uninstall fs
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused 'fs' placeholder dependency"
```

### Task 13: Use real `xlsx` typings (Q6)

**Files:** Modify `src/app/declare-modules.d.ts`, `src/app/read-spreadsheet-service/read-spreadsheet.service.ts`

- [ ] **Step 1: Remove the ambient declaration**

In `src/app/declare-modules.d.ts`, remove:
```typescript
declare module 'xlsx';
```

- [ ] **Step 2: Use the real type in read-spreadsheet.service.ts**

Replace the stale-comment workaround:
```typescript
                const wb = XLSX.read(target.result, { type: 'binary' });
                // Gets error: Namespace '"xlsx"' has no exported member 'WorkBook
                // const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });
```
with:
```typescript
                const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: PASS. If the real typings surface a genuine type error (the original workaround comment suggests they might), fix it at the call site rather than reintroducing the ambient `declare module`. The most likely fix: `import * as XLSX from 'xlsx';` (namespace import) is already present in this file per the existing code — if the compiler still complains `WorkBook` isn't exported, use `import { WorkBook } from 'xlsx';` alongside the existing `import * as XLSX from 'xlsx';` and reference it as `WorkBook` instead of `XLSX.WorkBook`.

Run: `npx vitest run src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/declare-modules.d.ts src/app/read-spreadsheet-service/read-spreadsheet.service.ts
git commit -m "fix: use xlsx's real typings instead of an ambient any-shim"
```

### Task 14: Remove stale legacy tsconfig settings (Q12)

**Files:** Modify `tsconfig.json`

- [ ] **Step 1: Edit tsconfig.json**

Remove `"ignoreDeprecations": "6.0",` and change `"useDefineForClassFields": false` to `"useDefineForClassFields": true`.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: PASS. If `ignoreDeprecations` removal surfaces a real deprecation warning/error, read it and fix the underlying usage (don't re-add the suppression). If flipping `useDefineForClassFields` breaks class-field/decorator initialization order (most likely to show up as Angular DI fields being `undefined` at construction time), revert just that one flag back to `false` and note it in the PR description as a known follow-up — do not block this task on it since Q3 (Phase 5, TS strict mode) will need to touch every class-field declaration anyway and is a better place to resolve field-initialization-order issues holistically.

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: remove ignoreDeprecations escape hatch, enable useDefineForClassFields"
```

### Task 15: Fix default build configuration (P2)

**Files:** Modify `angular.json`

- [ ] **Step 1: Find the build target**

Run: `grep -n "defaultConfiguration" angular.json`

- [ ] **Step 2: Edit angular.json**

Change:
```json
          "defaultConfiguration": ""
```
to:
```json
          "defaultConfiguration": "production"
```

- [ ] **Step 3: Verify**

Run: `npm run build` (this now resolves to the production configuration)
Expected: PASS, and the build output in `dist/Read-Spreadsheet` should now be minified (spot-check: `ls -la dist/Read-Spreadsheet/*.js` shows hashed, minified filenames — same as what `ng build --configuration production` already produced before this change)

Run: `npx ng build --configuration development` (or whatever the dev configuration is named in `angular.json`'s `configurations` block — confirm the exact name first with `grep -A2 '"configurations"' angular.json`) to confirm a dev build is still reachable explicitly when needed.

- [ ] **Step 4: Commit**

```bash
git add angular.json
git commit -m "fix: default ng build to the production configuration"
```

### Task 16: Investigate and (if possible) drop `npm ci --force` (Q18)

**Files:** Modify `docker/Dockerfile`

- [ ] **Step 1: Check whether `--force` is still needed**

Run: `npm ci --dry-run` (from the repo root, after Tasks 2.1–2.2's `package.json` changes are committed)
Expected: check for `ERESOLVE` errors in the output. If none appear, `--force` is very likely no longer necessary (dependency conflicts from the Angular 21→22 upgrade may have already resolved as `package-lock.json` settled).

- [ ] **Step 2a: If no ERESOLVE errors — drop the flag**

In `docker/Dockerfile`, change:
```dockerfile
RUN npm ci --force
```
to:
```dockerfile
RUN npm ci
```

- [ ] **Step 2b: If ERESOLVE errors appear — identify and resolve the specific conflict**

Run: `npm ci` (without `--force`, without `--dry-run`) and read the full ERESOLVE error — it names the two conflicting packages and their required peer versions. Update the offending dependency to a version compatible with Angular 22 in `package.json`, regenerate the lockfile (`npm install`), and re-run `npm ci` until it succeeds without `--force`. Then apply Step 2a's Dockerfile edit.

- [ ] **Step 3: Verify the Docker build end-to-end**

Run: `docker build -f docker/Dockerfile -t msp-creator-test .`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docker/Dockerfile package.json package-lock.json
git commit -m "chore: drop npm ci --force now that the peer-dependency conflict is resolved"
```

### Task 17: Ship Phase 2

- [ ] **Step 1: Full verification**

Run: `npm test && npx vitest run --coverage && npm run build && docker build -f docker/Dockerfile -t msp-creator-test .`
Expected: all PASS, coverage still ≥80%

- [ ] **Step 2: Ship via merge-it**

Invoke `/gw:merge-it` for branch `fix/dependency-hygiene`.

---

## Phase 3 — ESLint setup (branch: `chore/eslint-setup`)

Branch from updated `master` after Phase 2 merges.

### Task 18: Scaffold ESLint config (Q7)

**Files:** Create: ESLint config (schematic-generated), Modify: files it flags

- [ ] **Step 1: Run the schematic**

```bash
ng add @angular-eslint/schematics
```
This creates `eslint.config.js` (or `.mjs`) and adds the required devDependencies automatically.

- [ ] **Step 2: Run lint and triage output**

Run: `npm run lint`
For each category of violation reported, either fix it (preferred for anything touching files this plan already modified) or add a narrowly-scoped `eslint-disable-next-line <rule>` with a one-line comment explaining why, only for pre-existing patterns that are out of scope for this remediation pass (e.g. a legacy naming convention baked into the whole codebase that would need its own dedicated rename pass). Do not disable rules file-wide or project-wide to make the count go to zero — a suppressed-everywhere rule provides no future value.

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: exits 0

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add @angular-eslint config and fix/triage existing violations"
```

### Task 19: Ship Phase 3

- [ ] **Step 1: Full verification**

Run: `npm run lint && npm test && npx vitest run --coverage && npm run build`
Expected: all PASS, coverage still ≥80%

- [ ] **Step 2: Ship via merge-it**

Invoke `/gw:merge-it` for branch `chore/eslint-setup`.

---

## Phase 4 — Architecture & typing cleanup (branch: `refactor/architecture-cleanup`)

Branch from updated `master` after Phase 3 merges.

**Files:**
- Modify: `src/app/app.module.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.ts`
- Modify: `src/app/download-file-service/download-file.service.ts`
- Modify: `src/app/download-file-service/download-file.service.spec.ts`
- Modify: `src/app/build-msp-service/build-msp.service.ts`

### Task 20: Remove `CUSTOM_ELEMENTS_SCHEMA` (Q5)

- [ ] **Step 1: Edit app.module.ts**

Remove `CUSTOM_ELEMENTS_SCHEMA` from the `@angular/core` import and remove `schemas: [CUSTOM_ELEMENTS_SCHEMA]` from the `@NgModule({...})` decorator.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: PASS. If it fails with an "unknown element/attribute" template error, that's a real template issue the schema was masking — read the error, fix the template (most likely a missing module import for a Material component), and re-run. Do not re-add the schema as a workaround.

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/app.module.ts
git commit -m "fix: remove unnecessary CUSTOM_ELEMENTS_SCHEMA, restoring template type-checking"
```

### Task 21: Fix root-singleton service re-provision (Q10)

**Files:** Modify `src/app/read-spreadsheet/read-spreadsheet.component.ts`, `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`

- [ ] **Step 1: Edit the component**

Remove `providers: [DownloadFileService, BuildMspService],` from the `@Component({...})` decorator entirely (both services are already `providedIn: 'root'`, matching how `ReadSpreadsheetService` is already handled per the adjacent comment).

- [ ] **Step 2: Update the test that relies on component-level provider identity**

In `read-spreadsheet.component.spec.ts`, find:
```typescript
	it('should call downloadFileService.downloadFile with the mapped file name when downloadExample is called', () => {
		// downloadFileService is provided at the component level (see the component's `providers`
		// array), so grab the exact instance this component instance holds rather than TestBed.inject.
		const downloadFileService = (component as unknown as { downloadFileService: { downloadFile: (dir: string, name: string) => void } }).downloadFileService;
		vi.spyOn(downloadFileService, 'downloadFile').mockImplementation(() => {});
```
Change it to inject the root singleton directly, now that it's no longer component-scoped:
```typescript
	it('should call downloadFileService.downloadFile with the mapped file name when downloadExample is called', () => {
		const downloadFileService = TestBed.inject(DownloadFileService);
		vi.spyOn(downloadFileService, 'downloadFile').mockImplementation(() => {});
```
And add the import at the top of the file:
```typescript
import { DownloadFileService } from '../download-file-service/download-file.service';
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: PASS

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.ts src/app/read-spreadsheet/read-spreadsheet.component.spec.ts
git commit -m "fix: stop re-scoping root-singleton services to the component"
```

### Task 22: Give filename-transform logic one owner (Q11)

**Files:** Modify `src/app/download-file-service/download-file.service.ts`, `src/app/download-file-service/download-file.service.spec.ts`, `src/app/read-spreadsheet/read-spreadsheet.component.ts`, `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`

- [ ] **Step 1: Write the failing test for the new service method**

Add to `download-file.service.spec.ts`:
```typescript
	it('should download an example file, converting its anchor name to a real filename', () => {
		const spyObj = { click: vi.fn() };
		vi.spyOn(document, 'createElement').mockReturnValue(spyObj as unknown as HTMLElement);

		service.downloadExampleFile('example_msp-txt');

		expect((spyObj as any).href).toBe('../assets/files-to-read/example_msp.txt');
		expect((spyObj as any).download).toBe('example_msp.txt');
		expect(spyObj.click).toHaveBeenCalledTimes(1);
	});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/app/download-file-service/download-file.service.spec.ts -t "downloadExampleFile"`
Expected: FAIL with "service.downloadExampleFile is not a function"

- [ ] **Step 3: Implement `downloadExampleFile` in the service**

In `download-file.service.ts`, add the new method (keep the existing `downloadFile` — it's still the general-purpose primitive):
```typescript
	// Anchor `name` attributes encode the target file as e.g. 'example_msp-txt', with a dash
	//  standing in for the extension's period (see the calling template's comment for why);
	//  this method owns that decoding so it isn't split between a component method and an HTML comment.
	downloadExampleFile(anchorName: string) {
		this.downloadFile('../assets/files-to-read/', anchorName.replace('-', '.'));
	}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/app/download-file-service/download-file.service.spec.ts -t "downloadExampleFile"`
Expected: PASS

- [ ] **Step 5: Update the component to delegate**

In `read-spreadsheet.component.ts`, change:
```typescript
	downloadExample(mouseEvent: Event) {
		// Get the DOM element, get its name, turn the name into the file name to download
		//  i.e. <a name='example_msp-txt' ...> => example_msp.txt
		const target = mouseEvent.target as HTMLAnchorElement;
		this.downloadFileService.downloadFile('../assets/files-to-read/', target.name.replace('-', '.'));
    }
```
to:
```typescript
	downloadExample(mouseEvent: Event) {
		const target = mouseEvent.target as HTMLAnchorElement;
		this.downloadFileService.downloadExampleFile(target.name);
    }
```

- [ ] **Step 6: Update the dependent component test**

In `read-spreadsheet.component.spec.ts`, the test from Task 21 now asserts on `downloadFile`, but the component calls `downloadExampleFile`. Update it:
```typescript
	it('should call downloadFileService.downloadExampleFile with the anchor name when downloadExample is called', () => {
		const downloadFileService = TestBed.inject(DownloadFileService);
		vi.spyOn(downloadFileService, 'downloadExampleFile').mockImplementation(() => {});
		const anchor = document.createElement('a');
		anchor.setAttribute('name', 'example_msp-txt');
		component.downloadExample({ target: anchor } as unknown as Event);
		expect(downloadFileService.downloadExampleFile).toHaveBeenCalledWith('example_msp-txt');
	});
```

- [ ] **Step 7: Verify**

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move example-file name decoding into DownloadFileService"
```

### Task 23: Add named-field type safety to the core data pipeline (Q8)

**Superseded by Task 18 — narrowed in scope.** Task 18 (Phase 3, ESLint cleanup) already eliminated every `any`/`any[]` in this file's row-shaped methods while fixing `@typescript-eslint/no-explicit-any` violations: it introduced `export type MspJsonRow = Record<string, string> & { _extraComments?: MspExtraComment[] };` and threaded it through `applyCommentMappings`, `removeRowsWithoutSpectrum`, `removeAttributes`, `removeDuplicates`, `buildJsonArray`, `collectMissingData`, and `buildMspStringFromArray` — exactly the methods this task originally targeted. Re-doing that work under a second, differently-named type (`MspRow`) would leave two parallel, conflicting row types in the same file.

What Task 18's `MspJsonRow` does NOT yet provide, and what's left of Q8's original intent: `Record<string, string>` accepts *any* string key, so a typo'd field name (`entry['Formuula']`) still compiles cleanly — there's no compile-time guard against a typo on one of the handful of well-known output fields. This narrower task adds that, without introducing a second type.

**Files:** Modify `src/app/build-msp-service/build-msp.service.ts`

- [ ] **Step 1: Add named optional fields to the existing `MspJsonRow` type**

Find the existing type (added by Task 18):
```typescript
export type MspJsonRow = Record<string, string> & { _extraComments?: MspExtraComment[] };
```
Change it to name the fields `buildMspStringFromArray` reads by bracket notation, while keeping the index signature for the rest (spreadsheet-header pass-through columns like `'AVERAGE RT(MIN)'`, `'MSMS SPECTRUM'`, etc., which have no fixed vocabulary):
```typescript
export type MspJsonRow = Record<string, string> & {
	Name?: string;
	InChIKey?: string;
	Precursor_type?: string;
	ExactMass?: string;
	Formula?: string;
	_extraComments?: MspExtraComment[];
};
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: PASS — this is a strictly additive narrowing (named optional properties on top of an existing index signature), so nothing that previously compiled should now fail. If TypeScript reports a conflict between an index signature and a named property's type (it shouldn't, since both are `string`-compatible here), keep the index signature as the source of truth and drop the conflicting named field rather than loosening anything to `any`.

Run: `npm test`
Expected: PASS, unchanged results (types only, never runtime logic)

- [ ] **Step 3: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts
git commit -m "refactor: add named-field type safety to MspJsonRow for known output columns"
```

### Task 24: Flatten `buildMspFile`'s nested conditionals (Q9)

**Files:** Modify `src/app/build-msp-service/build-msp.service.ts`

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts -t "buildMspFile"`
Expected: PASS — this is the full regression net for this refactor (both the msdial and spreadsheet end-to-end tests, plus the header-mapping/comment/SMILES end-to-end tests further down the file).

- [ ] **Step 2: Replace the implementation**

Replace the entire `buildMspFile` method with an early-return version that preserves identical behavior:
```typescript
    // Create .msp file from a 2x2 array of data
	buildMspFile(msmsArray: string[][], fileName: string, notes: string, format: MspSourceFormat = 'spreadsheet', headerMappings?: HeaderMapping[]): string {

		// Reset the error text
        this.resetErrors();

        const requiredHeaders = this.getRequiredHeaders(format);
		const headerPosition = this.getHeaderPosition(msmsArray);

		if (headerPosition < 0) {
			this.errorWarning = 'Error: column headers not found';
			return this.errorWarning;
		}

		const headers = this.normalizeHeaderRow(msmsArray[headerPosition], format);
		const mappings = headerMappings || this.classifyHeaders(headers);
		const mappedHeaders = this.applyHeaderMappings(headers, mappings);

		if (this.hasHeaderErrors(mappedHeaders, requiredHeaders)) {
			return this.errorWarning;
		}

		const data = msmsArray.slice(headerPosition + 1, msmsArray.length);
		let msmsJsonArray: MspJsonRow[] = this.buildJsonArray(mappedHeaders, data);

		// Collect comment-mapped columns' values before removeAttributes strips the originals
		msmsJsonArray = this.applyCommentMappings(msmsJsonArray, mappings);

		// remove unneeded attributes (keep _extraComments alongside the required headers)
		msmsJsonArray = this.removeAttributes(msmsJsonArray, [...requiredHeaders, '_extraComments']);

		// Use header position to get row number; check for missing data per each header
		//  (a spectrum-less row is filtered below, not reported as missing data, for either format)
		const missingDataCheckHeaders = this.getMissingDataCheckHeaders(format, requiredHeaders);
		this.collectMissingData(msmsJsonArray, headerPosition + 2, missingDataCheckHeaders);
		if (this.missingData.length > 0) {
			this.errorWarning = 'Warning: Some entries have missing data; these attributes were left blank';
		}

		// Remove duplicate entries
		//  Need to get header position and add 2 to get accurate row locations on the spreadsheet
		msmsJsonArray = this.removeDuplicates(msmsJsonArray, headerPosition + 2);
		// Tell the user if duplicate entries were not included
		if (this.duplicates.length > 0) {
			if (this.errorWarning.length > 0) {
				this.errorWarning += '<br>';
			}
			this.errorWarning += 'Warning: duplicate entries found but not included in .msp';
		}

		// Drop rows with no MS/MS spectrum: not useful in a spectral library, regardless of source
		msmsJsonArray = this.removeRowsWithoutSpectrum(msmsJsonArray);

		// Turn array into a string
		const mspString = this.buildMspStringFromArray(msmsJsonArray, notes);
		// User will be prompted to save a .msp for their data
		this.saveFile(mspString, fileName.split('.')[0] + '.msp');

		return this.errorWarning;
	}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts`
Expected: PASS, identical to baseline

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts
git commit -m "refactor: flatten buildMspFile with early-return guard clauses"
```

### Task 25: Fix `visibleHeaderMappings` recomputation (P4)

**Files:** Modify `src/app/read-spreadsheet/read-spreadsheet.component.ts`

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts -t "visibleHeaderMappings\|MSMS SPECTRUM"`
Expected: PASS — covers both the direct `visibleHeaderMappings` test and the template test that reads it indirectly.

- [ ] **Step 2: Convert the getter to a plain field, recomputed once per parse**

Remove the getter:
```typescript
    get visibleHeaderMappings(): HeaderMapping[] {
        return this.headerMappings.filter(mapping => !mapping.isSample);
    }
```
Add a plain field near the other mapping-related fields:
```typescript
    headerMappings: HeaderMapping[];
    visibleHeaderMappings: HeaderMapping[];
```
In `ngOnInit`, initialize it alongside `headerMappings`:
```typescript
        this.headerMappings = [];
        this.visibleHeaderMappings = [];
```
In `parseSelectedFile()`'s subscribe `next` callback, recompute it every time `headerMappings` changes:
```typescript
            next: (msmsArray: string[][]) => {
                this.cachedMsmsArray = msmsArray;
                const headerPosition = this.buildMspService.getHeaderPosition(msmsArray);
                if (headerPosition >= 0) {
                    const headers = this.buildMspService.normalizeHeaderRow(msmsArray[headerPosition], this.currentFormat);
                    this.headerMappings = this.buildMspService.classifyHeaders(headers);
                } else {
                    this.headerMappings = [];
                }
                this.visibleHeaderMappings = this.headerMappings.filter(mapping => !mapping.isSample);
                this.parsing = false;
            },
```
And in the `error` callback of the same subscribe, which also clears `headerMappings`:
```typescript
            error: () => {
                this.cachedMsmsArray = null;
                this.headerMappings = [];
                this.visibleHeaderMappings = [];
                this.parsing = false;
            }
```
Also in `fileSelected()`'s invalid-extension branch, which clears `headerMappings` directly:
```typescript
                this.headerMappings = [];
                this.visibleHeaderMappings = [];
```
And update the template `[dataSource]` binding in `read-spreadsheet.component.html` — it already reads `visibleHeaderMappings`, so no template change is needed; it now reads a field instead of invoking a getter, which is transparent to the template syntax.

- [ ] **Step 3: Update the direct unit test**

The existing test sets `component.headerMappings` directly and reads `component.visibleHeaderMappings` immediately, which no longer auto-derives since it's now a plain field. Update it to also set `visibleHeaderMappings` directly (it's testing the filter's *result*, not that it's a getter):
```typescript
	it('should exclude sample-flagged headers from visibleHeaderMappings after a parse', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(of([
			['SAMPLE 1', 'BATCH ID'],
			['1', '2']
		]));

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.visibleHeaderMappings.some(m => m.isSample)).toBe(false);
	});
```
(Replace the old direct-field-assignment test of the same name with this parse-driven version, since the field is now populated by the parse flow rather than being independently settable and re-derived.)

- [ ] **Step 4: Verify**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: PASS

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.ts src/app/read-spreadsheet/read-spreadsheet.component.spec.ts
git commit -m "perf: compute visibleHeaderMappings once per parse instead of every CD cycle"
```

### Task 26: Ship Phase 4

- [ ] **Step 1: Full verification**

Run: `npm run lint && npm test && npx vitest run --coverage && npm run build`
Expected: all PASS, coverage still ≥80%

- [ ] **Step 2: Ship via merge-it**

Invoke `/gw:merge-it` for branch `refactor/architecture-cleanup`.

---

## Phase 5 — TypeScript strict mode (branch: `chore/ts-strict-mode`)

Branch from updated `master` after Phase 4 merges. Its own phase per the audit's explicit recommendation given the blast radius.

**Scope note:** `tsconfig.app.json` sets `"strictTemplates": false` independently of the root `strict` flag, and excludes all `*.spec.ts` files from the app build. This phase only flips the root `tsconfig.json`'s `"strict"` flag and fixes what `ng build` then reports — it does not touch `strictTemplates` or spec-file type-checking, since neither was part of finding Q3.

**Files:**
- Modify: `tsconfig.json`
- Modify: `src/app/build-msp-service/build-msp.service.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.ts`

### Task 27: Enable strict mode

- [ ] **Step 1: Flip the flag**

In `tsconfig.json`, change:
```json
    "strict": false,
```
to:
```json
    "strict": true,
```

- [ ] **Step 2: See what breaks**

Run: `npm run build`
Expected: FAIL with a list of compile errors — mostly `TS2564: Property '...' has no initializer and is not definitely assigned in the constructor` (from `strictPropertyInitialization`) and a couple of `strictNullChecks` errors on nullable fields. Proceed to the next steps to fix each category.

- [ ] **Step 3: Fix `build-msp.service.ts`'s error-tracking fields**

The four fields set via `resetErrors()` (a constructor-called method, which `strictPropertyInitialization` doesn't credit) need declaration-site defaults. Change:
```typescript
    errorWarning: string;
    missingData: string[];
    duplicates: string[];
    possibleDuplicates: string[];
```
to:
```typescript
    errorWarning: string = '';
    missingData: string[] = [];
    duplicates: string[] = [];
    possibleDuplicates: string[] = [];
```
(`vitalHeaders`, `recognizedHeaders`, and `mspTags` are already assigned directly in the constructor body — not via a helper method — so `strictPropertyInitialization` already recognizes them as initialized and they need no change.)

- [ ] **Step 4: Fix `read-spreadsheet.component.ts`'s ngOnInit-initialized fields**

`strictPropertyInitialization` only credits the constructor, not `ngOnInit` — every field currently set only in `ngOnInit` needs a declaration-site default matching its `ngOnInit` value (leave the `ngOnInit` assignments in place; the redundancy is harmless and keeps the reset-on-init behavior explicit). Change the field declarations block from:
```typescript
    submitValid: boolean;
    parsing: boolean;
    files: FileList;
    fileName: string;
    fileNameText: string;
    parseSubscription: Subscription;
    cachedMsmsArray: string[][] | null;
    headerMappings: HeaderMapping[];
    visibleHeaderMappings: HeaderMapping[];
    currentFormat: MspSourceFormat;
    targetInput: HTMLInputElement;

    showCorrect: boolean;
    showWrong: boolean;
    showErrorBox: boolean;
    showErrorFile: boolean;
    showNotes: boolean;
    showMappingPanel: boolean;
    mspKeys: string[];

    errorText: string;

    notesText: string;
    placeHolderText: string;
```
to:
```typescript
    submitValid = false;
    parsing = false;
    files: FileList | null = null;
    fileName = '';
    fileNameText = 'Click \'Browse\' to choose a spreadsheet';
    parseSubscription?: Subscription;
    cachedMsmsArray: string[][] | null = null;
    headerMappings: HeaderMapping[] = [];
    visibleHeaderMappings: HeaderMapping[] = [];
    currentFormat: MspSourceFormat = 'spreadsheet';
    targetInput: HTMLInputElement | null = null;

    showCorrect = false;
    showWrong = false;
    showErrorBox = false;
    showErrorFile = false;
    showNotes = false;
    showMappingPanel = true;
    mspKeys: string[] = [];

    errorText = '';

    notesText = '';
    placeHolderText = '';
```

- [ ] **Step 5: Fix the resulting nullability errors at `targetInput` use sites**

`targetInput` is now `HTMLInputElement | null`. In `readFile()`, which only runs after `fileSelected()` has already set it (the Submit button is disabled until then), add non-null assertions at its two use sites:
```typescript
		this.submitValid = false;
        this.targetInput.value = null;
```
becomes:
```typescript
		this.submitValid = false;
        this.targetInput!.value = '';
```
(also fixing the pre-existing type error of assigning `null` to a `string`-typed `.value` property, which strict mode now catches).

- [ ] **Step 6: Re-run the build and fix anything remaining**

Run: `npm run build`
Expected: if there are still errors, they'll be in files not covered by Steps 3–5 above (the codebase's other files were already largely strict-compatible per this plan's earlier investigation). For each remaining error: prefer a real type fix (narrow the type, add a null check, initialize a field) over a non-null assertion; use `!` only where the assertion is provably safe by the surrounding control flow, as in Step 5.

- [ ] **Step 7: Verify**

Run: `npm run build`
Expected: PASS

Run: `npm test`
Expected: PASS (Vitest runs through esbuild/Vite, which strips types without full type-checking, so behavior is unaffected by this task; this run just confirms none of the initializer/nullability edits changed runtime behavior)

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json src/app/build-msp-service/build-msp.service.ts src/app/read-spreadsheet/read-spreadsheet.component.ts
git commit -m "chore: enable TypeScript strict mode and fix resulting initialization/nullability gaps"
```

### Task 28: Ship Phase 5

- [ ] **Step 1: Full verification**

Run: `npm run lint && npm test && npx vitest run --coverage && npm run build`
Expected: all PASS, coverage still ≥80%

- [ ] **Step 2: Ship via merge-it**

Invoke `/gw:merge-it` for branch `chore/ts-strict-mode`.

---

## Phase 6 — Standalone component migration (branch: `refactor/standalone-migration`)

Branch from updated `master` after Phase 5 merges. Its own phase given the blast radius touches both spec files' TestBed configuration, not just production code.

**Files:**
- Modify: `src/main.ts`
- Delete: `src/app/app.module.ts`, `src/app/app-routing.module.ts`
- Modify: `src/app/app.component.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.ts`
- Modify: `src/app/app.component.spec.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`

### Task 29: Convert `AppComponent` to standalone

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/app.component.spec.ts`
Expected: PASS

- [ ] **Step 2: Edit app.component.ts**

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [MatToolbarModule, ReadSpreadsheetComponent]
})
export class AppComponent {
  title = 'MSP Creator';
}
```
(Per Task 7's ruling, `changeDetection: ChangeDetectionStrategy.Eager` is load-bearing on this Angular 22 install — omitting it falls back to `OnPush`, not `Eager`/`Default`. Keep it exactly as it was pre-migration.)

- [ ] **Step 3: Verify (expect this to fail until Task 30 also converts ReadSpreadsheetComponent)**

Run: `npm run build`
Expected: FAIL — `ReadSpreadsheetComponent` isn't standalone yet, so importing it directly into another standalone component's `imports` array won't resolve. This is expected; continue to Task 30 before verifying again.

- [ ] **Step 4: Commit (staged, verified together with Task 30)**

Hold this change uncommitted until Task 30 is also complete — see Task 30's Step 5 for the combined commit.

### Task 30: Convert `ReadSpreadsheetComponent` to standalone

- [ ] **Step 1: Edit read-spreadsheet.component.ts**

Add the standalone flag and imports to the `@Component` decorator:
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { ReadSpreadsheetService } from '../read-spreadsheet-service/read-spreadsheet.service';
import { DownloadFileService } from '../download-file-service/download-file.service';
import { BuildMspService, MspSourceFormat } from '../build-msp-service/build-msp.service';
import { HeaderMapping } from '../header-mapping-service/header-mapping.service';

import { Subscription } from 'rxjs';
import { timeout, take } from 'rxjs/operators';

@Component({
    selector: 'app-read-spreadsheet',
    templateUrl: 'read-spreadsheet.component.html',
    styleUrls: ['read-spreadsheet.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [
        CommonModule, MatButtonModule, MatSelectModule, MatCardModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, MatTableModule
    ]
})
export class ReadSpreadsheetComponent implements OnInit, OnDestroy {
```
(`DownloadFileService`/`BuildMspService` are no longer listed in `providers:` per Task 21 — no change needed there. No `FormsModule` — the template uses no `ngModel`/`formGroup`, confirmed in Phase 1. Per Task 7's ruling, `changeDetection: ChangeDetectionStrategy.Eager` is load-bearing on this Angular 22 install — keep it exactly as it was pre-migration.)

- [ ] **Step 2: Update `read-spreadsheet.component.spec.ts`'s TestBed config**

Replace:
```typescript
	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
        declarations: [ ReadSpreadsheetComponent ],
        imports: [
			CommonModule, FormsModule, NoopAnimationsModule,
			MatButtonModule, MatSelectModule, MatCardModule, MatIconModule,
			MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, MatTableModule
		],
		schemas: [CUSTOM_ELEMENTS_SCHEMA]
	})
	.compileComponents(); }));
```
with:
```typescript
	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [ReadSpreadsheetComponent, NoopAnimationsModule]
		})
		.compileComponents(); }));
```
Remove the now-unused imports at the top of the file: `CUSTOM_ELEMENTS_SCHEMA`, `CommonModule`, `FormsModule`, and the individual `MatXModule` imports (the component now brings its own `imports:` array — the spec no longer needs to redeclare them, and `CUSTOM_ELEMENTS_SCHEMA` should already be gone per Task 20).

- [ ] **Step 3: Verify both components together**

Run: `npm run build`
Expected: PASS

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: PASS

- [ ] **Step 4: Update `app.component.spec.ts`'s TestBed config**

Standalone `AppComponent` now directly imports the real `ReadSpreadsheetComponent`, so the existing stub-component workaround is no longer needed — the real component's own `imports:` array (Step 1 above) already resolves its `mat-table` dependency tree. Replace:
```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { MatToolbarModule } from '@angular/material/toolbar';

// Stub for ReadSpreadsheetComponent: the real component's template binds
// `mat-table` directives (`dataSource`, `matHeaderRowDef`,
// `matRowDefColumns`) that don't resolve without its full module
// dependency tree, producing NG0303 console errors in every test that
// merely renders AppComponent's shell. This stub keeps the
// `<app-read-spreadsheet>` tag in AppComponent's template resolvable without
// pulling in that dependency tree.
@Component({
	selector: 'app-read-spreadsheet',
	template: '',
	standalone: false
})
class ReadSpreadsheetStubComponent {}

describe('AppComponent', () => {
	let fixture: ComponentFixture<AppComponent>;
	let component: AppComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule, MatToolbarModule
			],
			declarations: [
				AppComponent, ReadSpreadsheetStubComponent
			],
			schemas: [CUSTOM_ELEMENTS_SCHEMA]
		}).compileComponents();
	}));
```
with:
```typescript
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
	let fixture: ComponentFixture<AppComponent>;
	let component: AppComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [AppComponent, NoopAnimationsModule]
		}).compileComponents();
	}));
```
(`RouterTestingModule` is dropped along with `MatToolbarModule`'s separate import — `AppComponent`'s own `imports:` array already supplies `MatToolbarModule`, and neither `AppComponent` nor its template ever used the router: no `<router-outlet>`, no injected `Router`/`ActivatedRoute`. `NoopAnimationsModule` replaces `BrowserAnimationsModule`'s role for the parts of Material that need an animations module present in tests, matching the pattern already used in `read-spreadsheet.component.spec.ts`.)

- [ ] **Step 5: Verify**

Run: `npx vitest run src/app/app.component.spec.ts`
Expected: PASS

Run: `npm test && npm run build`
Expected: both PASS

- [ ] **Step 6: Commit both components together**

```bash
git add src/app/app.component.ts src/app/app.component.spec.ts src/app/read-spreadsheet/read-spreadsheet.component.ts src/app/read-spreadsheet/read-spreadsheet.component.spec.ts
git commit -m "refactor: convert AppComponent and ReadSpreadsheetComponent to standalone"
```

### Task 31: Replace `bootstrapModule`/`AppModule` with `bootstrapApplication` (P5)

**Files:** Modify `src/main.ts`, Delete `src/app/app.module.ts`, `src/app/app-routing.module.ts`

- [ ] **Step 1: Edit main.ts**

```typescript
import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideAnimations(),
    provideRouter([])
  ]
}).catch(err => console.error(err));
```
(`provideRouter([])` preserves the current app-routing.module.ts's empty `routes: Routes = []` exactly — the app has no `<router-outlet>` and no route-consuming code today, so this is a like-for-like carry-over, not a behavior change. Removing routing entirely is a separate, larger decision outside this audit's findings.)

- [ ] **Step 2: Delete the now-unused NgModule files**

```bash
rm src/app/app.module.ts src/app/app-routing.module.ts
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: PASS

Run: `npm test`
Expected: PASS

Run: `npm start` and manually open `http://localhost:4300` in a browser — confirm the navbar renders, a spreadsheet uploads and produces a mapping panel, and Submit downloads a `.msp` file (this is the one task in this plan worth a manual smoke check before shipping, given it replaces the entire bootstrap path).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: bootstrap via bootstrapApplication instead of NgModule"
```

### Task 32: Ship Phase 6

- [ ] **Step 1: Full verification**

Run: `npm run lint && npm test && npx vitest run --coverage && npm run build`
Expected: all PASS, coverage still ≥80%

- [ ] **Step 2: Ship via merge-it**

Invoke `/gw:merge-it` for branch `refactor/standalone-migration`.

---

## Phase 7 — Web Worker spreadsheet parsing (branch: `perf/web-worker-parsing`)

Branch from updated `master` after Phase 6 merges.

**Files:**
- Create: `src/app/read-spreadsheet-service/xlsx-parse.worker.ts` (via schematic, then hand-edited)
- Create: `tsconfig.worker.json` (schematic-generated)
- Modify: `tsconfig.app.json`, `angular.json` (schematic-updated)
- Modify: `src/app/read-spreadsheet-service/read-spreadsheet.service.ts`

### Task 33: Scaffold the worker

- [ ] **Step 1: Run the schematic**

```bash
ng generate web-worker read-spreadsheet-service/xlsx-parse
```
This creates `src/app/read-spreadsheet-service/xlsx-parse.worker.ts` with placeholder content, creates `tsconfig.worker.json`, and updates `tsconfig.app.json`'s `exclude` and `angular.json`'s build target (`webWorkerTsConfig`) automatically — let the CLI handle this wiring rather than hand-editing those config files.

- [ ] **Step 2: Verify the scaffold builds**

Run: `npm run build`
Expected: PASS (placeholder worker compiles cleanly)

- [ ] **Step 3: Commit the scaffold**

```bash
git add -A
git commit -m "chore: scaffold xlsx-parse web worker"
```

### Task 34: Implement the worker

**Files:** Modify `src/app/read-spreadsheet-service/xlsx-parse.worker.ts`

- [ ] **Step 1: Replace the placeholder content**

**Note:** this file is subject to the project's `strict: true` (Task 27) via `tsconfig.worker.json`'s `extends: "./tsconfig.json"`. The snippet below already accounts for that (typed `WorkBook`, a nullish-coalescing fallback for `!ref` — the same fix Task 27 already applied to `readXlsxSync`'s eventual counterpart in `read-spreadsheet.service.ts`, kept consistent here).

```typescript
/// <reference lib="webworker" />

import * as XLSX from 'xlsx';

addEventListener('message', ({ data }: { data: ArrayBuffer }) => {
	try {
		const wb: XLSX.WorkBook = XLSX.read(data, { type: 'array' });
		// An empty sheet has no '!ref' range; fall back to a single-cell range so
		// decode_range still returns a valid (empty) range instead of throwing.
		const sheetRef = wb.Sheets[wb.SheetNames[0]]['!ref'] ?? 'A1';
		const range = XLSX.utils.decode_range(sheetRef);
		const numRows = range.e.r;

		if (numRows < 10000) {
			const msmsArray: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
			postMessage({ result: msmsArray });
		} else {
			postMessage({ error: `Error: file may be corrupted or too large; 
                    Try using another spreadsheet reader or converting file to another format` });
		}
	} catch {
		postMessage({ error: 'Error: file may be corrupted or may not exist' });
	}
});
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/read-spreadsheet-service/xlsx-parse.worker.ts
git commit -m "feat: implement xlsx-parse web worker"
```

### Task 35: Wire the service to use the worker, with a same-thread fallback (P1, P7)

**Files:** Modify `src/app/read-spreadsheet-service/read-spreadsheet.service.ts`

jsdom (the Vitest test environment) has no `Worker` global, so this task keeps the current synchronous FileReader path as an explicit fallback — this means the existing unit tests need no changes, while real browsers (which all support Web Workers) get the off-main-thread parse.

**Note:** Task 27 (strict mode) already modified this file — `readXlsx` now returns `Observable<string[][]>` (not `Observable<any>`), uses `const wb: XLSX.WorkBook = XLSX.read(...)`, and has a `const sheetRef = wb.Sheets[wb.SheetNames[0]]['!ref'] ?? 'A1';` nullability fallback before `decode_range`. The replacement below is written against that current state, not the pre-strict-mode original — it preserves all of Task 27's fixes inside the new `readXlsxSync` fallback method.

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`
Expected: PASS

- [ ] **Step 2: Replace `readXlsx` and add the sync fallback + teardown for both methods**

Replace the full file with:
```typescript
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class ReadSpreadsheetService {

	// Return observable where excel file is converted into 2x2 array that can be used by the subscriber
	//  Same array shape as readAlignmentResultTxt() produces, so the rest of the pipeline is shared
	readXlsx(sheetData: FileList): Observable<string[][]> {
		if (typeof Worker !== 'undefined') {
			return this.readXlsxViaWorker(sheetData);
		}
		// Fallback for environments without Web Worker support (e.g. the Vitest/jsdom test
		//  environment): parse synchronously on the main thread, same as before.
		return this.readXlsxSync(sheetData);
	} // end readXlsx

	private readXlsxViaWorker(sheetData: FileList): Observable<string[][]> {
		return new Observable<string[][]>(subscriber => {
			const worker = new Worker(new URL('./xlsx-parse.worker', import.meta.url));

			worker.addEventListener('message', ({ data }: { data: { result?: string[][]; error?: string } }) => {
				if (data.error) {
					subscriber.error(data.error);
				} else {
					subscriber.next(data.result);
					subscriber.complete();
				}
				worker.terminate();
			});
			worker.addEventListener('error', () => {
				subscriber.error('Error: file may be corrupted or may not exist');
				worker.terminate();
			});

			sheetData[0].arrayBuffer()
				.then(buffer => worker.postMessage(buffer, [buffer]))
				.catch(() => {
					subscriber.error('Error: file may be corrupted or may not exist');
					worker.terminate();
				});

			return () => worker.terminate();
		});
	}

	private readXlsxSync(sheetData: FileList): Observable<string[][]> {
		return new Observable<string[][]>(subscriber => {
			const reader = new FileReader();
			const onLoad = (loadEvent: ProgressEvent<FileReader>) => {
				const target = loadEvent.target as FileReader;
				const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });

				// Make sure the length of the array is appropriate
				//  This accounts for an error with spreadsheets made in LibreOffice; whereby if you manually delete rows
				//  from your spreadsheet, XLSX reads the spreadsheet as being over 1 million lines long
				let msmsArray: string[][];
				// An empty sheet has no '!ref' range; fall back to a single-cell range so
				// decode_range still returns a valid (empty) range instead of throwing.
				const sheetRef = wb.Sheets[wb.SheetNames[0]]['!ref'] ?? 'A1';
				const range = XLSX.utils.decode_range(sheetRef);
				const numRows = range.e.r;

				if (numRows < 10000) {
					// Convert spreadsheet data to JSON data
					//  Using {header:1} will generate a 2x2 array
					msmsArray = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
					subscriber.next(msmsArray);
					subscriber.complete();
				} else {
					subscriber.error(`Error: file may be corrupted or too large; 
                    Try using another spreadsheet reader or converting file to another format`);
				}
			};
			const onError = () => subscriber.error('Error: file may be corrupted or may not exist');

			reader.addEventListener('load', onLoad);
			reader.addEventListener('error', onError);
			reader.readAsBinaryString(sheetData[0]);

			return () => {
				reader.removeEventListener('load', onLoad);
				reader.removeEventListener('error', onError);
			};
		});
	}

	// Return observable where a MS-DIAL AlignmentResult .txt file is converted into a 2x2 array
	//  Same array shape as readXlsx() produces, so the rest of the pipeline is shared
	readAlignmentResultTxt(sheetData: FileList): Observable<string[][]> {
		return new Observable<string[][]>(subscriber => {
			const reader = new FileReader();
			const onLoad = (loadEvent: ProgressEvent<FileReader>) => {
				const target = loadEvent.target as FileReader;
				const text = (target.result as string).replace(/\r\n/g, '\n');
				const msmsArray = text.split('\n')
					.filter(line => line.trim().length > 0)
					.map(line => line.split('\t'));
				subscriber.next(msmsArray);
				subscriber.complete();
			};
			const onError = () => subscriber.error('Error: file may be corrupted or may not exist');

			reader.addEventListener('load', onLoad);
			reader.addEventListener('error', onError);
			reader.readAsText(sheetData[0]);

			return () => {
				reader.removeEventListener('load', onLoad);
				reader.removeEventListener('error', onError);
			};
		});
	} // end readAlignmentResultTxt

}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`
Expected: PASS, identical to baseline (jsdom has no `Worker`, so every test exercises `readXlsxSync`/the unchanged `readAlignmentResultTxt`, both behaviorally identical to before except for the added `.complete()` call, which none of the existing tests observe)

Run: `npm test && npm run build`
Expected: both PASS

Run: `npm start`, open the app in a real browser, open DevTools → Network/Performance, upload a spreadsheet, and confirm in the Sources/Application panel that a Worker thread is spawned (or add a temporary `console.log` inside the worker to confirm it runs, then remove it).

- [ ] **Step 4: Commit**

```bash
git add src/app/read-spreadsheet-service/read-spreadsheet.service.ts
git commit -m "perf: parse xlsx off the main thread via a Web Worker, with a sync fallback for test environments"
```

### Task 36: Ship Phase 7

- [ ] **Step 1: Full verification**

Run: `npm run lint && npm test && npx vitest run --coverage && npm run build`
Expected: all PASS, coverage still ≥80%

- [ ] **Step 2: Ship via merge-it**

Invoke `/gw:merge-it` for branch `perf/web-worker-parsing`.

---

## Phase 8 — Test quality & coverage (branch: `test/quality-and-coverage`)

Branch from updated `master` after Phase 7 merges.

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.spec.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
- Create: `src/app/read-spreadsheet/read-spreadsheet.integration.spec.ts`
- Create: `e2e/src/smoke.e2e-spec.ts`
- Modify: `e2e/src/app.e2e-spec.ts`

### Task 37: Remove wiring-only mocks from `build-msp.service.spec.ts` (T1, T4)

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts`
Expected: PASS (25 passing tests, including the two about to be replaced)

- [ ] **Step 2: Replace the two mock-heavy tests with one real-data test**

In the `describe('BuildMspService: buildMspFile', ...)` block, delete both:
```typescript
		it('should call lineHasHeaders', () => {
			vi.spyOn(service, 'lineHasHeaders').mockImplementation(() => false);
			service.buildMspFile(arr, name, '');
			expect(service.lineHasHeaders).toHaveBeenCalled();
		});

		it('should call functions from buildMspFile()', () => {
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

			service.buildMspFile(arr, name, '');

			expect(service.getHeaderPosition).toHaveBeenCalled();
			expect(service.processText).toHaveBeenCalled();
			expect(service.hasHeaderErrors).toHaveBeenCalled();
			expect(service.buildJsonArray).toHaveBeenCalled();
			expect(service.buildMspStringFromArray).toHaveBeenCalled();
			expect(service.saveFile).toHaveBeenCalled();
		});

		it('should save the output file with a .msp extension, regardless of the uploaded file\'s extension', () => {
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

			service.buildMspFile(arr, name, '');

			expect(service.saveFile).toHaveBeenCalledWith(testStr, 'test.msp');
		});
```
Replace them with one test that drives the real (unmocked) pipeline end-to-end, stubbing only the terminal I/O side effect (`saveFile`, which calls `saveAs()` to trigger a real browser download) — exactly the same stubbing convention every other end-to-end test in this file already uses:
```typescript
		it('should run the real pipeline and save the output file with a .msp extension, regardless of the uploaded file\'s extension', () => {
			vi.spyOn(service, 'saveFile').mockImplementation(() => {});

			service.buildMspFile(arr, name, '');

			expect(service.saveFile).toHaveBeenCalledTimes(1);
			const [savedContent, savedName] = (service.saveFile as Mock).mock.calls[0];
			expect(savedName).toBe('test.msp');
			expect(savedContent).toEqual(testStr);
		});
```
(`arr`, `name`, and `testStr` are the existing `beforeAll`-scoped fixtures already defined at the top of this `describe` block — no new fixtures needed.)

- [ ] **Step 3: Verify**

Run: `npx vitest run src/app/build-msp-service/build-msp.service.spec.ts`
Expected: PASS — one real test now covers what three tests (two of them wiring-only) covered before, with stronger assertions (it checks actual output content, not just that internal methods were invoked)

- [ ] **Step 4: Re-check coverage**

Run: `npx vitest run --coverage`
Expected: statements/branches/functions/lines all still ≥80% — the deleted tests were exercising the same code paths the surrounding real end-to-end tests already cover (msdial format, spreadsheet format, comment-mapping, SMILES), so coverage should be unaffected or improve slightly. If any metric drops below 80%, identify the specific uncovered branch with `npx vitest run --coverage` and add one targeted real-data test for it (not a mock-based one).

- [ ] **Step 5: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "test: replace wiring-only buildMspFile mocks with one real end-to-end test"
```

### Task 38: Replace collaborator spies with real dependencies in `read-spreadsheet.component.spec.ts` (T1)

This file has ~10 tests that spy on `readSpreadsheetService.readXlsx` and `component.buildMspService`'s methods to fake parse results, rather than feeding a real file through the real service. Convert them to use real `File` objects parsed by the real `ReadSpreadsheetService`, using the MS-DIAL `.txt` path (plain tab-delimited text, trivial to construct as real file content — no binary spreadsheet generation needed) wherever the test's actual intent is about the component's header-mapping/state logic rather than about xlsx parsing specifically.

- [ ] **Step 1: Run baseline**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: PASS

- [ ] **Step 2: Add a small real-file helper at the top of the spec (after the imports)**

```typescript
// Builds a real File whose content the real ReadSpreadsheetService can parse via
//  readAlignmentResultTxt (tab-delimited text) — used instead of spying on the service,
//  so these tests exercise the real parse pipeline end-to-end.
function tabDelimitedFile(fileName: string, rows: string[][]): File {
	const content = rows.map(row => row.join('\t')).join('\n');
	return new File([content], fileName, { type: 'text/plain' });
}
```

- [ ] **Step 3: Convert the first spy-based test as a worked example**

Replace:
```typescript
	it('should eagerly parse the file and populate headerMappings on a valid file selection', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(of([
			['AVERAGE RT(MIN)', 'BATCH ID'],
			['6.23', '3']
		]));

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.cachedMsmsArray).toEqual([['AVERAGE RT(MIN)', 'BATCH ID'], ['6.23', '3']]);
		expect(component.headerMappings).toEqual([
			{ header: 'AVERAGE RT(MIN)', action: 'comment', targetKey: 'RT', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false, recognizedAs: null }
		]);
	});
```
with a real-file version. Because `fileSelected()` picks the parse path from the *filename* (`.txt` → `readAlignmentResultTxt`), use a `.txt` file with the same two header rows:
```typescript
	it('should eagerly parse the file and populate headerMappings on a valid file selection', () => new Promise<void>((resolve, reject) => {
		const file = tabDelimitedFile('test.txt', [
			['AVERAGE RT(MIN)', 'BATCH ID'],
			['6.23', '3']
		]);
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		setTimeout(() => {
			try {
				expect(component.cachedMsmsArray).toEqual([['AVERAGE RT(MIN)', 'BATCH ID'], ['6.23', '3']]);
				expect(component.headerMappings).toEqual([
					{ header: 'AVERAGE RT(MIN)', action: 'comment', targetKey: 'RT', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' },
					{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false, recognizedAs: null }
				]);
				resolve();
			} catch (e) { reject(e); }
		}, 0);
	}));
```
(Real `FileReader` I/O is asynchronous even in jsdom, unlike the old `of([...])` synchronous fake — the `setTimeout(…, 0)` flushes the microtask/macrotask queue so the `load` event has fired before assertions run. This is the one structural difference every converted test in this task needs.)

- [ ] **Step 4: Run it to verify it passes for real**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts -t "should eagerly parse"`
Expected: PASS

- [ ] **Step 5: Convert the error-path test as a second worked example**

Replace:
```typescript
	it('should clear cachedMsmsArray and headerMappings when parsing the selected file errors', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		vi.spyOn(readSpreadsheetService, 'readXlsx').mockReturnValue(throwError(() => new Error('boom')));

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.cachedMsmsArray).toBeNull();
		expect(component.headerMappings).toEqual([]);
	});
```
with a real error path — an empty file triggers the real service's `error` listener since `FileReader` still fires `load` with empty content, not `error`; instead, use a file that legitimately fails within the real pipeline. The simplest real failure is `readXlsx`'s size guard (`numRows >= 10000`) or a genuinely corrupt binary blob for the `.xlsx` extension path (which real `XLSX.read` will throw on):
```typescript
	it('should clear cachedMsmsArray and headerMappings when parsing the selected file errors', () => new Promise<void>((resolve, reject) => {
		// Not valid xlsx binary content: XLSX.read throws, which readXlsxSync's onLoad handler
		//  lets propagate — reproducing a genuine corrupt-file parse failure end-to-end.
		const file = new File(['this is not a spreadsheet'], 'test.xlsx', { type: 'application/octet-stream' });
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		setTimeout(() => {
			try {
				expect(component.cachedMsmsArray).toBeNull();
				expect(component.headerMappings).toEqual([]);
				resolve();
			} catch (e) { reject(e); }
		}, 0);
	}));
```

- [ ] **Step 6: Run it to verify it passes for real**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts -t "should clear cachedMsmsArray"`
Expected: PASS. If `XLSX.read` on this particular garbage string doesn't actually throw (some malformed inputs parse to an empty workbook instead of throwing), the `onLoad` handler's own `wb.Sheets[wb.SheetNames[0]]['!ref']` access will throw instead when `SheetNames` is empty — either way an exception propagates out of the synchronous `onLoad` callback. If Vitest reports an *unhandled* exception instead of the Observable's `error` channel receiving it (because the throw happens inside a raw DOM event listener, not inside the Observable's subscribe/executor scope), wrap the parsing logic inside `readXlsxSync`'s `onLoad` in a `try { ... } catch (e) { subscriber.error('Error: file may be corrupted or may not exist'); }` — this is a legitimate small robustness fix surfaced by writing a real test for a path the old mock-based test never actually exercised, apply it directly in `read-spreadsheet-service/read-spreadsheet.service.ts` alongside this test change.

- [ ] **Step 7: Convert the remaining spy-based tests following the same two patterns**

Apply Step 3's pattern (real `.txt` content via `tabDelimitedFile`, wrapped in a `setTimeout` per Step 3's note) to:
- `should pass the cached array and headerMappings to buildMspFile on submit, without re-reading the file` — keep its `vi.spyOn(component.buildMspService, 'buildMspFile')` (stubbing the terminal `saveAs`-triggering call is the same accepted convention as Task 37, not a logic-replacing mock), but replace the `readXlsx` spy with a real `.txt` file.
- `should clear headerMappings when no header row is found while parsing` — replace with a real `.txt` file whose content has no line matching any known/synonym header (e.g. `[['not', 'a', 'header', 'row']]`); remove the now-unnecessary `vi.spyOn(component.buildMspService, 'getHeaderPosition')` entirely, since the real header-detection logic will correctly return `-1` for this real content.
- `should set parsing=true and disable Submit while the async parse is still in flight (C1)` — a real `FileReader` read is already asynchronous, so this test's intent (assert `parsing === true` synchronously after `fileSelected()` returns, before the read completes) is naturally satisfiable with a real file — no `setTimeout` needed for the assertion itself (only run it before any `flush`/`setTimeout` that would let the read complete).
- `should not let a stale, slower parse subscription overwrite a later file selection's cached state (I1)` — this one genuinely depends on controlling relative timing between two in-flight parses (file A's read resolving after file B's), which real `FileReader` timing can't deterministically guarantee in a test. Leave this one test's `vi.spyOn(readSpreadsheetService, 'readXlsx')` swap for two controllable `Subject`s as-is — it is testing the component's own race-condition-guard logic (`parseSubscription.unsubscribe()` before starting a new parse), not `ReadSpreadsheetService`'s behavior, so stubbing the service boundary here is the correct call, not a violation of "real deps only" (that standard is about not faking the unit under test's own logic, not about banning test doubles at a genuinely external async boundary whose timing can't otherwise be controlled deterministically).

Run the full spec file after each conversion:
Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: PASS after every single conversion — convert one test at a time, don't batch multiple conversions before running.

- [ ] **Step 8: Final verification for this task**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`
Expected: PASS, full file

Run: `npx vitest run --coverage`
Expected: all four metrics still ≥80%

- [ ] **Step 9: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.spec.ts src/app/read-spreadsheet-service/read-spreadsheet.service.ts
git commit -m "test: replace ReadSpreadsheetService spies with real file parsing in component specs"
```

### Task 39: Add an integration test layer (T3)

**Files:** Create `src/app/read-spreadsheet/read-spreadsheet.integration.spec.ts`

- [ ] **Step 1: Write the integration spec**

This renders the real component against its real (fully unmocked) service graph, driving a complete file-select → submit → download flow in jsdom, without a browser — the "integration" layer between the unit specs and the Playwright e2e suite:
```typescript
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReadSpreadsheetComponent } from './read-spreadsheet.component';
import { DownloadFileService } from '../download-file-service/download-file.service';

describe('ReadSpreadsheetComponent (integration, real service graph)', () => {
	let fixture: ComponentFixture<ReadSpreadsheetComponent>;
	let component: ReadSpreadsheetComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [ReadSpreadsheetComponent, NoopAnimationsModule]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReadSpreadsheetComponent);
		component = fixture.debugElement.componentInstance;
		fixture.detectChanges();
	});

	it('should parse a real MS-DIAL text upload, populate the mapping panel, and produce a downloadable .msp with no service mocked', () => new Promise<void>((resolve, reject) => {
		const content = [
			['Alignment ID', 'Average Rt(min)', 'Average Mz', 'Metabolite name', 'Adduct type', 'Formula', 'INCHIKEY', 'MS1 isotopic spectrum', 'MS/MS spectrum'],
			['1', '6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.1:100', '35.09272:9 35.16082:7']
		].map(row => row.join('\t')).join('\n');
		const file = new File([content], 'integration-test.txt', { type: 'text/plain' });
		const fileList = { length: 1, 0: file } as unknown as FileList;

		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		setTimeout(() => {
			try {
				expect(component.submitValid).toBe(true);
				expect(component.headerMappings.length).toBeGreaterThan(0);
				expect(component.visibleHeaderMappings.some(m => m.recognizedAs === 'METABOLITE NAME')).toBe(true);

				const downloadFileService = TestBed.inject(DownloadFileService);
				const saveFileSpy = vi.spyOn(component.buildMspService, 'saveFile').mockImplementation(() => {});

				component.readFile();

				expect(saveFileSpy).toHaveBeenCalledTimes(1);
				const [mspContent, savedName] = saveFileSpy.mock.calls[0];
				expect(savedName).toBe('integration-test.msp');
				expect(mspContent).toContain('Name: 1-Methyltryptophan');
				expect(mspContent).toContain('InChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N');
				expect(downloadFileService).toBeTruthy();
				resolve();
			} catch (e) { reject(e); }
		}, 0);
	}));
});
```
(`saveFile` is stubbed here for the same reason as every other test that reaches this boundary — it triggers a real browser download via `saveAs()`. Every other collaborator — `ReadSpreadsheetService`, `BuildMspService`, `HeaderMappingService` — is the real, DI-resolved instance.)

- [ ] **Step 2: Run it**

Run: `npx vitest run src/app/read-spreadsheet/read-spreadsheet.integration.spec.ts`
Expected: PASS

- [ ] **Step 3: Verify it's included in the full suite and coverage run**

Run: `npm test && npx vitest run --coverage`
Expected: both PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.integration.spec.ts
git commit -m "test: add an integration layer exercising the real component + service graph"
```

### Task 40: Add a production-build smoke test (T3)

**Files:** Create `e2e/src/smoke.e2e-spec.ts`

- [ ] **Step 1: Write the smoke spec**

This is deliberately minimal — it exists to catch "the production bundle doesn't boot" class of failure that unit/integration tests can't see (a bad build config, a missing asset, a console error only the real bundle produces):
```typescript
import { test, expect } from '@playwright/test';

test.describe('production smoke test', () => {
	test('the app boots and renders with no console errors', async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on('console', msg => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});
		page.on('pageerror', err => consoleErrors.push(err.message));

		await page.goto('/');

		await expect(page.locator('.app-navbar__brand')).toHaveText('MSP Creator');
		await expect(page.locator('#file-input')).toBeAttached();
		await expect(page.locator('#submit')).toBeAttached();
		expect(consoleErrors).toEqual([]);
	});
});
```

- [ ] **Step 2: Verify it against the dev server first**

Run: `npx playwright test e2e/src/smoke.e2e-spec.ts`
Expected: PASS (Playwright's `webServer` config already runs `npm start` against this same spec pattern)

- [ ] **Step 3: Verify it against an actual production build**

```bash
npm run build
npx http-server dist/Read-Spreadsheet -p 4300 &
BASE_URL=http://localhost:4300 npx playwright test e2e/src/smoke.e2e-spec.ts --config playwright.config.ts
```
If `playwright.config.ts`'s hardcoded `baseURL: 'http://localhost:4300'` and `webServer` block prevent easily pointing at the static production build on a different port, that's fine for this task — the important coverage is the dev-server run from Step 2 (which already exercises the built Angular app, just via `ng serve` rather than a static file server) plus the existing `npm run build` check every phase already runs. Note in the PR description that a dedicated "serve the static prod build" smoke target is a reasonable future follow-up, not required here.

- [ ] **Step 4: Commit**

```bash
git add e2e/src/smoke.e2e-spec.ts
git commit -m "test: add a production smoke test asserting the app boots cleanly"
```

### Task 41: Add e2e coverage for orphaned fixtures (T2)

**Files:** Modify `e2e/src/app.e2e-spec.ts`

Eight fixtures in `e2e/testing-files/` are never referenced by the existing e2e suite. For each one below, the exact expected error text / row counts must come from actually running the app against the file (these are real, pre-existing spreadsheets whose exact contents this plan can't safely hand-compute) — write the assertion from observed behavior, not from a guess.

- [ ] **Step 1: Observe real behavior for each fixture**

For each fixture file, run a quick manual check with the dev server up (`npm start` in one terminal) by uploading it through the browser at `http://localhost:4300` and noting: does Submit stay disabled or enable? What does `#error-text` say? Does a `.msp` download happen, and if so does `#file-name-text` say "created" or "created with some issues"? Record these observations — you'll assert on exactly what you see, the same way every existing test in this file asserts on real, previously-observed behavior.

- [ ] **Step 2: Add a test for each fixture, following the file's existing conventions**

Insert new `test(...)` blocks into `e2e/src/app.e2e-spec.ts`, placed near the existing tests for the same category (duplicates near the duplicates test, missing-data near the msdial missing-data test, etc.), each shaped like the closest existing example:

For `Height_0_20198281030_QTOF_small_missing_data.xlsx` and `Height_0_20198281030_QTOF_small_duplicates_missing_data.xlsx` (fixtures built to exercise missing-data warnings, per T2's fix prompt), model the new tests on the existing `'should download an error file listing the msdial row with missing data'` test — upload, submit, assert `#error-text` contains `'Warning: Some entries have missing data'` (fill in the exact observed text from Step 1 if it differs), and confirm an error file downloads via `page.downloadErrorFile()`.

For `AveRt_AveMZ_MSMSSpec_small_duplicates.ods` and `AveRt_AveMZ_MSMSSpec_small_possible_duplicates.ods` (built for duplicate/possible-duplicate detection), model on the existing `'should download .msp and show error box with small file with duplicates'` test.

For `Height_0_20198281030_QTOF_small_remove_1_row.xlsx`, model on `'should download .msp cleanly from a large file with renamed/case-varied headers'` if it uploads cleanly, or on the duplicates test if removing a row was meant to create a duplicate/mismatch scenario — Step 1's observation determines which.

For `Height_3_20191021141_posHILIC_wUnknowns.xlsx` (built for unknown-metabolite handling), model on the existing msdial `'Unknown'`-row test — assert the downloaded `.msp` content contains an entry with `Name: Unknown` per the README's documented behavior ("rows with an unidentified... metabolite name are kept as long as they have a spectrum").

For `made_with_numbers.numbers`, model on `'should have a hidden error box and enabled submit button after uploading a valid .xlsx spreadsheet'` — this file already parses via `XLSX.readFile` per this plan's own investigation (66 rows, a real header row with a `"Class"` column), confirming it's a valid upload; assert Submit becomes enabled with no error box, and that Submit produces a downloadable `.msp` (per the README, `.numbers` is an explicitly documented supported extension that otherwise has zero e2e coverage today).

For `test_empty.csv` (confirmed via inspection to be a single blank line), model on the existing `'should still parse a selected file correctly after the underlying file is deleted from disk'` test's assertion shape (`'Error: column headers not found'`) as your first guess, but confirm against Step 1's real observation — an empty file may instead surface a different error (or even an unhandled exception, in which case note it as a candidate follow-up bug rather than silently asserting around it) since this exact edge case has never been exercised by any existing test.

- [ ] **Step 3: Run the new tests**

Run: `npx playwright test e2e/src/app.e2e-spec.ts`
Expected: PASS. If any fixture's real behavior turns out to be an actual bug (a crash, a confusing error, wrong data in the output) rather than the documented/expected behavior, do not paper over it with a lenient assertion — write the test asserting the *correct* expected behavior, note the failure in the PR description as a newly-discovered bug distinct from this remediation's scope, and leave that one test either `.skip()`-marked with a comment linking to a follow-up, or fix the underlying bug if it's small and obviously safe (use judgment; when in doubt, skip-and-flag rather than silently fix during a testing-focused phase).

- [ ] **Step 4: Commit**

```bash
git add e2e/src/app.e2e-spec.ts
git commit -m "test: add e2e coverage for the 8 previously-orphaned fixture files"
```

### Task 42: Final coverage verification (T4)

- [ ] **Step 1: Run full coverage**

Run: `npx vitest run --coverage`
Expected: statements/branches/functions/lines all ≥80%, with the 80% now backed by real-dependency tests rather than wiring-only mocks per Tasks 8.1–8.2.

- [ ] **Step 2: Run everything**

Run: `npm run lint && npm test && npx vitest run --coverage && npm run build && npx playwright test`
Expected: all PASS

- [ ] **Step 3: Commit anything outstanding, then ship**

Invoke `/gw:merge-it` for branch `test/quality-and-coverage`.

---

## Post-implementation

After Phase 8 merges: restart the dev server (`dev-stop.sh` / `dev-start.sh` if present, else `npm start`) and manually verify a clean startup, per this project's standing convention of restarting after every completed plan.
