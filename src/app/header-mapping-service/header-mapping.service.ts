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
