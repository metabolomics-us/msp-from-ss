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

	private readonly synonyms: { [key: string]: string[] } = {
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

	classify(headers: string[], recognizedHeaders: RecognizedHeader[]): HeaderMapping[] {
		const knownKeys = recognizedHeaders.map(config => config.key);
		// Exact matches always win. A canonical key already covered by an exact match
		// elsewhere in this same header row must not also be claimed by a synonym match
		// (which would rename two headers to the same key and silently corrupt one).
		const normalizedHeaders = headers.map(header => this.normalize(header));
		const exactMatchedKeys = new Set(knownKeys.filter(key => normalizedHeaders.indexOf(key) >= 0));

		return headers.map(header => {
			if (this.isSampleColumn(header) || this.isMxColumn(header)) {
				return { header, action: 'ignore' as MspAction, targetKey: null, isSample: true, recognizedAs: null };
			}
			const isExactMatch = knownKeys.indexOf(this.normalize(header)) >= 0;
			const suggested = this.suggestKey(header, knownKeys);
			if (suggested && (isExactMatch || !exactMatchedKeys.has(suggested))) {
				const config = recognizedHeaders.find(c => c.key === suggested) as RecognizedHeader;
				return { header, action: config.action, targetKey: config.targetKey, isSample: false, recognizedAs: suggested };
			}
			return { header, action: 'ignore' as MspAction, targetKey: null, isSample: false, recognizedAs: null };
		});
	}
}
