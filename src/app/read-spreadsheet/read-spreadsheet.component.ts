import { Component, OnInit } from '@angular/core';
import { ReadSpreadsheetService } from '../read-spreadsheet.service';
import { DownloadFileService } from '../download-file.service';
import { $ } from 'protractor';

@Component({
	selector: 'read-spreadsheet',
	templateUrl: 'read-spreadsheet.component.html',
	styleUrls: ['read-spreadsheet.component.css'],
	providers: [ReadSpreadsheetService, DownloadFileService]
})

export class ReadSpreadsheetComponent implements OnInit {

	submitValid: boolean;
	// errorText: string;
	files: FileList;
	fileName: string;

	constructor(
        private readSpreadsheetService: ReadSpreadsheetService,
        private downloadFileService: DownloadFileService) {}

	ngOnInit() {
		// Submit button disabled
        this.submitValid = false;
        
		this.fileName = 'Select a spreadsheet to convert';
        document.getElementById('errorText').innerHTML = '';
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
        
        // console.log(target.value);
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

}
