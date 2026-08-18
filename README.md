# MSP From Spreadsheet

Build .msp files from spreadsheets of mass spectrometry data, or from a MS-DIAL "Alignment result" export.

**Spreadsheet upload** (.xlsx, .xls, .csv, .ods, .numbers): must include columns with these labels (spelling matters, capitalization doesn't):

- Average Rt(min)
- Average Mz
- Metabolite name
- Adduct type
- Formula
- INCHIKEY
- MS1 spectrum
- MSMS spectrum

An optional `SMILES` column (matched case-insensitively) is packed into the output's `Comments:` line as a `SMILES=` sub-field when present; its absence is not an error.

Rows with no MS/MS spectrum are skipped for both upload types — they're silently dropped, not written out with a blank `Num Peaks:` line.

Each uploaded column is auto-classified against the real MSP tags below, shown for review/override in the "Maps to MSP Tag" panel:

| Spreadsheet column | MSP output |
| --- | --- |
| Metabolite name | `Name:` |
| Formula | `Formula:` |
| INCHIKEY | `InChIKey:` |
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

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.3.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `npm test` to execute the unit tests via [Vitest](https://vitest.dev).

## Running end-to-end tests

Run `npm run e2e` to execute the end-to-end tests via [Playwright](https://playwright.dev).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
