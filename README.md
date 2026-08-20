# MSP From Spreadsheet

Build .msp files from spreadsheets of mass spectrometry data, or from a MS-DIAL "Alignment result" export.

## Overview

This is an Angular 22 single-page app (standalone components, strict TypeScript) that runs entirely in the browser: a spreadsheet or MS-DIAL export is parsed client-side and converted into a NIST-style `.msp` spectral-library file for download, with no backend or file upload to a server involved. It's deployed as a static build served behind Caddy in a small Docker Compose stack on an AWS Lightsail instance — see [Deployment](#deployment) below.

Key pieces:
- `src/app/read-spreadsheet/` — the upload UI and header-mapping panel
- `src/app/read-spreadsheet-service/` — parses .xlsx/.csv/.ods/.numbers (via a Web Worker) and MS-DIAL `.txt` AlignmentResult exports
- `src/app/header-mapping-service/` — classifies spreadsheet columns against the recognized MSP-tag vocabulary (exact match, synonyms, or sample-column detection)
- `src/app/build-msp-service/` — validates required fields, dedupes rows, and builds the final `.msp` text
- `e2e/` — Playwright end-to-end tests; `src/**/*.spec.ts` — Vitest unit tests

**Spreadsheet upload** (.xlsx, .xls, .csv, .ods, .numbers): must include columns with these labels (spelling matters, capitalization doesn't):

- Average Rt(min)
- Average Mz
- Metabolite name
- Adduct type
- MS1 spectrum
- MSMS spectrum

`Formula` and `INCHIKEY` columns are optional — a spreadsheet may omit either column entirely, or leave the value blank on individual rows, without triggering a validation error; when present, their real values are still written to the output.

An optional `SMILES` column (matched case-insensitively) is packed into the output's `Comments:` line as a `SMILES=` sub-field when present; its absence is not an error.

Rows with no MS/MS spectrum are skipped for both upload types — they're silently dropped, not written out with a blank `Num Peaks:` line.

Each uploaded column is auto-classified against the real MSP tags below, shown for review/override in the "Maps to MSP Tag" panel:

| Spreadsheet column | MSP output |
| --- | --- |
| Metabolite name | `Name:` |
| Formula (optional) | `Formula:` |
| INCHIKEY (optional) | `InChIKey:` |
| Average Mz | `ExactMass:` |
| Adduct type | `Precursor_type:` |
| Average Rt(min) | `Comments:` sub-field `RT=` |
| SMILES (optional) | `Comments:` sub-field `SMILES=` |
| MS1 spectrum | validated on input, never written to output |
| MSMS spectrum | drives `Num Peaks:` and the peak list |

**MS-DIAL AlignmentResult upload** (.txt): MS-DIAL's own column names are used directly (`MS/MS spectrum`, etc.); `MS1 isotopic spectrum` isn't used. Rows with an unidentified ("Unknown") metabolite name are kept as long as they have a spectrum.

## MSP format reference

The `.msp` format is a NIST/Mascot spectral-library text format: one block per spectrum, a header of `Keyword: value` lines, then a peak list.

**Required header fields**
- `Name:` — spectrum/compound identifier
- `Num Peaks:` — count of mass/intensity pairs that follow; terminates the header block

**Common optional header fields**
- `Synon:` — synonym/alternate name (repeatable)
- `MW:` — molecular weight
- `Formula:` — molecular formula
- `ExactMass:` — exact/monoisotopic mass
- `CAS#:` — CAS registry number (often shares a line with `NIST#:`)
- `NIST#:` — NIST library accession number
- `DB#:` — database index number (assigned when exported from a NIST library)
- `Comment:` — free-text annotation, often packed with `key=value` sub-fields (e.g. `Parent=`, `Mz_exact=`, `Mods=`, `Protein=`, `Charge=`, `Collision_energy=`)
- `Mods:` — peptide modification list (position/residue/name)
- `InChIKey:` — structure identifier
- `RelativeArea:` — relative peak-area weighting (GC-library variant)
- `Precursor_type:` — adduct/ionization type (e.g. `[M+H]+`)

**Peak list**

After `Num Peaks:`, each line is a tab/space-separated `m/z  intensity  [annotation]` triplet.

**Quirks to watch for**
- `Name` can run up to 511 characters, `Comment` up to 1023.
- Mascot's parser reads the peak-count keyword as `Num peaks:`; the related SpectraST format uses `NumPeaks:` (no space) instead.

Sources: [Matrix Science Mascot Parser — ms_spectral_lib_entry](http://www.matrixscience.com/msparser/help/classmatrix__science_1_1ms__spectral__lib__entry.html), [Mascot help: Spectral library search](http://www.matrixscience.com/help/spectral_library.html), [ReadMsp (mssearchr)](https://www.rdocumentation.org/packages/mssearchr/versions/0.2.0/topics/ReadMsp).

This project was originally generated with [Angular CLI](https://github.com/angular/angular-cli) (now on Angular 22).

## Development server

Run `./dev-start.sh` (or `npm start` / `ng serve`) for a dev server, then navigate to `http://localhost:4300/` (`dev-start.sh` binds port 4300 and tracks its PID in `.dev.pid`, gitignored, so it's safe to re-run). Stop it with `./dev-stop.sh`. The app auto-reloads on source changes.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` (`ng build`) to build the project. Build artifacts are written to `dist/`.

## Running unit tests

Run `npm test` to execute the unit tests via [Vitest](https://vitest.dev), or `npm run test:coverage` for a coverage report (CI requires 80%+ statements/branches/functions/lines).

## Running end-to-end tests

Run `npm run e2e` to execute the end-to-end tests via [Playwright](https://playwright.dev). `npm run smoke:docker` builds the production Docker image and smoke-tests it standalone (root + a deep-link SPA route both return 200) without needing the full deploy stack.

## Linting

Run `npm run lint` (`ng lint`). CI treats lint, type-check, build, unit tests, e2e tests, and the Docker smoke test as required checks.

## Deployment

The app builds to static files, served by nginx inside a Docker image (`docker/Dockerfile`), fronted by Caddy for automatic HTTPS (`docker/Caddyfile`), running via Docker Compose (`docker/docker-compose.yml`) on a single AWS Lightsail instance. It's currently live at **https://mspcreator.metabolomics.us**.

The whole flow — building/pushing the image and rolling it out — is one idempotent script:

```bash
./docker/provision-lightsail.sh
```

Requirements: AWS CLI v2 with credentials for Lightsail/ECR/IAM/Route53 access, Docker, `ssh`/`scp`.

Each run:
1. Builds the app image from the current working tree (`docker/Dockerfile`) and pushes it to ECR as `:latest`. **This is also how you ship a new deploy** — merge to `master`, then re-run the script.
2. Creates the ECR repo, an ECR-pull-only IAM user, a Lightsail key pair, and the `mspcreator` Lightsail instance itself — but only if they don't already exist, so re-running against an already-provisioned environment just redeploys.
3. Resets the instance firewall to allow 22/80/443, and UPSERTs the `mspcreator.metabolomics.us` Route53 `A` record to the instance's current public IP (the instance uses a dynamic IP by design — re-running this script after a stop/start is how DNS gets re-pointed).
4. Copies `docker-compose.yml`, `Caddyfile`, and `docker/.env` to the instance (no source code or build context ever goes to the instance — it only ever pulls the prebuilt image).
5. Pulls the new image on the instance and runs `docker compose up -d`.

Config lives in `docker/.env` (gitignored; copied from `docker/.env.example` on first run) — `DOMAIN`, `EMAIL` (for Caddy's ACME/Let's Encrypt registration), and `ECR_IMAGE`. AWS resource tags are read from `aws-tags.json` at the repo root.

Generated secrets (the Lightsail SSH key pair and the IAM pull user's access key) are cached under `docker/.keys/` (gitignored) and reused on subsequent runs rather than regenerated.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
