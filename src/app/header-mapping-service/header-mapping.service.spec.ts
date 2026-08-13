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

	it('should not shadow an exact canonical match by renaming a co-occurring synonym to the same key', () => {
		const result = service.classify(['METABOLITE NAME', 'NAME', 'AVERAGE RT(MIN)'], knownKeys);
		expect(result).toEqual([
			{ header: 'METABOLITE NAME', action: 'map', targetKey: 'METABOLITE NAME', isSample: false },
			{ header: 'NAME', action: 'ignore', targetKey: null, isSample: false },
			{ header: 'AVERAGE RT(MIN)', action: 'map', targetKey: 'AVERAGE RT(MIN)', isSample: false }
		]);
	});
});
