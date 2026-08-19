import { Injectable } from '@angular/core';

export type MspAction = 'map' | 'comment' | 'ignore';

export interface HeaderMapping {
	header: string;
	action: MspAction;
	targetKey: string | null;
	isSample: boolean;
	recognizedAs?: string | null;
}

export interface RecognizedHeader {
	key: string;
	action: MspAction;
	targetKey: string | null;
}

@Injectable({
	providedIn: 'root'
})
export class HeaderMappingService {

	private readonly sampleColumnPattern = /^SAMPLE[\s_-]*\d+$/;
	private readonly mxColumnPattern = /_MX\d+_/;
	// A single trailing numeric column is ambiguous -- it's just as plausibly a real metadata
	//  field (e.g. "Batch ID", "Injection order") as a one-sample file. A real per-sample
	//  intensity block spans many samples, so require at least this many qualifying trailing
	//  columns before treating any of them as samples.
	private readonly minTrailingNumericColumnsForSampleBlock = 2;

	private readonly synonyms: Record<string, string[]> = {
		'METABOLITE NAME': ['NAME', 'COMPOUND NAME', 'COMPOUND'],
		'ADDUCT TYPE': ['ADDUCT', 'PRECURSOR TYPE', 'ION TYPE'],
		'AVERAGE MZ': ['MZ', 'PRECURSOR MZ', 'M/Z'],
		'AVERAGE RT(MIN)': ['RT', 'RETENTION TIME'],
		'FORMULA': ['MOLECULAR FORMULA', 'CHEMICAL FORMULA'],
		'INCHIKEY': ['INCHI KEY', 'INCHI-KEY'],
		'MS1 SPECTRUM': ['MS1', 'PRECURSOR SPECTRUM'],
		'MSMS SPECTRUM': ['MS/MS SPECTRUM', 'MSMS', 'MS2 SPECTRUM', 'FRAGMENT SPECTRUM'],
		'SMILES': []
	};

	private normalize(header: string): string {
		return header.trim().toUpperCase();
	}

	isSampleColumn(header: string): boolean {
		return this.sampleColumnPattern.test(this.normalize(header));
	}

	isMxColumn(header: string): boolean {
		return this.mxColumnPattern.test(this.normalize(header));
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

	// A value from a parsed spreadsheet cell: numeric cells may already be `number` (xlsx) or a
	//  numeric-looking `string` (csv/ods), blank cells may be `undefined` or an empty string.
	private isNumericLike(value: unknown): boolean {
		if (typeof value === 'number') {
			return Number.isFinite(value);
		}
		if (typeof value === 'string' && value.trim() !== '') {
			return Number.isFinite(Number(value));
		}
		return false;
	}

	// True only if the column has at least one non-blank value and every non-blank value is
	//  numeric -- real intensity/area columns never mix in text, so this is a strict check.
	private isNumericColumn(dataRows: string[][], columnIndex: number): boolean {
		let sawValue = false;
		for (const row of dataRows) {
			const value = row[columnIndex];
			if (value === undefined || value === null || String(value).trim() === '') {
				continue;
			}
			sawValue = true;
			if (!this.isNumericLike(value)) {
				return false;
			}
		}
		return sawValue;
	}

	// No naming-convention regex can enumerate every lab's sample-ID scheme (e.g. MS-DIAL-style
	//  "POS_002_AGIL_A"), so a header this app doesn't otherwise recognize is treated as a sample
	//  column when it's structurally consistent with one: positioned after every recognized
	//  header in this row (real per-sample intensity blocks always trail the metadata columns),
	//  and holding only numeric data.
	classify(headers: string[], recognizedHeaders: RecognizedHeader[], dataRows: string[][] = []): HeaderMapping[] {
		const knownKeys = recognizedHeaders.map(config => config.key);
		// Exact matches always win. A canonical key already covered by an exact match
		// elsewhere in this same header row must not also be claimed by a synonym match
		// (which would rename two headers to the same key and silently corrupt one).
		const normalizedHeaders = headers.map(header => this.normalize(header));
		const exactMatchedKeys = new Set(knownKeys.filter(key => normalizedHeaders.indexOf(key) >= 0));

		const recognitions = headers.map(header => {
			const isExactMatch = knownKeys.indexOf(this.normalize(header)) >= 0;
			const suggested = this.suggestKey(header, knownKeys);
			const isRecognized = !!suggested && (isExactMatch || !exactMatchedKeys.has(suggested));
			return { suggested, isRecognized };
		});
		const recognizedIndexes = recognitions
			.map((r, i) => r.isRecognized ? i : -1)
			.filter(i => i >= 0);
		const lastRecognizedIndex = recognizedIndexes.length > 0 ? Math.max(...recognizedIndexes) : -1;

		const trailingNumericIndexes = new Set(
			headers
				.map((_header, i) => i)
				.filter(i => i > lastRecognizedIndex && !recognitions[i].isRecognized && this.isNumericColumn(dataRows, i))
		);
		const hasSampleBlock = trailingNumericIndexes.size >= this.minTrailingNumericColumnsForSampleBlock;

		return headers.map((header, i) => {
			if (this.isSampleColumn(header) || this.isMxColumn(header)) {
				return { header, action: 'ignore' as MspAction, targetKey: null, isSample: true, recognizedAs: null };
			}
			const { suggested, isRecognized } = recognitions[i];
			if (isRecognized) {
				const config = recognizedHeaders.find(c => c.key === suggested) as RecognizedHeader;
				return { header, action: config.action, targetKey: config.targetKey, isSample: false, recognizedAs: suggested };
			}
			if (hasSampleBlock && trailingNumericIndexes.has(i)) {
				return { header, action: 'ignore' as MspAction, targetKey: null, isSample: true, recognizedAs: null };
			}
			return { header, action: 'ignore' as MspAction, targetKey: null, isSample: false, recognizedAs: null };
		});
	}
}
