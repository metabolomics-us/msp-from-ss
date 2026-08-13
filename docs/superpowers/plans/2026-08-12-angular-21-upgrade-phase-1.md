# Angular 8→21 Upgrade — Phase 1 (Version Chain) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move this Angular app from 8.2.4 to 21, one major version at a time, with the existing unit test suite green after every single hop and no code-style/behavior changes beyond what each version's official migration schematic applies automatically.

**Architecture:** 13 near-identical tasks, one per major version (9 through 21). Each task runs `ng update @angular/cli@N @angular/core@N` against a clean git tree, lets the official schematic apply its automatic migrations, bumps `ngx-spinner` to the version that supports Angular N (table below), runs the existing unit test suite headless, runs a production build, and commits. If a hop breaks a test, that task is not done until it's fixed forward — the next task does not start on a red baseline.

**Tech Stack:** Angular CLI's `ng update` schematic collection (official, version-pinned upgrades), Karma + Jasmine (existing, unchanged in this phase), npm.

## Global Constraints

- **Never skip a major version.** Each `ng update` call targets exactly N = current + 1. Do not jump (e.g., no `ng update @angular/core@12` from a v10 baseline).
- **Confirmed baseline (already verified before this plan was written):** on the `feature/angular-21-upgrade-phase-1` branch, at Angular 8.2.4, running `NODE_OPTIONS=--openssl-legacy-provider npx ng test --watch=false --browsers=ChromeHeadless` produces `TOTAL: 35 SUCCESS` (36 specs, 1 skipped). This is the contract every subsequent task must preserve exactly — same pass count, same skip count, no new failures.
- **`NODE_OPTIONS=--openssl-legacy-provider`** is required only because Angular 8's webpack 4 breaks under this machine's Node 24 (OpenSSL 3 removed the legacy MD4 hash webpack 4 uses). Drop it from commands the first time a hop's test/build run succeeds without it — note in that task's commit message which version stopped needing it.
- **Headless test command for every task:** `npx ng test --watch=false --browsers=ChromeHeadless` (prepend `NODE_OPTIONS=--openssl-legacy-provider` per the bullet above, until it's no longer needed). A Chrome binary is already present on this machine (`CHROME_BIN=/snap/bin/chromium`, also `/usr/bin/google-chrome`) — no browser install needed.
- **Production build command for every task:** `npx ng build --configuration production` (same `NODE_OPTIONS` rule applies).
- **No code changes beyond what `ng update`'s schematic generates**, except the minimum fix required to get a broken test or build green again. If a fix is non-trivial, use the systematic-debugging skill before touching code — don't guess.
- **Decline/skip any e2e-related migration prompt** `ng update` offers (e.g., an offer to migrate the Protractor e2e config). E2E replacement is Phase 3's job, not this phase's — leave `e2e/` and `protractor.conf.js` untouched in this phase even if they emit warnings.
- **One commit per task**, message format: `chore: upgrade to Angular N` (plus a body noting any fix-forward changes and the ngx-spinner version now in use).
- Every task starts from a clean working tree (`git status --porcelain` empty) — this is guaranteed by the previous task's commit step, and Task 1 starts clean because Phase 1 branches off right after the spec-doc commit.

### ngx-spinner version per Angular major

Confirmed via `npm view ngx-spinner@<version> peerDependencies` against each version's declared `@angular/core` peer range:

| Angular major (N) | ngx-spinner version to install | Peer range confirmed |
|---|---|---|
| 9 | *(no bump — stay on installed `9.0.2`, whose peer range is `^8.0.0`; this is a known loose-peer situation, not a bug — re-checked at N=10)* | `^8.0.0` |
| 10 | `10.0.1` | `^10.0.0` |
| 11 | `11.0.2` | `^11.0.0` |
| 12 | `12.0.0` | `^12.0.0` |
| 13 | `13.1.1` | `^13.0.0` |
| 14 | `14.0.0` | `^14.0.0` |
| 15 | `15.0.1` | `^15.0.0` |
| 16 | `16.0.2` | `>=15.0.0` |
| 17 | `17.0.0` | `>=15.0.0` |
| 18 | `18.0.0` | `>=18.0.0` |
| 19 | `19.0.0` | `>=19.0.0` |
| 20 | `21.0.0` | `>=20.0.0` |
| 21 | `21.1.0` | `>=20.0.0` |

Install with `npm install ngx-spinner@<version> --save-exact` in the task for that N. At N=9, skip this step entirely (see table).

---

### Task 1: Upgrade to Angular 9

**Files:**
- Modify: `package.json`, `package-lock.json`, and whatever `angular.json` / `tsconfig*.json` / `karma.conf.js` / `src/polyfills.ts` changes the `ng update` schematic generates (Angular 9's main schematic work is the Ivy-by-default migration). Do not hand-edit these beyond what the schematic produces plus any minimal fix-forward change.

**Interfaces:**
- Consumes: repo at Angular 8.2.4, working tree clean, baseline test count `35 SUCCESS` / 1 skipped (confirmed above).
- Produces: repo at Angular 9.x, same test count, committed — this is the starting state Task 2 consumes.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@9 @angular/core@9
```

If it reports peer conflicts and refuses, re-run with `--force` (safe here — the target version is deliberately pinned, not a guess).

- [ ] **Step 2: ngx-spinner**

No action — per the table, `9.0.2` (already installed, peer `^8.0.0`) stays as-is for this hop.

- [ ] **Step 3: Run unit tests**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped), same as baseline. If anything fails, use the systematic-debugging skill to find and fix the regression before proceeding — do not move to Step 4 on red.

- [ ] **Step 4: Run production build**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production
```

Expected: exits 0, `dist/Read-Spreadsheet` produced. If the build no longer needs `NODE_OPTIONS=--openssl-legacy-provider` to succeed, note that in the commit message.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 9"
```

---

### Task 2: Upgrade to Angular 10

**Files:** Same categories as Task 1, this hop's diff.

**Interfaces:**
- Consumes: repo at Angular 9.x, tests green (Task 1's output).
- Produces: repo at Angular 10.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@10 @angular/core@10
```

Re-run with `--force` if it refuses on peer conflicts.

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@10.0.1 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward (systematic-debugging skill) before continuing if not.

- [ ] **Step 4: Run production build**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 10"
```

---

### Task 3: Upgrade to Angular 11

**Files:** Same categories as Task 1, this hop's diff.

**Interfaces:**
- Consumes: repo at Angular 10.x, tests green (Task 2's output).
- Produces: repo at Angular 11.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@11 @angular/core@11
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@11.0.2 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 11"
```

---

### Task 4: Upgrade to Angular 12

**Files:** Same categories as Task 1, this hop's diff. Angular 12 removes the ViewEngine renderer entirely (Ivy-only from here on) — this only matters if the schematic surfaces a ViewEngine-specific config to remove; let it.

**Interfaces:**
- Consumes: repo at Angular 11.x, tests green (Task 3's output).
- Produces: repo at Angular 12.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@12 @angular/core@12
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@12.0.0 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production
```

Expected: exits 0. Angular 12 adds optional webpack 5 support — if the build succeeds without `NODE_OPTIONS=--openssl-legacy-provider` here, drop it and note that in the commit message.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 12"
```

---

### Task 5: Upgrade to Angular 13

**Files:** Same categories as Task 1, this hop's diff. Angular 13 raises the minimum TypeScript to 4.4 and drops IE11 support — no action needed from us either way, the schematic handles the `tsconfig.json`/`browserslist` bumps.

**Interfaces:**
- Consumes: repo at Angular 12.x, tests green (Task 4's output).
- Produces: repo at Angular 13.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@13 @angular/core@13
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@13.1.1 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

(Drop `NODE_OPTIONS` here unless a prior task's commit message said it was still needed — try without first.) Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 13"
```

---

### Task 6: Upgrade to Angular 14

**Files:** Same categories as Task 1, this hop's diff. Angular 14 adds standalone-component APIs (not adopted yet — that's Phase 2) and typed forms (not used by this app's two components, no action needed).

**Interfaces:**
- Consumes: repo at Angular 13.x, tests green (Task 5's output).
- Produces: repo at Angular 14.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@14 @angular/core@14
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@14.0.0 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 14"
```

---

### Task 7: Upgrade to Angular 15

**Files:** Same categories as Task 1, this hop's diff. Angular 15 makes standalone APIs stable and directive composition API available — not adopted yet (Phase 2).

**Interfaces:**
- Consumes: repo at Angular 14.x, tests green (Task 6's output).
- Produces: repo at Angular 15.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@15 @angular/core@15
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@15.0.1 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 15"
```

---

### Task 8: Upgrade to Angular 16

**Files:** Same categories as Task 1, this hop's diff. Angular 16 makes Playwright the CLI's default e2e schematic for *new* projects only — this project's existing `protractor.conf.js`/`e2e/` stay untouched (Global Constraints); do not let `ng update` remove or migrate them in this task.

**Interfaces:**
- Consumes: repo at Angular 15.x, tests green (Task 7's output).
- Produces: repo at Angular 16.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@16 @angular/core@16
```

If prompted about e2e tooling, decline/skip — see Global Constraints.

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@16.0.2 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 16"
```

---

### Task 9: Upgrade to Angular 17

**Files:** Same categories as Task 1, this hop's diff. Angular 17 introduces the new esbuild-based application builder as default for *new* projects; this project keeps its existing `@angular-devkit/build-angular:browser` builder in `angular.json` unless `ng update`'s schematic itself offers/applies a builder migration — let the schematic decide, don't hand-migrate the builder in this phase (that's a Phase 2 concern if at all).

**Interfaces:**
- Consumes: repo at Angular 16.x, tests green (Task 8's output).
- Produces: repo at Angular 17.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@17 @angular/core@17
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@17.0.0 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 17"
```

---

### Task 10: Upgrade to Angular 18

**Files:** Same categories as Task 1, this hop's diff. Angular 18 adds an experimental zoneless preview (`provideExperimentalZonelessChangeDetection`) — not adopted yet, that's Phase 2's zoneless work using the stabilized API.

**Interfaces:**
- Consumes: repo at Angular 17.x, tests green (Task 9's output).
- Produces: repo at Angular 18.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@18 @angular/core@18
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@18.0.0 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 18"
```

---

### Task 11: Upgrade to Angular 19

**Files:** Same categories as Task 1, this hop's diff. Angular 19 makes standalone the default for `ng generate` (irrelevant here — no new files generated in this phase) and stabilizes incremental hydration (irrelevant — this app isn't using SSR).

**Interfaces:**
- Consumes: repo at Angular 18.x, tests green (Task 10's output).
- Produces: repo at Angular 19.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@19 @angular/core@19
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@19.0.0 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 19"
```

---

### Task 12: Upgrade to Angular 20

**Files:** Same categories as Task 1, this hop's diff. Angular 20 stabilizes zoneless (`provideZonelessChangeDetection`) — still not adopted in this phase; note for Phase 2's own plan that the stable API name to use will be `provideZonelessChangeDetection` (no longer the `Experimental`-prefixed v18 name).

**Interfaces:**
- Consumes: repo at Angular 19.x, tests green (Task 11's output).
- Produces: repo at Angular 20.x, tests green, committed.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@20 @angular/core@20
```

- [ ] **Step 2: ngx-spinner**

Per the table, jump to `21.0.0` here (no ngx-spinner version targets Angular 20 specifically; `21.0.0`'s peer range `>=20.0.0` covers it):

```bash
npm install ngx-spinner@21.0.0 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 20"
```

---

### Task 13: Upgrade to Angular 21

**Files:** Same categories as Task 1, this hop's diff.

**Interfaces:**
- Consumes: repo at Angular 20.x, tests green (Task 12's output).
- Produces: repo at Angular 21.x, tests green, committed — this is Phase 1's final state and what Phase 2's plan will consume as its starting point.

- [ ] **Step 1: Run the update**

```bash
npx ng update @angular/cli@21 @angular/core@21
```

- [ ] **Step 2: ngx-spinner**

```bash
npm install ngx-spinner@21.1.0 --save-exact
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `TOTAL: 35 SUCCESS` (1 skipped). Fix forward before continuing if not.

- [ ] **Step 4: Run production build**

```bash
npx ng build --configuration production
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Angular 21"
```

- [ ] **Step 6: Confirm final version**

```bash
npx ng version
```

Expected: Angular CLI and all `@angular/*` packages report major version 21.

---

## After Task 13

Phase 1 is done: the app is on Angular 21, all 5 existing spec files pass, production build succeeds. Push the branch and open the PR for Phase 1 (per this repo's `gw:merge-it` workflow) before starting Phase 2's own brainstorm/plan — Phase 2 is a separate branch off `master` once this PR merges, per the design doc's four-independent-PRs approach.
