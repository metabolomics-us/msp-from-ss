import { Component, OnInit } from '@angular/core';
import { ReadSpreadsheetService } from '../read-spreadsheet.service';
import { DownloadFileService } from '../download-file.service';

import { BuildMspService } from '../build-msp.service';
import { Observable, Observer, Subscription } from 'rxjs';

@Component({
	selector: 'read-spreadsheet',
	templateUrl: 'read-spreadsheet.component.html',
	styleUrls: ['read-spreadsheet.component.css'],
	providers: [ReadSpreadsheetService, DownloadFileService, BuildMspService]
})

export class ReadSpreadsheetComponent implements OnInit {

	submitValid: boolean;
	// errorText: string;
	files: FileList;
	fileName: string;

	constructor(
        private readSpreadsheetService: ReadSpreadsheetService,
        private downloadFileService: DownloadFileService,
        private buildMspService: BuildMspService) {}

	ngOnInit() {
		// Submit button disabled
        this.submitValid = false;
        
		this.fileName = 'Select a spreadsheet to convert';
        document.getElementById('errorText').innerHTML = '';

        // "File chooser dialog can only be shown with a user activation"
        // const inputB = document.getElementById('fileInput');
        // inputB.click();

        // var f = new File([""], "filename", { type: 'text/html' });
        // var blob = new Blob([""], { type: 'text/html' });
        // blob["lastModifiedDate"] = "";
        // blob["name"] = "filename";
        // var fakeF = blob;

        // const f1 = new File(["file 1"], "file 1", { type: 'text/html' });
        // const f2 = new File(["file 2"], "file 2", { type: 'text/html' });
        // console.log(f1.name);
        // Look at datatransfer object
        // const flist = new FileList();

        // Where does Browser store a file for you to download, hm?
    }
    

    // User downloads an example MS/MS spreadsheet or .msp file
    downloadExample(mouseEvent: Event) {
        // Get the DOM element, get its name, turn the name into the filename to download
        // i.e. <a name='example-msp' ...> => example.msp
        const target = mouseEvent.target as HTMLAnchorElement;
        this.downloadFileService.downloadFile('../assets/files-to-read/', target.name.replace('-', '.'));
    }


	// Called when user selects spreadsheet to be turned into a .msp
	fileSelected(changeEvent: Event) {
		const target = changeEvent.target as HTMLInputElement;

		// Submit button can now be clicked
		this.submitValid = true;
		// Store selected file
		this.files = target.files;
		this.fileName = target.files[0].name;
        document.getElementById('errorText').innerHTML = '';
	}


	// Called when the user submits their spreadsheet
	readFile() {

        // If the user has chosen a file, create .msp with ReadSpreadsheetService
		// Otherwise, throw an error
		if (this.files) {

			// Process either excel or csv spreadsheet
			const nameElements = this.files[0].name.split('.');
			if (nameElements[1] === 'xlsx') {
				this.readSpreadsheetService.mspFromXlsx(this.files);
			} else if (nameElements[1] === 'csv') {
				this.readSpreadsheetService.mspFromCsv(this.files);
			} else {
				document.getElementById('errorText').innerHTML = 'Please choose an excel or .csv file';
			}

			// Disable the Submit button
			this.submitValid = false;
			this.fileName = 'Select a spreadsheet to convert';
			document.getElementById('errorText').innerHTML = '';
		} else {
			document.getElementById('errorText').innerHTML = 'Select file before clicking \'Submit\'';
		}
    }
    








    readFileGetArray() {
        // If the user has chosen a file, create .msp with ReadSpreadsheetService
		// Otherwise, throw an error
		if (this.files) {

            const self = this;

            const name = this.files[0].name;
            let observable: Observable<any>;
			if (name.split('.')[1] === 'xlsx') {
                observable = this.readSpreadsheetService.readXlsx(this.files);
                observable.subscribe({
                    next(msmsArray) { self.buildMspService.buildMspFile(msmsArray, name); },
                    error(err) { console.error('something wrong occurred: ' + err); },
                    complete() { console.log('done'); }
                });
			} else if (name.split('.')[1] === 'csv') {
				observable = this.readSpreadsheetService.readCsv(this.files);
                observable.subscribe({
                    next(msmsArray) { self.buildMspService.buildMspFile(msmsArray, name); },
                    error(err) { console.error('something wrong occurred: ' + err); },
                    complete() { console.log('done'); }
                });
			} else {
				document.getElementById('errorText').innerHTML = 'Please choose an excel or .csv file';
			}
			// Disable the Submit button
			this.submitValid = false;
			this.fileName = 'Select a spreadsheet to convert';
			document.getElementById('errorText').innerHTML = '';
		} else {
			document.getElementById('errorText').innerHTML = 'Select file before clicking \'Submit\'';
		}
    }

}
