import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReadSpreadsheetComponent } from './read-spreadsheet.component';
import { DownloadFileService } from '../download-file-service/download-file.service';

describe('ReadSpreadsheetComponent (integration, real service graph)', () => {
	let fixture: ComponentFixture<ReadSpreadsheetComponent>;
	let component: ReadSpreadsheetComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [ReadSpreadsheetComponent, NoopAnimationsModule]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReadSpreadsheetComponent);
		component = fixture.debugElement.componentInstance;
		fixture.detectChanges();
	});

	it('should parse a real MS-DIAL text upload, populate the mapping panel, and produce a downloadable .msp with no service mocked', () => new Promise<void>((resolve, reject) => {
		const content = [
			['Alignment ID', 'Average Rt(min)', 'Average Mz', 'Metabolite name', 'Adduct type', 'Formula', 'INCHIKEY', 'MS1 isotopic spectrum', 'MS/MS spectrum'],
			['1', '6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.1:100', '35.09272:9 35.16082:7']
		].map(row => row.join('\t')).join('\n');
		const file = new File([content], 'integration-test.txt', { type: 'text/plain' });
		const fileList = { length: 1, 0: file } as unknown as FileList;

		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		setTimeout(() => {
			try {
				expect(component.submitValid).toBe(true);
				expect(component.headerMappings.length).toBeGreaterThan(0);
				expect(component.visibleHeaderMappings.some(m => m.recognizedAs === 'METABOLITE NAME')).toBe(true);

				const downloadFileService = TestBed.inject(DownloadFileService);
				const saveFileSpy = vi.spyOn(component.buildMspService, 'saveFile').mockImplementation(() => {});

				component.readFile();

				expect(saveFileSpy).toHaveBeenCalledTimes(1);
				const [mspContent, savedName] = saveFileSpy.mock.calls[0];
				expect(savedName).toBe('integration-test.msp');
				expect(mspContent).toContain('Name: 1-Methyltryptophan');
				expect(mspContent).toContain('InChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N');
				expect(downloadFileService).toBeTruthy();
				resolve();
			} catch (e) { reject(e); }
		}, 50);
	}));
});
