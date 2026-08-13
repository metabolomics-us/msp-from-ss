# MS-DIAL AlignmentResult (.txt) Support — Design

## Summary

Add MS-DIAL "Alignment result" export files (tab-delimited `.txt`) as a second
supported input format, alongside the existing spreadsheet upload
(`.xlsx`/`.xls`/`.csv`/`.ods`/`.numbers`), for building `.msp` spectral
library files.

## Background

Reference sample files: `~/Downloads/tmp/Msms-05001413-positive.txt` and
`~/Downloads/tmp/Msms-05001413-negative.txt`.

MS-DIAL's alignment result export is plain tab-delimited text, not a binary
spreadsheet:

- 4 metadata rows (`Class`, `File type`, `Injection order`, `Batch ID`)
  precede the header row.
- The header row includes MS-DIAL's native column names, most of which
  match the app's existing `vitalHeaders` exactly (`Average Rt(min)`,
  `Average Mz`, `Metabolite name`, `Adduct type`, `Formula`, `INCHIKEY`),
  but two differ: `MS/MS spectrum` (vs. `MSMS SPECTRUM`) and
  `MS1 isotopic spectrum` (vs. `MS1 SPECTRUM`).
- Data rows: 40,579 in the positive-mode sample. Of those, 25,488 have
  `Metabolite name = "Unknown"` and 33,934 have no MS/MS spectrum value at
  all (literal `null` or empty). Only 6,645 (positive) / 4,585 (negative)
  rows have a real MS/MS spectrum.
- Missing `Formula`/`INCHIKEY` values are written as the literal string
  `"null"`, not an empty cell.
- MS/MS and MS1 spectrum values use the same `mz:intensity mz:intensity ...`
  format the app's `MSMS SPECTRUM` column already expects.
- Files can be tens of MB — well past the existing spreadsheet reader's
  10,000-row cap (`read-spreadsheet.service.ts`), which exists specifically
  to detect XLSX/ODS phantom-row corruption and doesn't apply to plain text.

## Decisions

1. **Row filtering**: skip rows with no MS/MS spectrum (empty or literal
   `"null"`). Applies to *both* formats — a spectrum-less entry isn't
   useful in a spectral library regardless of source. Rows with an
   "Unknown" metabolite name are otherwise kept, as long as they have a
   spectrum.
2. **`"null"` normalization**: the literal string `"null"` is treated as
   blank wherever it appears (Formula, INCHIKEY, etc.), for both formats.
   Applied inside `buildJsonArray`, before the existing truthy check that
   decides whether a key is added to a row's dict — so it flows through
   the existing missing-data reporting without new logic.
3. **`MS1 isotopic spectrum` is not mapped** to `MS1 SPECTRUM` — it's
   simply dropped like any other extra MS-DIAL column. Note: `MS1
   SPECTRUM` is currently validated as a required header but its value is
   never written into the `.msp` output (checked in
   `buildMspStringFromArray`), so this only affects validation, not
   output content.
4. **`MS1 SPECTRUM` becomes optional for MS-DIAL uploads only** — the
   spreadsheet format's required-header set (`vitalHeaders`) is unchanged;
   MS-DIAL uploads validate against that same list minus `MS1 SPECTRUM`.
5. **`.txt` is scoped exclusively to MS-DIAL AlignmentResult parsing** —
   no content-sniffing or generic delimited-text detection. This matches
   what was requested and avoids speculative format-guessing.

## Architecture

Reuse the existing pipeline; add two seams:

- **New read path** for `.txt` in `ReadSpreadsheetService`:
  `readAlignmentResultTxt(files: FileList): Observable<string[][]>` reads
  via `FileReader.readAsText` (not binary) and splits on `\n` then `\t`
  into the same `string[][]` shape `readXlsx` produces. No row-count cap.
- **Header/value normalization** in `BuildMspService`, applied before
  `vitalHeaders` matching: alias `MS/MS SPECTRUM` → `MSMS SPECTRUM`;
  normalize literal `"null"` → `''`.

Everything downstream (`getHeaderPosition`, `hasHeaderErrors`,
`buildJsonArray`, `removeDuplicates`, `.msp` string building) is shared
between both formats, parameterized by a source-format flag where needed.

## Components & data flow

**`read-spreadsheet.component.ts`**
- Extension regex extended to accept `.txt`.
- `fileSelected`/`readFile` branch by extension: `.txt` → new read method;
  existing five extensions → `readXlsx` (unchanged).
- Passes a source-format flag (`'spreadsheet' | 'msdial'`) through to
  `buildMspService.buildMspFile(...)`.

**`read-spreadsheet.service.ts`**
- New method `readAlignmentResultTxt(files: FileList): Observable<string[][]>`.
- Same event-based error handling pattern as `readXlsx` (`error` listener
  on the `FileReader` → `subscriber.error(...)`).

**`build-msp.service.ts`**
- `buildMspFile(msmsArray, fileName, notes, format)` gains a `format`
  parameter (`'spreadsheet' | 'msdial'`), threaded to:
  - `hasHeaderErrors` / `collectMissingData` / `removeAttributes`: use
    `vitalHeaders` for `'spreadsheet'`, or `vitalHeaders` minus
    `'MS1 SPECTRUM'` for `'msdial'`.
  - Header normalization: alias `MS/MS SPECTRUM` → `MSMS SPECTRUM` when
    present in the header row.
  - `buildJsonArray`: normalize literal `"null"` values to `''` before the
    existing truthy check that adds a key to the row dict.
  - Row filtering: after building the JSON array (and before dedup), drop
    rows where `MSMS SPECTRUM` is empty/missing — for both formats.
- `removeDuplicates`, `buildMspStringFromArray` unchanged.

## Error handling

- File read errors for `.txt` follow the same pattern as `readXlsx`,
  surfaced through the existing `updateErrorText` UI path.
- Header errors reuse `hasHeaderErrors`/`errorWarning` unchanged, evaluated
  against the format-appropriate required-header list.
- `"null"` normalization flows through the existing missing-data reporting
  path (`collectMissingData`) rather than introducing a parallel one.
- Filtered-out no-spectrum rows are not reported as errors — for MS-DIAL
  exports, a missing spectrum reflects unidentified/unfragmented features,
  not a data-entry mistake.
- **Known limitation, not addressed by this change**: `removeDuplicates` is
  O(n²) (string `indexOf` in a loop). At MS-DIAL scale (~4.5–6.6k filtered
  rows in the reference samples) that's tens of millions of comparisons —
  likely a few seconds of main-thread blocking, more noticeable than
  today's typical spreadsheet sizes but not a new class of problem.

## Testing plan

- **Unit**: `ReadSpreadsheetService.readAlignmentResultTxt` parses a
  tab-delimited fixture into the expected 2D array; `BuildMspService`
  cases for MS-DIAL header aliasing, `"null"`-to-blank normalization,
  MS1-optional-for-msdial header validation, and no-MS/MS row filtering.
- **Integration**: full `buildMspFile` run against a small trimmed fixture
  (a dozen or so representative rows extracted from the real sample files:
  an identified row with spectrum, an "Unknown" row with spectrum, a row
  with literal `"null"` Formula, a row with no spectrum), asserting the
  final `.msp` string.
- **E2E (Playwright)**: upload a `.txt` fixture through the UI, submit,
  assert success state and download.
- **Smoke**: extend existing smoke coverage to include a `.txt` upload
  alongside the current spreadsheet case.
- Fixtures are small hand-trimmed excerpts committed to the repo — not the
  full 26–37MB reference files.

## Out of scope

- Generic delimited-text format detection for arbitrary `.txt` files.
- Merging positive/negative mode files into a single upload/output.
- Performance rework of `removeDuplicates`.
- UI copy changes beyond what's needed to mention the new format (exact
  wording left to implementation).
