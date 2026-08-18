import { TestBed } from '@angular/core/testing';
import { HeaderMappingService, RecognizedHeader } from './header-mapping.service';

describe('HeaderMappingService', () => {
	let service: HeaderMappingService;
	const knownKeys = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];

	const recognizedHeaders: RecognizedHeader[] = [
		{ key: 'AVERAGE RT(MIN)', action: 'map', targetKey: 'AVERAGE RT(MIN)' },
		{ key: 'AVERAGE MZ', action: 'map', targetKey: 'AVERAGE MZ' },
		{ key: 'METABOLITE NAME', action: 'map', targetKey: 'METABOLITE NAME' },
		{ key: 'ADDUCT TYPE', action: 'map', targetKey: 'ADDUCT TYPE' },
		{ key: 'FORMULA', action: 'map', targetKey: 'FORMULA' },
		{ key: 'INCHIKEY', action: 'map', targetKey: 'INCHIKEY' },
		{ key: 'MS1 SPECTRUM', action: 'map', targetKey: 'MS1 SPECTRUM' },
		{ key: 'MSMS SPECTRUM', action: 'map', targetKey: 'MSMS SPECTRUM' }
	];

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

	// isMxColumn

	it('should flag headers containing an "_MX<digits>_" segment as MX columns, regardless of surrounding text', () => {
		expect(service.isMxColumn('Batch_MX123_Value')).toBe(true);
		expect(service.isMxColumn('negCSH_MX1_HDL')).toBe(true);
		expect(service.isMxColumn('mx_MX42_suffix')).toBe(true);
	});

	it('should not flag a header without an "_MX<digits>_" segment as an MX column', () => {
		expect(service.isMxColumn('MX123')).toBe(false);
		expect(service.isMxColumn('Batch_MX_Value')).toBe(false);
		expect(service.isMxColumn('Batch_MXABC_Value')).toBe(false);
		expect(service.isMxColumn('Metabolite name')).toBe(false);
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

	it('should match SMILES case-insensitively', () => {
		expect(service.suggestKey('smiles', ['SMILES'])).toEqual('SMILES');
		expect(service.suggestKey('Smiles', ['SMILES'])).toEqual('SMILES');
	});

	// classify

	it('should classify a sample column as ignored with isSample true', () => {
		const result = service.classify(['Sample 1'], recognizedHeaders);
		expect(result).toEqual([{ header: 'Sample 1', action: 'ignore', targetKey: null, isSample: true, recognizedAs: null }]);
	});

	it('should classify an MX-pattern column as ignored with isSample true', () => {
		const result = service.classify(['negCSH_MX123_HDL'], recognizedHeaders);
		expect(result).toEqual([{ header: 'negCSH_MX123_HDL', action: 'ignore', targetKey: null, isSample: true, recognizedAs: null }]);
	});

	it('should classify an exact/synonym key match as mapped with isSample false', () => {
		const result = service.classify(['Retention Time'], recognizedHeaders);
		expect(result).toEqual([{ header: 'Retention Time', action: 'map', targetKey: 'AVERAGE RT(MIN)', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' }]);
	});

	it('should classify an unmatched, non-sample header as ignored with isSample false', () => {
		const result = service.classify(['Batch ID'], recognizedHeaders);
		expect(result).toEqual([{ header: 'Batch ID', action: 'ignore', targetKey: null, isSample: false, recognizedAs: null }]);
	});

	it('should not shadow an exact canonical match by renaming a co-occurring synonym to the same key', () => {
		const result = service.classify(['METABOLITE NAME', 'NAME', 'AVERAGE RT(MIN)'], recognizedHeaders);
		expect(result).toEqual([
			{ header: 'METABOLITE NAME', action: 'map', targetKey: 'METABOLITE NAME', isSample: false, recognizedAs: 'METABOLITE NAME' },
			{ header: 'NAME', action: 'ignore', targetKey: null, isSample: false, recognizedAs: null },
			{ header: 'AVERAGE RT(MIN)', action: 'map', targetKey: 'AVERAGE RT(MIN)', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' }
		]);
	});

	it('should apply a recognized header\'s configured default action and targetKey, not force "map"', () => {
		const rtAsComment: RecognizedHeader[] = [
			{ key: 'AVERAGE RT(MIN)', action: 'comment', targetKey: 'RT' },
			{ key: 'MS1 SPECTRUM', action: 'ignore', targetKey: null }
		];
		const result = service.classify(['AVERAGE RT(MIN)', 'MS1 SPECTRUM'], rtAsComment);
		expect(result).toEqual([
			{ header: 'AVERAGE RT(MIN)', action: 'comment', targetKey: 'RT', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' },
			{ header: 'MS1 SPECTRUM', action: 'ignore', targetKey: null, isSample: false, recognizedAs: 'MS1 SPECTRUM' }
		]);
	});

	it('should recognize SMILES case-insensitively and apply its configured comment action', () => {
		const withSmiles: RecognizedHeader[] = [{ key: 'SMILES', action: 'comment', targetKey: 'SMILES' }];
		const result = service.classify(['smiles'], withSmiles);
		expect(result).toEqual([{ header: 'smiles', action: 'comment', targetKey: 'SMILES', isSample: false, recognizedAs: 'SMILES' }]);
	});
});
