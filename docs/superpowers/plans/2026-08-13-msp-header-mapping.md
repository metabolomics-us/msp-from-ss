# MSP Header Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user reviewing an uploaded file see which of its headers were auto-matched to MSP fields, override those matches, and opt unmatched headers into the `.msp` output as per-row Comments — instead of today's silent drop of anything outside the fixed `vitalHeaders` list.

**Architecture:** A new pure-logic `HeaderMappingService` classifies headers (sample-column heuristic + synonym-dictionary key matching). `BuildMspService` consumes that classification to rename mapped headers before existing validation runs, and to fold comment-marked columns' per-row values into the `.msp` Comments line. `ReadSpreadsheetComponent` moves file parsing from Submit-time to file-select-time so an optional, collapsed-by-default panel can show/edit the mapping before Submit.

**Tech Stack:** Angular 21, TypeScript, Jasmine/Karma (unit), Protractor (e2e) — matching this repo's existing tooling (not Playwright; this project has not migrated off Protractor yet).

**Spec:** `docs/superpowers/specs/2026-08-13-msp-header-mapping-design.md`

## Global Constraints

- Default mapping (review panel left untouched) MUST reproduce today's exact `.msp` output — no new data is dropped or added without an explicit user choice.
- Sample-column detection is a name-pattern heuristic only (e.g. `/^SAMPLE[\s_-]*\d+$/` on normalized header text) — no positional/column-order logic, no manual-only fallback.
- Key matching is normalization (trim + uppercase) plus a small hardcoded synonym dictionary per MSP key, checked after exact match — no fuzzy/similarity scoring.
- Comments line format: global notes text first, then `; Header: value` pairs for each comment-marked column present on a row; the line is omitted entirely if both are empty.
- The mapping mechanism applies identically to both upload formats (spreadsheet and MS-DIAL `.txt`) — no format-specific branching in the UI or in `HeaderMappingService`.
- The review panel is optional and collapsed by default, following the existing "Notes" toggle pattern in `read-spreadsheet.component.html`.
- Out of scope (do not implement): fuzzy matching, positional sample detection, persisting mapping choices across uploads, warning on mapping collisions (two headers mapped to the same key).

---

### Task 1: `HeaderMappingService` — sample detection and key matching

**Files:**
- Create: `src/app/header-mapping-service/header-mapping.service.ts`
- Test: `src/app/header-mapping-service/header-mapping.service.spec.ts`

**Interfaces:**
- Produces: `export type MspAction = 'map' | 'comment' | 'ignore';`
  `export interface HeaderMapping { header: string; action: MspAction; targetKey: string | null; isSample: boolean; }`
  `HeaderMappingService.isSampleColumn(header: string): boolean`
  `HeaderMappingService.suggestKey(header: string, knownKeys: string[]): string | null`
  `HeaderMappingService.classify(headers: string[], knownKeys: string[]): HeaderMapping[]`
  (`@Injectable({ providedIn: 'root' })`, no constructor dependencies.)

- [ ] **Step 1: Write the failing tests**

Create `src/app/header-mapping-service/header-mapping.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HeaderMappingService } from './header-mapping.service';

describe('HeaderMappingService', () => {
	let service: HeaderMappingService;
	const knownKeys = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [HeaderMappingService] });
		service = TestBed.inject(HeaderMappingService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	// isSampleColumn

	it('should flag "Sample 1" style headers as sample columns', () => {
		expect(service.isSampleColumn('Sample 1')).toBe(true);
		expect(service.isSampleColumn('Sample_02')).toBe(true);
		expect(service.isSampleColumn('SAMPLE03')).toBe(true);
	});

	it('should not flag a metadata header as a sample column', () => {
		expect(service.isSampleColumn('Metabolite name')).toBe(false);
		expect(service.isSampleColumn('Notes')).toBe(false);
	});

	// suggestKey

	it('should exact-match a known key regardless of case/whitespace', () => {
		expect(service.suggestKey(' metabolite name ', knownKeys)).toEqual('METABOLITE NAME');
	});

	it('should match a header via the synonym dictionary', () => {
		expect(service.suggestKey('Retention Time', knownKeys)).toEqual('AVERAGE RT(MIN)');
		expect(service.suggestKey('Compound Name', knownKeys)).toEqual('METABOLITE NAME');
	});

	it('should return null when a header matches no key or synonym', () => {
		expect(service.suggestKey('Batch ID', knownKeys)).toBeNull();
	});

	// classify

	it('should classify a sample column as ignored with isSample true', () => {
		const result = service.classify(['Sample 1'], knownKeys);
		expect(result).toEqual([{ header: 'Sample 1', action: 'ignore', targetKey: null, isSample: true }]);
	});

	it('should classify an exact/synonym key match as mapped with isSample false', () => {
		const result = service.classify(['Retention Time'], knownKeys);
		expect(result).toEqual([{ header: 'Retention Time', action: 'map', targetKey: 'AVERAGE RT(MIN)', isSample: false }]);
	});

	it('should classify an unmatched, non-sample header as ignored with isSample false', () => {
		const result = service.classify(['Batch ID'], knownKeys);
		expect(result).toEqual([{ header: 'Batch ID', action: 'ignore', targetKey: null, isSample: false }]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --include='**/header-mapping.service.spec.ts' --watch=false`
Expected: FAIL — `Cannot find module './header-mapping.service'`

- [ ] **Step 3: Write the implementation**

Create `src/app/header-mapping-service/header-mapping.service.ts`:

```typescript
import { Injectable } from '@angular/core';

export type MspAction = 'map' | 'comment' | 'ignore';

export interface HeaderMapping {
	header: string;
	action: MspAction;
	targetKey: string | null;
	isSample: boolean;
}

@Injectable({
	providedIn: 'root'
})
export class HeaderMappingService {

	private readonly sampleColumnPattern = /^SAMPLE[\s_-]*\d+$/;

	private readonly synonyms: { [key: string]: string[] } = {
		'METABOLITE NAME': ['NAME', 'COMPOUND NAME', 'COMPOUND'],
		'ADDUCT TYPE': ['ADDUCT', 'PRECURSOR TYPE', 'ION TYPE'],
		'AVERAGE MZ': ['MZ', 'PRECURSOR MZ', 'M/Z'],
		'AVERAGE RT(MIN)': ['RT', 'RETENTION TIME'],
		'FORMULA': ['MOLECULAR FORMULA', 'CHEMICAL FORMULA'],
		'INCHIKEY': ['INCHI KEY', 'INCHI-KEY'],
		'MS1 SPECTRUM': ['MS1', 'PRECURSOR SPECTRUM'],
		'MSMS SPECTRUM': ['MS/MS SPECTRUM', 'MSMS', 'MS2 SPECTRUM', 'FRAGMENT SPECTRUM']
	};

	private normalize(header: string): string {
		return header.trim().toUpperCase();
	}

	isSampleColumn(header: string): boolean {
		return this.sampleColumnPattern.test(this.normalize(header));
	}

	suggestKey(header: string, knownKeys: string[]): string | null {
		const normalized = this.normalize(header);
		if (knownKeys.indexOf(normalized) >= 0) {
			return normalized;
		}
		for (const key of knownKeys) {
			const keySynonyms = this.synonyms[key] || [];
			if (keySynonyms.indexOf(normalized) >= 0) {
				return key;
			}
		}
		return null;
	}

	classify(headers: string[], knownKeys: string[]): HeaderMapping[] {
		return headers.map(header => {
			if (this.isSampleColumn(header)) {
				return { header, action: 'ignore' as MspAction, targetKey: null, isSample: true };
			}
			const suggested = this.suggestKey(header, knownKeys);
			if (suggested) {
				return { header, action: 'map' as MspAction, targetKey: suggested, isSample: false };
			}
			return { header, action: 'ignore' as MspAction, targetKey: null, isSample: false };
		});
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --include='**/header-mapping.service.spec.ts' --watch=false`
Expected: PASS — all `HeaderMappingService` specs green

- [ ] **Step 5: Commit**

```bash
git add src/app/header-mapping-service/header-mapping.service.ts src/app/header-mapping-service/header-mapping.service.spec.ts
git commit -m "Add HeaderMappingService for sample detection and MSP key matching"
```

---

### Task 2: `BuildMspService` — mapping-aware header detection

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.ts`
- Test: `src/app/build-msp-service/build-msp.service.spec.ts`

**Interfaces:**
- Consumes: `HeaderMappingService.suggestKey(header, knownKeys)`, `HeaderMappingService.classify(headers, knownKeys)` (Task 1).
- Produces: `BuildMspService.normalizeHeaderRow(headers: string[], format: MspSourceFormat): string[]`
  `BuildMspService.classifyHeaders(headers: string[]): HeaderMapping[]`
  (`lineHasHeaders` behavior extended: now also recognizes synonym matches, not just exact `vitalHeaders` membership.)

- [ ] **Step 1: Write the failing tests**

Add to `src/app/build-msp-service/build-msp.service.spec.ts` (near the existing `lineHasHeaders` tests):

```typescript
	it('should return true when a header only matches via a synonym (RETENTION TIME -> AVERAGE RT(MIN))', () => {
		const headers = ['RETENTION TIME', 'BATCH ID'];
		expect(service.lineHasHeaders(headers)).toBe(true);
	});

	// normalizeHeaderRow

	it('should uppercase/trim headers and apply the msdial MS/MS alias when format is msdial', () => {
		const headers = [' Average Rt(min) ', 'MS/MS spectrum'];
		expect(service.normalizeHeaderRow(headers, 'msdial')).toEqual(['AVERAGE RT(MIN)', 'MSMS SPECTRUM']);
	});

	it('should uppercase/trim headers without the msdial alias when format is spreadsheet', () => {
		const headers = [' Average Rt(min) ', 'MS/MS SPECTRUM'];
		expect(service.normalizeHeaderRow(headers, 'spreadsheet')).toEqual(['AVERAGE RT(MIN)', 'MS/MS SPECTRUM']);
	});

	// classifyHeaders

	it('should classify headers against the full vitalHeaders list', () => {
		const result = service.classifyHeaders(['RETENTION TIME', 'SAMPLE 1', 'BATCH ID']);
		expect(result).toEqual([
			{ header: 'RETENTION TIME', action: 'map', targetKey: 'AVERAGE RT(MIN)', isSample: false },
			{ header: 'SAMPLE 1', action: 'ignore', targetKey: null, isSample: true },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false }
		]);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --include='**/build-msp.service.spec.ts' --watch=false`
Expected: FAIL — `service.normalizeHeaderRow is not a function`, `service.classifyHeaders is not a function`, and the synonym `lineHasHeaders` case returns `false`

- [ ] **Step 3: Write the implementation**

In `src/app/build-msp-service/build-msp.service.ts`, add the import and constructor injection:

```typescript
import { HeaderMappingService, HeaderMapping } from '../header-mapping-service/header-mapping.service';
```

```typescript
	constructor(private headerMappingService: HeaderMappingService) {
		// Moving this here b/c Services can't use oninit
        this.resetErrors();
		this.vitalHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
    }
```

Replace `lineHasHeaders`'s body:

```typescript
	// Check if array has the vital headers, via exact match or a known synonym
	lineHasHeaders(line: any[]): boolean {
		const formattedHeaders = this.processText(line);
		return formattedHeaders.some(header => this.headerMappingService.suggestKey(header, this.vitalHeaders) !== null);
	} // end lineHasHeaders
```

Add two new methods (near `applyMsdialHeaderAliases`):

```typescript
	// Normalize a raw header row: trim/uppercase, then apply the msdial-specific alias
	normalizeHeaderRow(headers: string[], format: MspSourceFormat): string[] {
		let normalized = this.processText(headers);
		if (format === 'msdial') {
			normalized = this.applyMsdialHeaderAliases(normalized);
		}
		return normalized;
	}

	// Classify already-normalized headers against the full known-key list
	classifyHeaders(headers: string[]): HeaderMapping[] {
		return this.headerMappingService.classify(headers, this.vitalHeaders);
	}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --include='**/build-msp.service.spec.ts' --watch=false`
Expected: PASS — all `BuildMspService` specs green, including the new ones

- [ ] **Step 5: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "Make BuildMspService header detection synonym-aware via HeaderMappingService"
```

---

### Task 3: `BuildMspService` — apply header mapping before validation

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.ts`
- Test: `src/app/build-msp-service/build-msp.service.spec.ts`

**Interfaces:**
- Consumes: `HeaderMapping` (Task 1), `normalizeHeaderRow`/`classifyHeaders` (Task 2).
- Produces: `BuildMspService.applyHeaderMappings(headers: string[], mappings: HeaderMapping[]): string[]`
  `BuildMspService.buildMspFile(msmsArray, fileName, notes, format?, headerMappings?: HeaderMapping[]): string` (new optional 5th param)

- [ ] **Step 1: Write the failing tests**

Add to `src/app/build-msp-service/build-msp.service.spec.ts`:

```typescript
	// applyHeaderMappings

	it('should rename a header to its targetKey when action is "map"', () => {
		const headers = ['RETENTION TIME', 'BATCH ID'];
		const mappings = [
			{ header: 'RETENTION TIME', action: 'map' as const, targetKey: 'AVERAGE RT(MIN)', isSample: false },
			{ header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false }
		];
		expect(service.applyHeaderMappings(headers, mappings)).toEqual(['AVERAGE RT(MIN)', 'BATCH ID']);
	});

	// buildMspFile: mapping renames a header before required-header validation runs

	it('should accept a file whose headers only match via user-supplied mapping, with no header errors', () => {
		spyOn(service, 'saveFile');
		const arr = [
			['Retention Time', 'Average Mz', 'Metabolite name', 'Adduct type', 'Formula', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'],
			['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7']
		];
		const errorWarning = service.buildMspFile(arr, 'test.csv', '');
		expect(errorWarning).not.toContain('column headers not found');
		expect(errorWarning).not.toContain('may be misspelled or missing');
		const mspString = (service.saveFile as jasmine.Spy).calls.mostRecent().args[0] as string;
		expect(mspString).toContain('Name: 1-Methyltryptophan');
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --include='**/build-msp.service.spec.ts' --watch=false`
Expected: FAIL — `service.applyHeaderMappings is not a function`; the `buildMspFile` case fails because `RETENTION TIME`/`AVERAGE MZ`(exact)/etc. aren't renamed, so `hasHeaderErrors` reports them missing

- [ ] **Step 3: Write the implementation**

Add `applyHeaderMappings` next to `classifyHeaders`:

```typescript
	// Rename headers with action "map" to their canonical targetKey; leave comment/ignore headers as-is
	applyHeaderMappings(headers: string[], mappings: HeaderMapping[]): string[] {
		return headers.map(header => {
			const mapping = mappings.find(m => m.header === header);
			return (mapping && mapping.action === 'map' && mapping.targetKey) ? mapping.targetKey : header;
		});
	}
```

Replace the header-preparation section of `buildMspFile` (the block from `let headers = msmsArray[headerPosition];` through the `hasHeaderErrors` check) with:

```typescript
			const headers = this.normalizeHeaderRow(msmsArray[headerPosition], format);
			const mappings = headerMappings || this.classifyHeaders(headers);
			const mappedHeaders = this.applyHeaderMappings(headers, mappings);

			// If all required headers are available and without errors, proceed
			if (!this.hasHeaderErrors(mappedHeaders, requiredHeaders)) {

				const data = msmsArray.slice(headerPosition + 1, msmsArray.length);
				// Create an array of dictionaries
                let msmsJsonArray = this.buildJsonArray(mappedHeaders, data);
```

Update the `buildMspFile` signature to accept the new optional parameter:

```typescript
	buildMspFile(msmsArray: string[][], fileName: string, notes: string, format: MspSourceFormat = 'spreadsheet', headerMappings?: HeaderMapping[]): string {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --include='**/build-msp.service.spec.ts' --watch=false`
Expected: PASS — including all pre-existing `buildMspFile` tests (they pass no 5th argument, so `headerMappings` defaults via `this.classifyHeaders(headers)`, which maps their already-exact headers 1:1)

- [ ] **Step 5: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "Apply header mapping renames before required-header validation in buildMspFile"
```

---

### Task 4: `BuildMspService` — carry unmatched columns into per-row Comments

**Files:**
- Modify: `src/app/build-msp-service/build-msp.service.ts`
- Test: `src/app/build-msp-service/build-msp.service.spec.ts`

**Interfaces:**
- Produces: `BuildMspService.applyCommentMappings(jsonArray: any[], mappings: HeaderMapping[]): any[]`
- Modifies behavior of: `buildMspStringFromArray` (Comments line now merges global notes with `_extraComments`), `buildMspFile` (calls `applyCommentMappings` and includes `'_extraComments'` in the `removeAttributes` pick-list)

- [ ] **Step 1: Write the failing tests**

Add to `src/app/build-msp-service/build-msp.service.spec.ts`:

```typescript
	// applyCommentMappings

	it('should collect a comment-marked header\'s value into _extraComments', () => {
		const jsonArray = [{ 'METABOLITE NAME': 'X', 'NOTES': 'Interesting peak' }];
		const mappings = [{ header: 'NOTES', action: 'comment' as const, targetKey: null, isSample: false }];
		expect(service.applyCommentMappings(jsonArray, mappings)).toEqual([
			{ 'METABOLITE NAME': 'X', 'NOTES': 'Interesting peak', '_extraComments': [{ header: 'NOTES', value: 'Interesting peak' }] }
		]);
	});

	it('should leave rows unchanged when there are no comment mappings', () => {
		const jsonArray = [{ 'METABOLITE NAME': 'X' }];
		expect(service.applyCommentMappings(jsonArray, [])).toEqual([{ 'METABOLITE NAME': 'X' }]);
	});

	// buildMspStringFromArray: Comments line merge

	it('should write only the global note on the Comments line when there are no extra comments', () => {
		const msmsArray: any[] = [{ 'METABOLITE NAME': 'X', 'MSMS SPECTRUM': '1:1' }];
		const result = service.buildMspStringFromArray(msmsArray, 'global note');
		expect(result).toContain('Comments: global note\n');
	});

	it('should write only extra comments on the Comments line when there is no global note', () => {
		const msmsArray: any[] = [{ 'METABOLITE NAME': 'X', 'MSMS SPECTRUM': '1:1', '_extraComments': [{ header: 'NOTES', value: 'peak' }] }];
		const result = service.buildMspStringFromArray(msmsArray, '');
		expect(result).toContain('Comments: NOTES: peak\n');
	});

	it('should write the global note followed by extra comments, semicolon-separated', () => {
		const msmsArray: any[] = [{
			'METABOLITE NAME': 'X', 'MSMS SPECTRUM': '1:1',
			'_extraComments': [{ header: 'NOTES', value: 'peak' }, { header: 'BATCH', value: '3' }]
		}];
		const result = service.buildMspStringFromArray(msmsArray, 'global note');
		expect(result).toContain('Comments: global note; NOTES: peak; BATCH: 3\n');
	});

	// buildMspFile end-to-end: an unmatched column marked "comment" survives into the .msp output

	it('should include a comment-mapped column\'s per-row value in the .msp Comments line', () => {
		spyOn(service, 'saveFile');
		const arr = [
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM', 'NOTES'],
			['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7', 'Interesting peak']
		];
		const headerMappings = [
			{ header: 'NOTES', action: 'comment' as const, targetKey: null, isSample: false }
		];
		service.buildMspFile(arr, 'test.csv', '', 'spreadsheet', headerMappings);
		const mspString = (service.saveFile as jasmine.Spy).calls.mostRecent().args[0] as string;
		expect(mspString).toContain('Comments: NOTES: Interesting peak\n');
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --include='**/build-msp.service.spec.ts' --watch=false`
Expected: FAIL — `service.applyCommentMappings is not a function`; the Comments-line tests fail because `buildMspStringFromArray` still only writes `mspNotes` verbatim with no merge logic; the end-to-end test fails because `NOTES` is dropped by `removeAttributes` before `buildMspStringFromArray` ever sees it

- [ ] **Step 3: Write the implementation**

Add `applyCommentMappings` next to `applyHeaderMappings`:

```typescript
	// Collect each comment-mapped header's per-row value into a row's _extraComments array
	applyCommentMappings(jsonArray: any[], mappings: HeaderMapping[]): any[] {
		const commentMappings = mappings.filter(m => m.action === 'comment');
		if (commentMappings.length === 0) {
			return jsonArray;
		}
		return jsonArray.map(entry => {
			const extraComments: { header: string, value: string }[] = [];
			commentMappings.forEach(mapping => {
				if (entry[mapping.header]) {
					extraComments.push({ header: mapping.header, value: entry[mapping.header] });
				}
			});
			return extraComments.length > 0 ? { ...entry, '_extraComments': extraComments } : entry;
		});
	}
```

In `buildMspFile`, insert the comment-collection step right after `buildJsonArray` and before `removeAttributes`, and widen the `removeAttributes` pick-list:

```typescript
                let msmsJsonArray = this.buildJsonArray(mappedHeaders, data);

                // Collect comment-mapped columns' values before removeAttributes strips the originals
                msmsJsonArray = this.applyCommentMappings(msmsJsonArray, mappings);

                // remove unneeded attributes (keep _extraComments alongside the required headers)
                msmsJsonArray = this.removeAttributes(msmsJsonArray, [...requiredHeaders, '_extraComments']);
```

Replace the Comments-line portion of `buildMspStringFromArray`:

```typescript
            'Formula: ' + (element['FORMULA'] || '') + '\n';

            const commentParts: string[] = [];
            if (mspNotes) {
                commentParts.push(mspNotes);
            }
            if (element['_extraComments']) {
                element['_extraComments'].forEach((comment: { header: string, value: string }) => {
                    commentParts.push(comment.header + ': ' + comment.value);
                });
            }
            if (commentParts.length > 0) {
                mspString += 'Comments: ' + commentParts.join('; ') + '\n';
            }
```

(This replaces the previous `if (mspNotes) { mspString += 'Comments: ' + mspNotes + '\n'; }` block.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --include='**/build-msp.service.spec.ts' --watch=false`
Expected: PASS — all specs green, including the pre-existing `'should produce formatted string from array'` test (notes `''`, no `_extraComments` → no Comments line, unchanged output)

- [ ] **Step 5: Commit**

```bash
git add src/app/build-msp-service/build-msp.service.ts src/app/build-msp-service/build-msp.service.spec.ts
git commit -m "Carry comment-mapped columns' per-row values into the .msp Comments line"
```

---

### Task 5: `ReadSpreadsheetComponent` — parse on file select, not on Submit

**Files:**
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.ts`
- Test: `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`

**Interfaces:**
- Consumes: `ReadSpreadsheetService.readXlsx`/`readAlignmentResultTxt` (existing), `BuildMspService.getHeaderPosition`/`normalizeHeaderRow`/`classifyHeaders`/`buildMspFile` (Tasks 2–4).
- Produces: `ReadSpreadsheetComponent.cachedMsmsArray: string[][] | null`, `ReadSpreadsheetComponent.headerMappings: HeaderMapping[]`, `ReadSpreadsheetComponent.currentFormat: MspSourceFormat`, `ReadSpreadsheetComponent.parseSelectedFile(): void`.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts` (add `import { of, throwError } from 'rxjs';` near the top alongside the existing `Observable` import):

```typescript
	it('should eagerly parse the file and populate headerMappings on a valid file selection', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([
			['AVERAGE RT(MIN)', 'BATCH ID'],
			['6.23', '3']
		]));

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.cachedMsmsArray).toEqual([['AVERAGE RT(MIN)', 'BATCH ID'], ['6.23', '3']]);
		expect(component.headerMappings).toEqual([
			{ header: 'AVERAGE RT(MIN)', action: 'map', targetKey: 'AVERAGE RT(MIN)', isSample: false },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false }
		]);
	});

	it('should pass the cached array and headerMappings to buildMspFile on submit, without re-reading the file', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		const readSpy = spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([
			['METABOLITE NAME'], ['Test Compound']
		]));
		spyOn(component.buildMspService, 'buildMspFile').and.returnValue('');

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);
		component.readFile();

		expect(readSpy).toHaveBeenCalledTimes(1);
		expect(component.buildMspService.buildMspFile).toHaveBeenCalledWith(
			[['METABOLITE NAME'], ['Test Compound']],
			jasmine.any(String),
			jasmine.any(String),
			'spreadsheet',
			component.headerMappings
		);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --include='**/read-spreadsheet.component.spec.ts' --watch=false`
Expected: FAIL — `component.cachedMsmsArray`/`headerMappings` are undefined; `readXlsx` is called twice (once from the old eager call this step expects, once from the still-present submit-time call) or `buildMspFile` isn't called with the expected 5th argument

- [ ] **Step 3: Write the implementation**

In `src/app/read-spreadsheet/read-spreadsheet.component.ts`:

Add imports:

```typescript
import { HeaderMappingService, HeaderMapping } from '../header-mapping-service/header-mapping.service';
```

Replace the `observable$`/`subscription` fields with:

```typescript
    parseSubscription: Subscription;
    cachedMsmsArray: string[][] | null;
    headerMappings: HeaderMapping[];
    currentFormat: MspSourceFormat;
```

Update the constructor to keep `buildMspService` accessible for tests (it already is, as a `private` param — change to have no access modifier restriction needed since tests reference `component.buildMspService`; make it `public` for testability, matching the plain-object test style already used in this spec file):

```typescript
    constructor(
		private readSpreadsheetService: ReadSpreadsheetService,
		private downloadFileService: DownloadFileService,
        public buildMspService: BuildMspService,
        private spinner: NgxSpinnerService) {}
```

In `ngOnInit()`, add:

```typescript
        this.cachedMsmsArray = null;
        this.headerMappings = [];
```

Replace `fileSelected`'s valid-file branch to call the new parse method, and reset cached state in the invalid-file branch:

```typescript
            if (/\.(xlsx|csv|xls|ods|numbers|txt)$/g.test(this.fileNameText)) {
                this.files = this.targetInput.files;
                this.submitValid = true;
                this.updateErrorText('', false);
                this.showCorrectImage(true);
                this.parseSelectedFile();
            } else {
                this.files = null;
                this.submitValid = false;
                this.cachedMsmsArray = null;
                this.headerMappings = [];
                this.updateErrorText('Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers, .txt', false);
                this.showCorrectImage(false);
            }
```

Add `parseSelectedFile`:

```typescript
	// Eagerly parse the selected file so the mapping panel has real headers before Submit
	parseSelectedFile() {
        this.currentFormat = /\.txt$/g.test(this.fileNameText) ? 'msdial' : 'spreadsheet';
        const readObservable = this.currentFormat === 'msdial'
            ? this.readSpreadsheetService.readAlignmentResultTxt(this.files)
            : this.readSpreadsheetService.readXlsx(this.files);

        this.parseSubscription = readObservable.pipe(take(1), timeout(10000)).subscribe({
            next: (msmsArray: string[][]) => {
                this.cachedMsmsArray = msmsArray;
                const headerPosition = this.buildMspService.getHeaderPosition(msmsArray);
                if (headerPosition >= 0) {
                    const headers = this.buildMspService.normalizeHeaderRow(msmsArray[headerPosition], this.currentFormat);
                    this.headerMappings = this.buildMspService.classifyHeaders(headers);
                } else {
                    this.headerMappings = [];
                }
            },
            error: () => {
                // Submit's existing error path (via buildMsp) surfaces the real error to the user
                this.cachedMsmsArray = null;
                this.headerMappings = [];
            }
        });
    }
```

Replace `readFile()`:

```typescript
	// Called when the user submits their spreadsheet
	readFile() {
		if (this.files) {
            this.spinner.show();
            if (this.cachedMsmsArray) {
                this.updateErrorText('', false);
                this.buildMsp(this.fileNameText, this.notesText.trim(), this.currentFormat);
            } else {
                this.updateErrorText('Error: file may be corrupted or may not exist', false);
                this.showCorrectImage(false);
                this.fileNameText = 'Click \'Browse\' to choose a spreadsheet';
                this.spinner.hide();
            }
		} else {
            this.updateErrorText('Select file before clicking \'Submit\'', false);
            this.showCorrectImage(false);
            this.spinner.hide();
        }
        this.submitValid = false;
        this.targetInput.value = null;
    }
```

Replace `buildMsp()`:

```typescript
    // Create .msp from the cached 2x2 array and/or get error descriptions
    buildMsp(name: string, notes: string, format: MspSourceFormat) {
        const errorData = this.buildMspService.buildMspFile(this.cachedMsmsArray, name, notes, format, this.headerMappings);
        if (errorData.length === 0 && this.buildMspService.missingData.length === 0 && this.buildMspService.duplicates.length === 0) {
            this.fileNameText = '.msp created';
            this.showCorrectImage(true);
        } else if (errorData.length > 0 && (this.buildMspService.missingData.length > 0 || this.buildMspService.duplicates.length > 0)) {
            this.fileNameText = '.msp created with some issues';
            this.showCorrectImage(true);
            this.updateErrorText(errorData, true);
        } else {
            this.fileNameText = 'Fix errors, then retry upload';
            this.showCorrectImage(false);
            this.updateErrorText(errorData, false);
        }
        this.spinner.hide();
    } // end buildMsp
```

Update `ngOnDestroy()`:

```typescript
    ngOnDestroy() {
        if (this.parseSubscription) {
            this.parseSubscription.unsubscribe();
        }
    }
```

Remove the now-unused `observable$` field declaration and the `Observable` import can stay (still used as a type in `ReadSpreadsheetService`, but no longer referenced directly in the component) — remove the `Observable` import from this file if no longer referenced after these edits; keep `Subscription`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --include='**/read-spreadsheet.component.spec.ts' --watch=false`
Expected: PASS — all specs green, including pre-existing ones (`fileSelected`/`readFile` structural tests still hold since the public method names and their externally-observable behavior on `submitValid`/`fileNameText` are unchanged)

- [ ] **Step 5: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.ts src/app/read-spreadsheet/read-spreadsheet.component.spec.ts
git commit -m "Parse selected file eagerly so header mapping is available before Submit"
```

---

### Task 6: Mapping review panel UI

**Files:**
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.ts`
- Modify: `src/app/read-spreadsheet/read-spreadsheet.component.html`
- Test: `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`

**Interfaces:**
- Consumes: `HeaderMapping` (Task 1), `component.headerMappings` (Task 5).
- Produces: `ReadSpreadsheetComponent.showMappingPanel: boolean`, `ReadSpreadsheetComponent.showMappingPanelToggle(): void`, `ReadSpreadsheetComponent.visibleHeaderMappings: HeaderMapping[]` (getter), `ReadSpreadsheetComponent.updateMapping(mapping: HeaderMapping, event: Event): void`.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/read-spreadsheet/read-spreadsheet.component.spec.ts`. First, update the `TestBed.configureTestingModule` call to import `CommonModule` and `FormsModule` (needed for `*ngFor`/`[hidden]` and the `<select>` binding used by the new template):

```typescript
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
```

```typescript
	TestBed.configureTestingModule({
        declarations: [ ReadSpreadsheetComponent ],
        imports: [CommonModule, FormsModule],
		schemas: [CUSTOM_ELEMENTS_SCHEMA]
	})
```

Then add:

```typescript
	it('should toggle showMappingPanel', () => {
		expect(component.showMappingPanel).toBe(false);
		component.showMappingPanelToggle();
		expect(component.showMappingPanel).toBe(true);
		component.showMappingPanelToggle();
		expect(component.showMappingPanel).toBe(false);
	});

	it('should exclude sample-flagged headers from visibleHeaderMappings', () => {
		component.headerMappings = [
			{ header: 'SAMPLE 1', action: 'ignore', targetKey: null, isSample: true },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false }
		];
		expect(component.visibleHeaderMappings).toEqual([
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false }
		]);
	});

	it('should update a mapping to "comment" when updateMapping is called with value "comment"', () => {
		const mapping = { header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false };
		component.headerMappings = [mapping];
		const select = document.createElement('select');
		select.value = 'comment';
		component.updateMapping(mapping, { target: select } as unknown as Event);
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'comment', targetKey: null, isSample: false });
	});

	it('should update a mapping to "map" with the chosen key when updateMapping is called with a key value', () => {
		const mapping = { header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false };
		component.headerMappings = [mapping];
		const select = document.createElement('select');
		select.value = 'FORMULA';
		component.updateMapping(mapping, { target: select } as unknown as Event);
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'map', targetKey: 'FORMULA', isSample: false });
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --include='**/read-spreadsheet.component.spec.ts' --watch=false`
Expected: FAIL — `component.showMappingPanelToggle is not a function`, `component.visibleHeaderMappings` is undefined, `component.updateMapping is not a function`

- [ ] **Step 3: Write the implementation**

In `read-spreadsheet.component.ts`, add the field, getter, and two methods:

```typescript
    showMappingPanel: boolean;
    mspKeys: string[];
```

In `ngOnInit()`, add:

```typescript
        this.showMappingPanel = false;
        this.mspKeys = this.buildMspService.vitalHeaders;
```

Add methods (near `showNotesTextArea`):

```typescript
    showMappingPanelToggle() {
        this.showMappingPanel = !this.showMappingPanel;
    }

    get visibleHeaderMappings(): HeaderMapping[] {
        return this.headerMappings.filter(mapping => !mapping.isSample);
    }

    updateMapping(mapping: HeaderMapping, event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        if (value === 'ignore') {
            mapping.action = 'ignore';
            mapping.targetKey = null;
        } else if (value === 'comment') {
            mapping.action = 'comment';
            mapping.targetKey = null;
        } else {
            mapping.action = 'map';
            mapping.targetKey = value;
        }
    }
```

In `read-spreadsheet.component.html`, add a new panel inside the existing `<form>`, right after the `#more-info` notes block (after its closing `</div>` at line 62, before `<div id="rs-buttons" ...>`):

```html
            <div id="mapping-info" [hidden]="headerMappings.length === 0">
                <p>
                    Review how this file's columns are mapped to MSP fields:
                    <button id="show-mapping-button" class="btn" (click)="showMappingPanelToggle()">
                        <i class="fa fa-plus show-notes-image" [hidden]="showMappingPanel"></i>
                        <i class="fa fa-minus show-notes-image" [hidden]="!showMappingPanel"></i>
                    </button>
                </p>
                <table id="mapping-table" [hidden]="!showMappingPanel">
                    <thead>
                        <tr><th>Column</th><th>Maps to</th></tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let mapping of visibleHeaderMappings; let i = index" [attr.data-header]="mapping.header">
                            <td>{{ mapping.header }}</td>
                            <td>
                                <select [attr.id]="'mapping-select-' + i" (change)="updateMapping(mapping, $event)">
                                    <option value="ignore" [selected]="mapping.action === 'ignore'">Ignore</option>
                                    <option value="comment" [selected]="mapping.action === 'comment'">Add as comment</option>
                                    <option *ngFor="let key of mspKeys" [value]="key" [selected]="mapping.action === 'map' && mapping.targetKey === key">{{ key }}</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
```

Also add `CommonModule` (for `*ngFor`) to the app's module imports if it is not already re-exported — check `src/app/app.module.ts`; `BrowserModule` already exports `CommonModule`'s directives app-wide, so no module change should be needed there. Confirm by building (Task 8) rather than editing the module speculatively.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --include='**/read-spreadsheet.component.spec.ts' --watch=false`
Expected: PASS — all specs green

- [ ] **Step 5: Commit**

```bash
git add src/app/read-spreadsheet/read-spreadsheet.component.ts src/app/read-spreadsheet/read-spreadsheet.component.html src/app/read-spreadsheet/read-spreadsheet.component.spec.ts
git commit -m "Add optional header-mapping review panel to the upload UI"
```

---

### Task 7: E2E coverage for the mapping panel

**Files:**
- Create: `e2e/testing-files/msdial_alignment_result_with_extra_column.txt`
- Modify: `e2e/src/app.po.ts`
- Modify: `e2e/src/app.e2e-spec.ts`

**Interfaces:**
- Produces: `AppPage.toggleMappingPanel(): Promise<void>`, `AppPage.isMappingPanelHidden(): Promise<string>`, `AppPage.selectMappingOption(header: string, optionText: string): Promise<void>`, `AppPage.isMappingRowPresent(header: string): Promise<boolean>`.

- [ ] **Step 1: Create the fixture file**

Create `e2e/testing-files/msdial_alignment_result_with_extra_column.txt`:

```
Class
File type
Injection order
Batch ID
Alignment ID	Average Rt(min)	Average Mz	Metabolite name	Adduct type	Formula	INCHIKEY	MS1 isotopic spectrum	MS/MS spectrum	Notes	Sample 1
1	6.23	219.11317	1-Methyltryptophan	[M+H]+	C12H14N2O2	ZADWXFSZEAPBJS-JTQLQIEISA-N	219.1:100	35.09272:9 35.16082:7	Interesting peak	1000
```

(Columns are tab-separated, matching `msdial_alignment_result_small.txt`'s format; `Notes` is an unmatched metadata column, `Sample 1` is a sample-pattern column.)

- [ ] **Step 2: Write the failing e2e tests**

Add to `e2e/src/app.po.ts`:

```typescript
    toggleMappingPanel() {
        return element(by.id('show-mapping-button')).click();
    }

    isMappingPanelHidden() {
        return element(by.id('mapping-table')).getAttribute('hidden');
    }

    isMappingRowPresent(header: string) {
        return element(by.css(`tr[data-header="${header}"]`)).isPresent();
    }

    selectMappingOption(header: string, optionText: string) {
        const select = element(by.css(`tr[data-header="${header}"] select`));
        return select.element(by.cssContainingText('option', optionText)).click();
    }
```

Add to `e2e/src/app.e2e-spec.ts` (near the other MS-DIAL tests):

```typescript
    it('should show a hidden-by-default mapping panel after uploading a file with unmatched columns', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        expect(page.elementExists('show-mapping-button')).toBe(true);
        expect(page.isMappingPanelHidden()).toBe('true');
    });

    it('should exclude a Sample N style column from the mapping panel', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        page.toggleMappingPanel();
        expect(page.isMappingRowPresent('SAMPLE 1')).toBe(false);
        expect(page.isMappingRowPresent('NOTES')).toBe(true);
    });

    it('should include a user-added MSP Comment from an unmatched column after a mapping override', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        page.toggleMappingPanel();
        page.selectMappingOption('NOTES', 'Add as comment');
        const name = './e2e/downloads/msdial_alignment_result_with_extra_column.txt';
        page.submitFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(name);
            }, 10*1000, 'File with correct name should be downloaded').then(function() {
                const mspContent = fs.readFileSync(name, 'utf8');
                expect(mspContent).toContain('Comments: NOTES: Interesting peak');
            });
        });
    });

    it('should still download an unmodified .msp when the mapping panel is left untouched', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        const name = './e2e/downloads/msdial_alignment_result_with_extra_column.txt';
        page.submitFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(name);
            }, 10*1000, 'File with correct name should be downloaded').then(function() {
                const mspContent = fs.readFileSync(name, 'utf8');
                expect(mspContent).toContain('Name: 1-Methyltryptophan');
                expect(mspContent).not.toContain('Comments:');
                expect(mspContent).not.toContain('Interesting peak');
            });
        });
    });
```

- [ ] **Step 3: Run the e2e tests to verify the new ones fail and the rest still pass**

Run: `npm run e2e`
Expected: the 4 new tests run against the real app; the "left untouched" and "show panel" tests should already pass since Tasks 1–6 implement the underlying behavior — this step is primarily a verification run, not a red/green TDD cycle (e2e specs exercise already-implemented behavior end-to-end)

- [ ] **Step 4: Fix any failures**

If a locator or fixture mismatch causes a failure, adjust the `app.po.ts` selectors or the fixture file (not the application code, which was already verified at the unit level in Tasks 1–6) until all e2e specs pass.

- [ ] **Step 5: Commit**

```bash
git add e2e/testing-files/msdial_alignment_result_with_extra_column.txt e2e/src/app.po.ts e2e/src/app.e2e-spec.ts
git commit -m "Add e2e coverage for the header-mapping review panel"
```

---

### Task 8: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite with coverage**

Run: `ng test --watch=false --code-coverage`
Expected: all specs pass; statement/branch/function/line coverage each at or above 80% (per this project's CI requirement). If any file introduced in Tasks 1–6 falls below threshold, add the missing test case(s) to that file's spec and re-run.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors. Fix any tslint violations in the new/modified files (e.g. missing type annotations, unused imports such as a leftover `Observable` import in `read-spreadsheet.component.ts` if it's no longer referenced).

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors (this will catch template binding issues from Task 6, such as `*ngFor` requiring `CommonModule`, if the app module doesn't already provide it).

- [ ] **Step 4: Run the full e2e suite**

Run: `npm run e2e`
Expected: all e2e specs pass, including the pre-existing ones (this is the regression guard for Global Constraint #1 — default behavior must be unchanged for every existing fixture).

- [ ] **Step 5: Restart the dev server and manually verify**

Run: `./dev-stop.sh && ./dev-start.sh` (or the project's equivalent scripts), then in a browser: upload a file with an extra unmatched column, confirm the mapping panel appears collapsed, expand it, change one mapping to "Add as comment," submit, and open the downloaded `.msp` to confirm the Comments line appears as expected.

- [ ] **Step 6: Commit any fixes from this task**

```bash
git add -A
git commit -m "Fix lint/coverage/build issues found in full regression pass"
```

(Only if Steps 1–4 required code changes; skip this commit if everything passed cleanly.)
