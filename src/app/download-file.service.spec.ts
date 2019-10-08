import { TestBed } from '@angular/core/testing';

import { DownloadFileService } from './download-file.service';

describe('DownloadFileService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));
  
    it('should be created', () => {
        const service: DownloadFileService = TestBed.get(DownloadFileService);
        expect(service).toBeTruthy();
    });

    it('should download example files', () => {

        // const tempLink = document.createElement('a');
        // tempLink.href = '../../assets/files-to-read/example.msp';
        // tempLink.target = '_blank';
        // tempLink.download = 'example.msp';
        // tempLink.click();
        // tempLink.remove();

        // const spyObj = jasmine.createSpyObj('a', ['click']);
        // // spy on document.createElement() and return the spy object
        // spyOn(document, 'createElement').and.returnValue(spyObj);

        // const comp = new ExampleComponent();
        // comp.download();

        // expect(document.createElement).toHaveBeenCalledTimes(1);
        // expect(document.createElement).toHaveBeenCalledWith('a');

        // expect(spyObj.href).toBe('data:text/csv;charset=utf-8,ID,Name%0A1,abc%0A2,def%0A');
        // expect(spyObj.target).toBe('_blank');
        // expect(spyObj.download).toBe('export.csv');
        // expect(spyObj.click).toHaveBeenCalledTimes(1);
        // expect(spyObj.click).toHaveBeenCalledWith();
    });
});
