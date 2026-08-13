# MS-DIAL AlignmentResult (.txt) Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload a MS-DIAL "Alignment result" export (tab-delimited `.txt`) as a second input format, alongside the existing spreadsheet upload, to build `.msp` spectral library files.

**Architecture:** Add a new plain-text read path (`ReadSpreadsheetService.readAlignmentResultTxt`) that produces the same `string[][]` shape the existing `readXlsx` produces, so the entire downstream `BuildMspService` pipeline (header detection, JSON-array building, dedup, `.msp` string assembly) is shared between both formats. `BuildMspService.buildMspFile` gains a `format: 'spreadsheet' | 'msdial'` parameter that changes three things: which headers are required, one header alias (`MS/MS SPECTRUM` → `MSMS SPECTRUM`), and which headers count toward the "missing data" warning.

**Tech Stack:** Angular 21, TypeScript, RxJS, Jasmine/Karma (unit), Protractor (e2e). No new dependencies.

## Global Constraints

- Work happens on branch `feature/msdial-alignment-result-support` (already created). Never commit to `master`.
- TDD: write the failing test before the implementation for every step below.
- Every new/changed method must keep existing callers working via default parameter values — do not break the existing unit or e2e test suites.
- No mocks/stubs for the new logic being tested — assert on real inputs/outputs. The codebase's existing `jasmine.createSpy` usage in a couple of pre-existing tests is legacy style; don't add new spy-heavy tests for the logic this plan introduces.
- Match existing code style per file (tabs in `build-msp.service.ts` / `read-spreadsheet.service.ts`, spaces in `read-spreadsheet.component.ts`) rather than reformatting.
- Commit after each task with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` in the message footer, matching this repo's convention.
- Reference spec: `docs/superpowers/specs/2026-08-13-msdial-alignment-result-design.md`.

---

### Task 1: `BuildMspService` — per-format required headers, MS-DIAL header aliasing, and a `collectMissingData` correctness fix

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.ts:106-129` (`collectMissingData`, `removeAttributes`), `:184-203` (`hasHeaderErrors`)
- Test: `src/app/build-msp-service/build-msp.service.spec.ts`

**Interfaces:**
- Produces: `export type MspSourceFormat = 'spreadsheet' | 'msdial';` (new, exported from `build-msp.service.ts`)
- Produces: `getRequiredHeaders(format: MspSourceFormat): string[]` — returns `vitalHeaders` for `'spreadsheet'`, or `vitalHeaders` minus `'MS1 SPECTRUM'` for `'msdial'`.
- Produces: `applyMsdialHeaderAliases(headers: string[]): string[]` — maps `'MS/MS SPECTRUM'` → `'MSMS SPECTRUM'`, leaves everything else unchanged.
- Modifies signature: `hasHeaderErrors(headers: any[], requiredHeaders: string[] = this.vitalHeaders): boolean`
- Modifies signature: `collectMissingData(jsonArray: any[], correctionFactor: number, requiredHeaders: string[] = this.vitalHeaders): void`
- Modifies signature: `removeAttributes(jsonArray: any[], requiredHeaders: string[] = this.vitalHeaders): any[]`

Note on the `collectMissingData` fix: the current implementation has a `keyArray.length != vhLen` shortcut that only works because callers always pass a dict built and required against the *same* header list. Task 3 introduces a case where the dict is built against one header list but checked for "missing data" against a narrower one — the shortcut would then misfire (push a bogus near-empty entry for every row). This task replaces the shortcut with a direct `missingCols.length > 0` check, which is correct for both the existing usage and the new one.

- [ ] **Step 1: Write failing tests for the new/changed methods**

Add to `src/app/build-msp-service/build-msp.service.spec.ts` (after the existing `hasHeaderErrors` tests, i.e. after line 114):

```typescript
	// getRequiredHeaders

	it('should return vitalHeaders unchanged for spreadsheet format', () => {
		expect(service.getRequiredHeaders('spreadsheet')).toEqual(service.vitalHeaders);
	});

	it('should exclude MS1 SPECTRUM for msdial format', () => {
		expect(service.getRequiredHeaders('msdial')).toEqual(
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MSMS SPECTRUM']
		);
	});

	// applyMsdialHeaderAliases

	it('should alias MS/MS SPECTRUM to MSMS SPECTRUM', () => {
		const headers = ['AVERAGE RT(MIN)', 'MS/MS SPECTRUM'];
		expect(service.applyMsdialHeaderAliases(headers)).toEqual(['AVERAGE RT(MIN)', 'MSMS SPECTRUM']);
	});

	it('should leave headers with no MS-DIAL alias unchanged', () => {
		const headers = ['AVERAGE RT(MIN)', 'MSMS SPECTRUM', 'MS1 ISOTOPIC SPECTRUM'];
		expect(service.applyMsdialHeaderAliases(headers)).toEqual(headers);
	});

	// hasHeaderErrors with an explicit requiredHeaders param

	it('should return false for msdial headers missing MS1 SPECTRUM when checked against msdial required headers', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers, service.getRequiredHeaders('msdial'))).toBe(false);
	});

	it('should still return true when MS1 SPECTRUM is missing and no requiredHeaders param is given (spreadsheet default)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers)).toBe(true);
	});

	// removeAttributes with an explicit requiredHeaders param

	it('should keep only the given requiredHeaders when picking attributes', () => {
		const entry = {'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X', 'MS1 SPECTRUM': 'ignored', 'EXTRA': 'drop me'};
		const requiredHeaders = ['AVERAGE RT(MIN)', 'METABOLITE NAME'];
		expect(service.removeAttributes([entry], requiredHeaders)).toEqual([{'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X'}]);
	});

	it('should default to vitalHeaders when no requiredHeaders param is given', () => {
		const entry = {'AVERAGE RT(MIN)': '6.23', 'MS1 SPECTRUM': 'kept', 'EXTRA': 'drop me'};
		expect(service.removeAttributes([entry])).toEqual({'AVERAGE RT(MIN)': '6.23', 'MS1 SPECTRUM': 'kept'} as any);
	});

	// collectMissingData with an explicit requiredHeaders param

	it('should not flag a row as missing when its dict has extra keys the requiredHeaders list does not check', () => {
		// Simulates a dict built against a wider header list than the one collectMissingData checks against
		const jsonArray = [
			{'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.1', 'METABOLITE NAME': 'X', 'ADDUCT TYPE': '[M+H]+',
			 'FORMULA': 'C1', 'INCHIKEY': 'ABC', 'MSMS SPECTRUM': '1:1'}
		];
		const narrowerHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY'];
		service.collectMissingData(jsonArray, 2, narrowerHeaders);
		expect(service.missingData.length).toBe(0);
	});

	it('should still flag a row missing a header the requiredHeaders list does check', () => {
		const jsonArray = [
			{'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X'}
		];
		service.collectMissingData(jsonArray, 2, ['AVERAGE RT(MIN)', 'METABOLITE NAME', 'FORMULA']);
		expect(service.missingData).toEqual(['2: FORMULA']);
	});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: FAIL — `getRequiredHeaders`, `applyMsdialHeaderAliases` are not functions; `hasHeaderErrors`/`removeAttributes`/`collectMissingData` reject the second/third argument or the new assertions don't hold against current behavior.

- [ ] **Step 3: Implement `MspSourceFormat`, `getRequiredHeaders`, `applyMsdialHeaderAliases`**

At the top of `src/app/build-msp-service/build-msp.service.ts`, after the existing imports (after line 3), add:

```typescript
export type MspSourceFormat = 'spreadsheet' | 'msdial';
```

Inside the `BuildMspService` class, after the constructor (after line 21), add:

```typescript
	// Vital headers required for a given source format
	//  MS-DIAL uploads don't require MS1 SPECTRUM: it's validated but never written into the .msp output
	getRequiredHeaders(format: MspSourceFormat): string[] {
		if (format === 'msdial') {
			return this.vitalHeaders.filter(header => header !== 'MS1 SPECTRUM');
		}
		return this.vitalHeaders;
	}


	// MS-DIAL uses 'MS/MS spectrum' where this app's own headers use 'MSMS SPECTRUM'
	applyMsdialHeaderAliases(headers: string[]): string[] {
		return headers.map(header => header === 'MS/MS SPECTRUM' ? 'MSMS SPECTRUM' : header);
	}
```

- [ ] **Step 4: Update `hasHeaderErrors`, `collectMissingData`, `removeAttributes` signatures**

Replace `hasHeaderErrors` (lines 184-203):

```typescript
	// Check for any column headers that are misspelled or missing
	hasHeaderErrors(headers: any[], requiredHeaders: string[] = this.vitalHeaders): boolean {

		let hasError = false;
		const headerErrors: string[] = [];

		requiredHeaders.forEach(headerName => {
			// If a vital header doesn't appear in the headers row, indexOf returns -1
			if (headers.indexOf(headerName) < 0) {
				hasError = true;
				headerErrors.push(headerName);
			}
		});
		if (hasError) {
			this.errorWarning = 'These headers may be misspelled or missing: ' + headerErrors.join(', ');
		}
		return hasError;
	} // end hasHeaderErrors
```

Replace `collectMissingData` (lines 105-122):

```typescript
    // Record all lines with missing data
    collectMissingData(jsonArray: any[], correctionFactor: number, requiredHeaders: string[] = this.vitalHeaders) {
        let keyArray: string[];
        let missingCols: string[];
        for (let i = 0; i < jsonArray.length; i++) {
            keyArray = Object.keys(jsonArray[i]);
            missingCols = requiredHeaders.filter(header => keyArray.indexOf(header) < 0);
            if (missingCols.length > 0) {
                this.missingData.push(String(i + correctionFactor) + ': ' + missingCols.join(', '));
            }
        }
    }
```

Replace `removeAttributes` (lines 125-129):

```typescript
    // Remove unneeded attributes so that only the required headers remain
    removeAttributes(jsonArray: any[], requiredHeaders: string[] = this.vitalHeaders): any[] {
        return _.map(jsonArray, (entry: any) => _.pick(entry, ...requiredHeaders));
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: PASS — all new tests green, all pre-existing `BuildMspService` tests still green.

- [ ] **Step 6: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "$(cat <<'EOF'
Add per-format required headers and MS-DIAL header aliasing to BuildMspService

Also fixes a latent bug in collectMissingData's row-completeness shortcut
that would misfire once a dict can legitimately have more keys than the
header list being checked against (needed by the msdial missing-data path
added in a later commit).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `BuildMspService` — normalize literal `"null"` to blank in `buildJsonArray`

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.ts:163-181` (`buildJsonArray`)
- Test: `src/app/build-msp-service/build-msp.service.spec.ts`

**Interfaces:**
- Consumes: none new.
- Produces: `buildJsonArray(headers: string[], data: string[][]): any[]` (same signature, changed behavior — literal `"null"` cell values are treated as absent, same as empty cells).

- [ ] **Step 1: Write the failing test**

Add to `build-msp.service.spec.ts` (near the other `buildJsonArray`-adjacent tests, after the `hasHeaderErrors` describe block additions from Task 1):

```typescript
	// buildJsonArray

	it('should treat literal "null" string values as missing when building the JSON array', () => {
		const headers = ['METABOLITE NAME', 'FORMULA', 'INCHIKEY'];
		const data = [['Unknown', 'null', 'null']];
		expect(service.buildJsonArray(headers, data)).toEqual([{'METABOLITE NAME': 'Unknown'}]);
	});

	it('should still include a real (non-"null") value for the same header', () => {
		const headers = ['METABOLITE NAME', 'FORMULA'];
		const data = [['1-Methyltryptophan', 'C12H14N2O2']];
		expect(service.buildJsonArray(headers, data)).toEqual([{'METABOLITE NAME': '1-Methyltryptophan', 'FORMULA': 'C12H14N2O2'}]);
	});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: FAIL — first new test fails because `FORMULA`/`INCHIKEY` currently come through as the literal string `'null'` instead of being omitted.

- [ ] **Step 3: Implement the null-normalization**

Replace `buildJsonArray` (lines 162-181):

```typescript
	// Builds array of dictionaries
	buildJsonArray(headers: string[], data: string[][]): any[] {
		// Iterate through data and build dictionary
		// keys=headers[], values=row of data[][]

		let i: number, j: number;
		let dict: any = {};
		const arr: any = [];
		for (i = 0; i < data.length; i++) {
			dict = {};
			for (j = 0; j < headers.length; j++) {
				// MS-DIAL writes the literal string "null" for missing values instead of an empty cell
				if (data[i][j] && data[i][j] !== 'null') {
					dict[headers[j]] = data[i][j];
				}
			}
			// Add dictionary to the array
			arr.push(dict);
		}
		return arr;
	} // end buildJsonArray
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "$(cat <<'EOF'
Treat literal "null" values as blank when building the MSMS JSON array

MS-DIAL exports write the literal text "null" for missing Formula/INCHIKEY
cells rather than leaving them empty; without this, the .msp would contain
lines like "Formula: null".

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `BuildMspService` — filter no-spectrum rows and wire `format` through `buildMspFile`

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.ts:246-300` (`buildMspFile`)
- Test: `src/app/build-msp-service/build-msp.service.spec.ts`

**Interfaces:**
- Consumes: `getRequiredHeaders` and `applyMsdialHeaderAliases` from Task 1; the null-normalizing `buildJsonArray` from Task 2.
- Produces: `removeRowsWithoutSpectrum(jsonArray: any[]): any[]` — drops entries with no `MSMS SPECTRUM` value.
- Produces: `getMissingDataCheckHeaders(format: MspSourceFormat, requiredHeaders: string[]): string[]` — for `'msdial'`, excludes `'MSMS SPECTRUM'` from the missing-data check (a missing spectrum is handled by filtering, not reported as an error); for `'spreadsheet'`, returns `requiredHeaders` unchanged.
- Modifies signature: `buildMspFile(msmsArray: string[][], fileName: string, notes: string, format: MspSourceFormat = 'spreadsheet'): string`

Ordering inside `buildMspFile` matters: `collectMissingData` must run *before* `removeRowsWithoutSpectrum`, because it reports original row numbers (`i + correctionFactor`) that would be wrong if rows were already removed. `getMissingDataCheckHeaders` is what keeps a since-to-be-filtered no-spectrum row from being reported as "missing data" despite running before the filter.

- [ ] **Step 1: Write the failing tests**

Add to `build-msp.service.spec.ts`:

```typescript
	// removeRowsWithoutSpectrum

	it('should drop rows without an MSMS SPECTRUM value', () => {
		const jsonArray = [
			{'METABOLITE NAME': 'A', 'MSMS SPECTRUM': '1:1'},
			{'METABOLITE NAME': 'B'}
		];
		expect(service.removeRowsWithoutSpectrum(jsonArray)).toEqual([{'METABOLITE NAME': 'A', 'MSMS SPECTRUM': '1:1'}]);
	});

	// getMissingDataCheckHeaders

	it('should exclude MSMS SPECTRUM from the missing-data check for msdial format', () => {
		const requiredHeaders = service.getRequiredHeaders('msdial');
		expect(service.getMissingDataCheckHeaders('msdial', requiredHeaders)).toEqual(
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY']
		);
	});

	it('should return requiredHeaders unchanged for spreadsheet format', () => {
		const requiredHeaders = service.getRequiredHeaders('spreadsheet');
		expect(service.getMissingDataCheckHeaders('spreadsheet', requiredHeaders)).toEqual(requiredHeaders);
	});

	// buildMspFile with msdial format, end to end

	describe('BuildMspService: buildMspFile with msdial format', () => {

		it('should build the .msp string applying msdial-specific rules: MS1 not required, MS/MS SPECTRUM alias, null-to-blank, no-spectrum row dropped, no-spectrum row not reported as missing data', () => {
			spyOn(service, 'saveFile');

			const arr = [
				['Alignment ID', 'Average Rt(min)', 'Average Mz', 'Metabolite name', 'Adduct type', 'Formula', 'INCHIKEY', 'MS1 isotopic spectrum', 'MS/MS spectrum'],
				['1', '6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.1:100', '35.09272:9 35.16082:7'],
				['2', '9.543', '80.04929', 'Unknown', '[M+H]+', 'null', 'null', '228.1:50', '50.7019:2412 77.88785:2832'],
				['3', '3.33', '200.0', 'ShouldBeFiltered', '[M+H]+', 'C1H1', 'XXXXXXXXXX-UHFFFAOYSA-N', '', '']
			];

			const errorWarning = service.buildMspFile(arr, 'test.txt', '', 'msdial');

			// MS1 SPECTRUM is not required for msdial: no header error even though there's no matching column
			expect(errorWarning).toContain('Warning: Some entries have missing data');
			expect(errorWarning).not.toContain('column headers not found');

			// Row 2 (Unknown, null Formula/INCHIKEY) is reported as missing data
			expect(service.missingData).toEqual(['7: FORMULA, INCHIKEY']);

			// Row 3 has no spectrum: filtered out, and NOT reported as missing data
			expect(service.missingData.some(entry => entry.startsWith('8:'))).toBe(false);

			const mspString = (service.saveFile as jasmine.Spy).calls.mostRecent().args[0] as string;
			expect(mspString).toContain('Name: 1-Methyltryptophan');
			expect(mspString).toContain('Name: Unknown');
			expect(mspString).toContain('Formula: \n'); // Unknown row's null Formula normalized to blank
			expect(mspString).not.toContain('ShouldBeFiltered');
		});

	});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: FAIL — `removeRowsWithoutSpectrum`/`getMissingDataCheckHeaders` are not functions; `buildMspFile` doesn't accept a 4th argument and doesn't apply any msdial-specific behavior.

- [ ] **Step 3: Implement `removeRowsWithoutSpectrum`, `getMissingDataCheckHeaders`, and wire them into `buildMspFile`**

Add these two methods to the class, near `getRequiredHeaders`/`applyMsdialHeaderAliases` (after the code added in Task 1, Step 3):

```typescript
	// A spectrum-less entry isn't useful in a spectral library, regardless of source format
	removeRowsWithoutSpectrum(jsonArray: any[]): any[] {
		return jsonArray.filter(entry => !!entry['MSMS SPECTRUM']);
	}


	// For msdial, a missing spectrum is handled by removeRowsWithoutSpectrum, not reported as missing data
	getMissingDataCheckHeaders(format: MspSourceFormat, requiredHeaders: string[]): string[] {
		if (format === 'msdial') {
			return requiredHeaders.filter(header => header !== 'MSMS SPECTRUM');
		}
		return requiredHeaders;
	}
```

Replace `buildMspFile` (lines 246-300):

```typescript
    // Create .msp file from a 2x2 array of data
	buildMspFile(msmsArray: string[][], fileName: string, notes: string, format: MspSourceFormat = 'spreadsheet'): string {

		// Reset the error text
        this.resetErrors();

        const requiredHeaders = this.getRequiredHeaders(format);

		// Get the row number where the headers are located
		const headerPosition = this.getHeaderPosition(msmsArray);
		if (headerPosition >= 0) {

			// Get the headers, convert them to upper case and remove trailing white space
			let headers = msmsArray[headerPosition];
			headers = this.processText(headers);
			if (format === 'msdial') {
				headers = this.applyMsdialHeaderAliases(headers);
			}

			// If all required headers are available and without errors, proceed
			if (!this.hasHeaderErrors(headers, requiredHeaders)) {

				const data = msmsArray.slice(headerPosition + 1, msmsArray.length);
				// Create an array of dictionaries
                let msmsJsonArray = this.buildJsonArray(headers, data);

                // remove unneeded attributes
                msmsJsonArray = this.removeAttributes(msmsJsonArray, requiredHeaders);

                // Use header position to get row number; check for missing data per each header
                //  (a spectrum-less row is filtered below, not reported as missing data, for msdial)
                const missingDataCheckHeaders = this.getMissingDataCheckHeaders(format, requiredHeaders);
                this.collectMissingData(msmsJsonArray, headerPosition + 2, missingDataCheckHeaders);
                if (this.missingData.length > 0) {
                    this.errorWarning = 'Warning: Some entries have missing data; these attributes were left blank';
                }

                // Drop rows with no MS/MS spectrum: not useful in a spectral library, regardless of source
                msmsJsonArray = this.removeRowsWithoutSpectrum(msmsJsonArray);

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

				// Turn array into a string
				const mspString = this.buildMspStringFromArray(msmsJsonArray, notes);
				// User will be prompted to save a .msp for their data
                this.saveFile(mspString, fileName.split('.')[0] + '.txt');
			}
		} else {
            this.errorWarning = 'Error: column headers not found';
        }
        return this.errorWarning;
	}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: PASS — new tests green, and all pre-existing `BuildMspService` tests (including the two `buildMspFile` spy-based tests) still green.

- [ ] **Step 5: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "$(cat <<'EOF'
Filter no-spectrum rows and thread source format through buildMspFile

buildMspFile now takes an optional 'spreadsheet' | 'msdial' format flag
that selects the required-header set and applies the MS-DIAL header alias.
Rows with no MS/MS spectrum are dropped for both formats; for msdial,
a missing spectrum isn't reported as missing data since it's handled by
the drop instead.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `ReadSpreadsheetService` — parse MS-DIAL AlignmentResult `.txt` files

**Files:**
- Modify: `src/app/read-spreadsheet-service/read-spreadsheet.service.ts`
- Test: `src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts`

**Interfaces:**
- Produces: `readAlignmentResultTxt(sheetData: FileList): Observable<string[][]>` — reads the file as text and splits it into the same `string[][]` shape `readXlsx` produces (one array per line, split on tabs).

- [ ] **Step 1: Write the failing tests**

Add to `read-spreadsheet.service.spec.ts` (after the existing `readXlsx` test, i.e. after line 43):

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: FAIL — `readAlignmentResultTxt` is not a function.

- [ ] **Step 3: Implement `readAlignmentResultTxt`**

Add to `src/app/read-spreadsheet-service/read-spreadsheet.service.ts`, inside the class, after `readXlsx` (after line 47, before the closing `}` of the class):

```typescript

	// Return observable where a MS-DIAL AlignmentResult .txt file is converted into a 2x2 array
	//  Same array shape as readXlsx() produces, so the rest of the pipeline is shared
	readAlignmentResultTxt(sheetData: FileList): Observable<any> {

		return new Observable(subscriber => {
			const reader = new FileReader();
			reader.addEventListener('load', (loadEvent) => {
				const target: FileReader = loadEvent.target as FileReader;
				const text = (target.result as string).replace(/\r\n/g, '\n');
				const msmsArray = text.split('\n')
					.filter(line => line.length > 0)
					.map(line => line.split('\t'));
				subscriber.next(msmsArray);
			});
			reader.addEventListener('error', () => {
				subscriber.error('Error: file may be corrupted or may not exist');
			});
			reader.readAsText(sheetData[0]);
		});

	} // end readAlignmentResultTxt
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/read-spreadsheet-service/read-spreadsheet.service.ts src/app/read-spreadsheet-service/read-spreadsheet.service.spec.ts
git commit -m "$(cat <<'EOF'
Add readAlignmentResultTxt to parse MS-DIAL AlignmentResult .txt files

Reads the file as plain text and splits on tabs into the same 2D-array
shape readXlsx() already produces, so BuildMspService's existing pipeline
handles both formats without change. No row-count cap: that check in
readXlsx is specific to XLSX/ODS phantom-row corruption and doesn't apply
to plain text.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `ReadSpreadsheetComponent` — accept `.txt` uploads and route them to the new format

**Files:**
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.ts:92-189`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.html:7-15`
- Modify: `src/app/app.component.html:4`

**Interfaces:**
- Consumes: `ReadSpreadsheetService.readAlignmentResultTxt` (Task 4), `BuildMspService.buildMspFile(..., format)` and `MspSourceFormat` (Tasks 1-3).

No new unit test for this task: the codebase's own component spec already flags (see the comment at `read-spreadsheet.component.spec.ts:99-100`) that simulating a real `FileList` on an `HTMLInputElement` in Karma isn't practical — the existing tests only spy on `fileSelected` being called, not its internal extension-branching logic. This task's actual upload/extension behavior is verified by the Protractor e2e tests in Task 6 instead, consistent with how the existing five extensions are already covered.

- [ ] **Step 1: Update `fileSelected`'s extension check and error text**

In `src/app/read-spreadsheet/read-spreadsheet.component.ts`, replace lines 100-113:

```typescript
            // Check for proper file type
            if (/\.(xlsx|csv|xls|ods|numbers|txt)$/g.test(this.fileNameText)) {
                this.files = this.targetInput.files;
                // Submit button can now be clicked
                this.submitValid = true;
                this.updateErrorText('', false);
                this.showCorrectImage(true);
            } else {
                this.files = null;
                // Submit button greyed out
                this.submitValid = false;
                this.updateErrorText('Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers, .txt', false);
                this.showCorrectImage(false);
            }
```

- [ ] **Step 2: Route `readFile` to the new read method and format flag for `.txt`**

Replace lines 118-136:

```typescript
	// Called when the user submits their spreadsheet
	readFile() {
		// If the user has chosen a file, create .msp
		if (this.files) {
            this.spinner.show();

            // Check for proper file type
            // Get Observable that converts the file into a 2x2 array
			if (/\.txt$/g.test(this.fileNameText)) {
                this.updateErrorText('', false);
                this.observable$ = this.readSpreadsheetService.readAlignmentResultTxt(this.files);
                this.buildMsp(this.fileNameText, this.notesText.trim(), 'msdial');
			} else if (/\.(xlsx|csv|xls|ods|numbers)$/g.test(this.fileNameText)) {
                this.updateErrorText('', false);
                this.observable$ = this.readSpreadsheetService.readXlsx(this.files);
                this.buildMsp(this.fileNameText, this.notesText.trim(), 'spreadsheet');
			} else {
                this.updateErrorText('Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers, .txt', false);
                this.showCorrectImage(false);
                this.fileNameText = 'Click \'Browse\' to choose a spreadsheet';
                this.spinner.hide();
			}

		} else {
            this.updateErrorText('Select file before clicking \'Submit\'', false);
            this.showCorrectImage(false);
            this.spinner.hide();
        }
```

(Lines 137-149, the trailing `submitValid`/`targetInput.value` reset, are unchanged.)

- [ ] **Step 3: Thread the `format` parameter through `buildMsp`**

Add the import at the top of the file (after line 5):

```typescript
import { BuildMspService, MspSourceFormat } from '../build-msp-service/build-msp.service';
```

(This replaces the existing `import { BuildMspService } from '../build-msp-service/build-msp.service';` on line 5.)

Replace the `buildMsp` method signature and its call to `buildMspFile` (lines 153 and 163):

```typescript
    // Create .msp from 2x2 array and/or get error descriptions
    buildMsp(name: string, notes: string, format: MspSourceFormat) {
```

```typescript
                errorData = self.buildMspService.buildMspFile(msmsArray, name, notes, format);
```

- [ ] **Step 4: Update the accepted-formats badge and instructions copy**

In `src/app/app.component.html`, replace line 4:

```html
        <span class="app-navbar__badge">XLSX &middot; CSV &middot; ODS &middot; MS-DIAL TXT</span>
```

In `src/app/read-spreadsheet/read-spreadsheet.component.html`, replace the instructions paragraph (lines 7-10):

```html
        <p>
            Click 'Browse' and select a spreadsheet with one of these extensions: .xlsx, .xls, .csv, .ods, or .numbers,
            or a MS-DIAL "Alignment result" export (.txt). Then click 'Submit' to download a converted .msp text file.
            The downloaded file will have a .txt extension which you can rename to .msp.</p>
        <p>
            For a MS-DIAL AlignmentResult.txt file: rows with no MS/MS spectrum are skipped, and rows with an
            unidentified ("Unknown") metabolite name are kept as long as they have a spectrum.
        </p>
```

(The following paragraph about required spreadsheet column headers, currently lines 11-15, is unchanged and stays below this.)

- [ ] **Step 5: Verify existing unit tests still pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessCI`
Expected: PASS — no existing `ReadSpreadsheetComponent`/`ReadSpreadsheetService`/`BuildMspService` test should be affected by this task; this task's own new behavior is exercised in Task 6.

- [ ] **Step 6: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.ts src/app/read-spreadsheet/read-spreadsheet.component.html src/app/app.component.html
git commit -m "$(cat <<'EOF'
Accept MS-DIAL AlignmentResult .txt uploads in ReadSpreadsheetComponent

.txt uploads are routed to readAlignmentResultTxt with format='msdial';
the existing five spreadsheet extensions keep going through readXlsx with
format='spreadsheet'. Updates the accepted-extensions error text, navbar
badge, and instructions copy to mention the new format.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: E2E fixtures and Protractor coverage

**Files:**
- Create: `e2e/testing-files/msdial_alignment_result_small.txt`
- Create: `e2e/testing-files/test_invalid_extension.rtf`
- Modify: `e2e/src/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `AppPage.uploadSpreadsheet(fileName)` (existing, unchanged — already generic over any file path).

Adding `.txt` to the accepted extensions changes what `e2e/testing-files/test_spreadsheet.txt` (982KB, comma-delimited, pre-existing fixture) means to the app: it used to be rejected purely for having the wrong extension; now the extension is accepted, so it instead fails at header detection, because it's comma-delimited (no tab characters), so splitting on tabs never finds a matching header. Four existing tests assert the old "wrong extension" behavior using this fixture and must be repointed at a genuinely-unsupported extension instead.

- [ ] **Step 1: Create the invalid-extension fixture**

Write `e2e/testing-files/test_invalid_extension.rtf`:

```
This file has an extension the app does not accept.
```

- [ ] **Step 2: Create the MS-DIAL AlignmentResult fixture**

Write `e2e/testing-files/msdial_alignment_result_small.txt` — 4 MS-DIAL metadata rows, a real MS-DIAL header row, and 3 data rows (trimmed/adapted from the real sample files referenced in the design spec): one fully-identified row with a spectrum, one "Unknown" row with a spectrum but literal `null` Formula/INCHIKEY, and one row with no spectrum at all (to verify it's silently dropped):

```
Class
File type
Injection order
Batch ID
Alignment ID	Average Rt(min)	Average Mz	Metabolite name	Adduct type	Formula	INCHIKEY	MS1 isotopic spectrum	MS/MS spectrum
1	6.23	219.11317	1-Methyltryptophan	[M+H]+	C12H14N2O2	ZADWXFSZEAPBJS-JTQLQIEISA-N	219.1:100	35.09272:9 35.16082:7
2	9.543	80.04929	Unknown	[M+H]+	null	null	228.1:50	50.7019:2412 77.88785:2832
3	3.33	200.0	ShouldBeFiltered	[M+H]+	C1H1	XXXXXXXXXX-UHFFFAOYSA-N		
```

(Columns are tab-separated; the literal tab characters must be preserved exactly as written — don't let an editor convert them to spaces.)

- [ ] **Step 3: Repoint the four existing "invalid extension" tests at the new fixture**

In `e2e/src/app.e2e-spec.ts`:

- Line 57: change `page.uploadSpreadsheet('../testing-files/test_spreadsheet.txt');` to `page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');`
- Line 66: same change.
- Line 80: same change.
- Line 90: same change.
- Line 84: change the expected text to:
  ```typescript
        const text = 'Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers, .txt';
  ```

- [ ] **Step 4: Add a test for the repurposed `test_spreadsheet.txt` scenario (valid extension, wrong internal format)**

Add after the existing `'should tell the user what headers are missing'` test (after line 246):

```typescript
    it('should tell the user headers are not found when uploading a comma-delimited .txt file', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/test_spreadsheet.txt');
        // Extension is now accepted, so the submit button is enabled...
        expect(page.isSubmitDisabled()).toBe(null);
        page.submitFile();
        // ...but the file has no tab characters, so no header row can be found
        const text = 'Error: column headers not found';
        expect(page.getErrorText()).toEqual(text);
        expect(page.getElementById('file-name-text').getText()).toEqual('Fix errors, then retry upload');
    });
```

- [ ] **Step 5: Add MS-DIAL upload tests**

Add after the test from Step 4:

```typescript
    it('should have a hidden error box and enabled submit button after uploading a valid MS-DIAL AlignmentResult .txt file', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        expect(page.isSubmitDisabled()).toBe(null);
        expect(page.isElementHidden('error-box')).toBe('true');
        expect(page.isElementHidden('correct-image')).toBe(null);
        expect(page.isElementHidden('wrong-image')).toBe('true');
    });

    it('should download .msp from a MS-DIAL AlignmentResult .txt file, keeping the Unknown-but-spectrum row and dropping the no-spectrum row', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        const name = './e2e/downloads/msdial_alignment_result_small.txt';
        page.submitFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(name);
            }, 10*1000, 'File with correct name should be downloaded').then(function() {
                expect(page.isElementHidden('error-box')).toBe(null);
                expect(page.isElementHidden('correct-image')).toBe(null);
                expect(page.isElementHidden('wrong-image')).toBe('true');
                expect(page.getElementById('file-name-text').getText()).toEqual('.msp created with some issues');
                const text = 'Warning: Some entries have missing data; these attributes were left blank';
                expect(page.getErrorText()).toEqual(text);
                const mspContent = fs.readFileSync(name, 'utf8');
                expect(mspContent).toContain('Name: 1-Methyltryptophan');
                expect(mspContent).toContain('Name: Unknown');
                expect(mspContent).not.toContain('ShouldBeFiltered');
            });
        });
    });

    it('should download an error file listing the msdial row with missing data', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        page.submitFile();
        const errorFile = './e2e/downloads/error_file_msdial_alignment_result_small.txt';
        page.downloadErrorFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(errorFile);
            }, 5*1000, 'Error file should be downloaded');
        });
    });
```

- [ ] **Step 6: Run the e2e suite**

Run: `npm run e2e`
Expected: all tests pass, including the 4 repointed tests and the 5 new ones.

- [ ] **Step 7: Commit**

```bash
git add e2e/testing-files/msdial_alignment_result_small.txt e2e/testing-files/test_invalid_extension.rtf e2e/src/app.e2e-spec.ts
git commit -m "$(cat <<'EOF'
Add e2e coverage for MS-DIAL AlignmentResult .txt uploads

Repoints the existing "invalid extension" tests at a genuinely-unsupported
extension, since .txt is now accepted; the old fixture (comma-delimited,
no tabs) gets its own test for the "valid extension, headers not found"
path it now exercises. Adds a small hand-trimmed MS-DIAL fixture and tests
covering: valid upload, Unknown-but-spectrum row kept, no-spectrum row
dropped, missing-data warning, and error-file download.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: README — document the new supported format

**Files:**
- Modify: `README.md:1-13`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update the README**

Replace lines 1-13 of `README.md`:

```markdown
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

**MS-DIAL AlignmentResult upload** (.txt): MS-DIAL's own column names are used directly (`MS/MS spectrum`, etc.); `MS1 isotopic spectrum` isn't used. Rows with no MS/MS spectrum are skipped; rows with an unidentified ("Unknown") metabolite name are kept as long as they have a spectrum.
```

(No step 2/3 — this is a direct text replacement with no code to test; verify by reading the rendered file.)

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
Document MS-DIAL AlignmentResult (.txt) as a supported upload format

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Spec coverage check

- Row filtering (skip no-spectrum rows, both formats) → Task 3.
- `"null"` → blank normalization → Task 2.
- `MS1 isotopic spectrum` not mapped; `MS1 SPECTRUM` optional for msdial only → Task 1 (`getRequiredHeaders`) + Task 3 (wired into `buildMspFile`).
- `.txt` scoped exclusively to MS-DIAL parsing → Task 5 (routes `.txt` to `readAlignmentResultTxt`, nothing else).
- New read path producing the shared array shape, no row cap → Task 4.
- Header aliasing (`MS/MS SPECTRUM` → `MSMS SPECTRUM`) → Task 1 + Task 3.
- Testing plan (unit, integration, e2e) → Tasks 1-4 (unit), Task 3 (integration via the `buildMspFile` msdial describe block), Task 6 (e2e). No separate "smoke" tier exists in this codebase (Protractor e2e is the only browser-driven layer); the plain-upload-succeeds e2e test in Task 6 Step 5 serves that role, consistent with how the existing spreadsheet tests already do.
- Known limitation (`removeDuplicates` O(n²)) → intentionally not addressed, per spec's "Out of scope".
