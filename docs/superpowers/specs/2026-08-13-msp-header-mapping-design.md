# MSP Header Mapping — Design

## Summary

When a spreadsheet or MS-DIAL file is loaded, scan its header row, flag
columns that look like per-sample data columns, and try to match the
remaining columns to the app's known MSP fields (`vitalHeaders`). Let the
user review and override this mapping in an optional panel, and choose to
carry unmatched columns' per-row values into the `.msp` output as extra
`Comments:` content instead of silently dropping them.

## Background

Today, `BuildMspService.removeAttributes` (`build-msp.service.ts:150`) uses
`_.pick(entry, ...requiredHeaders)` to keep only the fixed `vitalHeaders`
columns (`AVERAGE RT(MIN)`, `AVERAGE MZ`, `METABOLITE NAME`, `ADDUCT TYPE`,
`FORMULA`, `INCHIKEY`, `MS1 SPECTRUM`, `MSMS SPECTRUM`). Any other column —
a differently-worded metadata header, or a per-sample intensity column — is
silently discarded. Header matching itself
(`getHeaderPosition`/`lineHasHeaders`/`hasHeaderErrors`) is exact-string
equality against `vitalHeaders` (after uppercasing/trimming), with exactly
one hardcoded alias for MS-DIAL (`MS/MS SPECTRUM` → `MSMS SPECTRUM`, in
`applyMsdialHeaderAliases`).

There is no existing concept of a "sample name" column anywhere in the
codebase (confirmed via search) — this design introduces it.

## Decisions

1. **Sample-column detection is a name-pattern heuristic**, not positional
   or fully manual: a header matching a generic "Sample N" style (e.g.
   `Sample 1`, `Sample_02`, `S01`) is flagged as a sample column and
   excluded from mapping by default. This is a best-effort default, not a
   hard rule — the user can still see and override classification for any
   header via the review panel.
2. **Key matching uses a synonym dictionary + normalization**, not fuzzy
   string similarity — trim/uppercase the header, check exact
   `vitalHeaders` match, then check a small hardcoded per-key synonym list
   (extending the existing single-alias pattern already in the code).
3. **Unmatched-header values become per-row `Comments:` content, opt-in**:
   when the user marks a header as "Add as comment," that column's value
   for each row is appended to that row's Comments line as `Header: value`.
   This is the only way today's silently-dropped data gets preserved.
4. **Comments line format**: global notes text (from the existing notes
   textarea) first, then `; Header: value` pairs for each comment-marked
   column present on that row — e.g.
   `Comments: <global notes>; Notes: some per-row text; Batch: 3`. The line
   is omitted entirely if both are empty, as today.
5. **Default mapping preserves today's behavior exactly** when the user
   never opens the review panel: synonym/exact-matched headers map to
   their MSP key (as today), sample-pattern headers are ignored (as
   today's silent drop), and any other unmatched header defaults to
   *ignore*, not *comment* — carrying extra data into the output is
   opt-in, never automatic.
6. **Applies to both upload formats** (spreadsheet and MS-DIAL `.txt`) —
   one mapping mechanism, no format-specific UI branching.
7. **Review panel is optional and collapsed by default**, following the
   existing "Notes" toggle pattern — not a blocking step in the upload
   flow.

## Architecture

New `HeaderMappingService` holds pure classification logic, decoupled from
the read/build pipeline:

- `isSampleColumn(header: string): boolean` — regex test, e.g.
  `/^sample[\s_-]*\d+$/i`.
- `SYNONYMS: Record<MspKey, string[]>` — small, extensible per-key synonym
  list (e.g. `'METABOLITE NAME': ['NAME', 'COMPOUND NAME', 'COMPOUND']`,
  `'AVERAGE RT(MIN)': ['RT', 'RETENTION TIME']`,
  `'AVERAGE MZ': ['MZ', 'PRECURSOR MZ', 'M/Z']`, etc.).
- `suggestKey(header: string, knownKeys: string[]): string | null` —
  normalize, exact-match against `knownKeys`, then check synonyms.
- `classify(headers: string[], knownKeys: string[]): HeaderMapping[]` —
  per header: `{ header, action, targetKey }`, defaults per Decision 5.

`HeaderMapping = { header: string; action: 'map' | 'comment' | 'ignore';
targetKey: string | null }`.

`BuildMspService.vitalHeaders` remains the single source of truth for known
MSP keys; `HeaderMappingService` takes it as an input rather than
duplicating the list.

Parsing moves earlier in the flow: today the file is only read when Submit
is clicked (`readFile()` triggers the read observable and `buildMsp()`
together). To show real headers in the review panel before submission,
`fileSelected()` will eagerly subscribe to the existing read observable
(`readXlsx`/`readAlignmentResultTxt`), cache the parsed 2D array, locate
the header row, and run `classify()` on it. Submit reuses the cached array
and the (possibly user-edited) mappings — no second parse.

## Components & data flow

**`header-mapping.service.ts`** (new)
- `isSampleColumn`, `SYNONYMS`, `suggestKey`, `classify` as above.
- No dependencies beyond the `knownKeys` list passed in.

**`read-spreadsheet.component.ts`**
- `fileSelected()`: on valid extension, subscribe to the read observable
  immediately (instead of only on Submit), cache the resulting
  `msmsArray`, locate the header row, and set
  `headerMappings = headerMappingService.classify(headers, buildMspService.vitalHeaders)`.
- New `showMappingPanel` boolean + toggle method, mirroring
  `showNotes`/`showNotesTextArea()`.
- Template gains a table (one row per non-sample header) with a dropdown
  per row to change `action`/`targetKey`: any MSP key, "Add as comment,"
  or "Ignore." Sample-flagged headers are not listed.
- `readFile()`/`buildMsp()`: use the cached `msmsArray` and current
  `headerMappings` instead of re-subscribing to the read observable.

**`build-msp.service.ts`**
- Header-row *detection* (`getHeaderPosition` → `lineHasHeaders`) switches
  from exact `vitalHeaders` equality to
  `headerMappingService.suggestKey(...) !== null`, so a row is recognized
  as the header row if at least one column resolves to a known key via
  exact match or synonym — not just literal `vitalHeaders` membership.
- `buildMspFile(msmsArray, fileName, notes, format, headerMappings)` gains
  a `headerMappings` parameter.
- Before `removeAttributes`: headers with `action: 'map'` are renamed to
  their `targetKey` in each row's dict; headers with `action: 'comment'`
  have their per-row value collected into a new `_extraComments: {header,
  value}[]` field on that row's dict; `action: 'ignore'` columns are left
  as-is (and then dropped by the existing `removeAttributes` `_.pick`,
  unchanged).
- `removeAttributes` is called with `[...requiredHeaders, '_extraComments']`
  so the collected comments survive the pick.
- `buildMspStringFromArray`: Comments line becomes global notes + `;
  Header: value` pairs from `_extraComments`, per Decision 4.
- `removeDuplicates`, `collectMissingData`, `removeRowsWithoutSpectrum`
  operate on the renamed (canonical) keys — unchanged otherwise.

## Error handling

- Eager parsing on file select reuses the existing per-format read
  observables and their existing `error` handling
  (`updateErrorText`/`showCorrectImage`) — no new error path, just
  triggered earlier.
- If header-row detection still fails (no column resolves to any known
  key, even via synonym), behavior is unchanged: `errorWarning = 'Error:
  column headers not found'`.
- Required-header validation (`hasHeaderErrors`) is unaffected — it checks
  for the presence of required *canonical* keys after mapping is applied,
  same as today's exact-match check for already-matching headers.
- A header the user maps to an MSP key that's already present verbatim
  (e.g. mapping some other column onto `METABOLITE NAME` when the file
  also already has a literal `METABOLITE NAME` column) is not specially
  detected — last-applied mapping wins, consistent with plain object-key
  assignment. Out of scope to add a UI warning for this in v1.

## Testing plan

- **Unit**: `HeaderMappingService` — sample-pattern regex cases, exact and
  synonym key matching, `classify()` default actions (map/ignore) per
  Decision 5.
- **Unit**: `BuildMspService` — mapping-aware header-row detection with
  renamed/synonym headers, `_extraComments` collection and survival
  through `removeAttributes`, Comments-line merge (global notes only,
  per-row comments only, both, neither).
- **Integration**: `buildMspFile` end-to-end with a small fixture
  containing one exact-match header, one synonym header, one sample-style
  column, and one unmatched header marked as a comment — asserting the
  final `.msp` string content.
- **Unit**: `ReadSpreadsheetComponent` — eager parse on `fileSelected`,
  panel toggle, edited mapping flowing through to `buildMspFile`'s call
  args on Submit.
- **E2E**: upload a fixture, open the mapping panel, change a mapping and
  mark one header as a comment, submit, assert the downloaded `.msp`
  reflects the override.
- **Smoke**: existing smoke coverage extended to confirm a plain upload
  with the panel left untouched still produces the same output as before
  this change (regression guard for Decision 5).

## Out of scope

- Fuzzy/similarity-based key matching.
- Positional or structural (column-order-based) sample-column detection.
- Persisting a user's mapping choices across uploads (e.g. via
  localStorage).
- Warning the user about mapping collisions (two columns mapped to the
  same MSP key).
- Any change to the notes textarea's existing single-global-note behavior
  beyond how it's now combined with per-row comments on the same line.
