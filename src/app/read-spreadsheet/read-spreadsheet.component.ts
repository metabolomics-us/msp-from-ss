import { Component, OnInit } from '@angular/core';
import { ReadSpreadsheetService } from '../read-spreadsheet.service';
import { DownloadFileService } from '../download-file.service';

import { BuildMspService } from '../build-msp.service';
import { Observable, of } from 'rxjs';

import { NgxSpinnerService } from 'ngx-spinner';

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
        private buildMspService: BuildMspService,
        private spinner: NgxSpinnerService) {}

	ngOnInit() {
		// Submit button disabled
		this.submitValid = false;
        this.fileName = 'Select a spreadsheet to convert';
        this.spinner.hide();
        
        // this.spinner.show();
        // setTimeout(() => {
        //     /** spinner ends after 5 seconds */
        //     this.spinner.hide();
        // }, 5000);
	}


	// User downloads an example MS/MS spreadsheet or .msp file
	downloadExample(mouseEvent: Event) {
		// Get the DOM element, get its name, turn the name into the filename to download
		//  i.e. <a name='example-msp' ...> => example.msp
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
	readFileBuildMsp() {
		// If the user has chosen a file, create .msp
		if (this.files) {

            // Start spinner here???

			// Need a reference to 'this' so that we can access it within observable.subscribe
			const self = this;

			const name = this.files[0].name;
			let observable: Observable<any>;
            let errorText = '';
            
            this.spinner.show();

			// Call readXlsx or readCsv depending on type of file submitted
			// Get Observable that converts spreadsheet into 2x2 array
			// Create .msp from 2x2 array and get error descriptions

			if (name.split('.')[1] === 'xlsx') {
				observable = this.readSpreadsheetService.readXlsx(this.files);
				observable.subscribe({
					next(msmsArray) {
						errorText = self.buildMspService.buildMspFile(msmsArray, name);
						document.getElementById('errorText').innerHTML = '<p>' + errorText + '</p>';
						if (errorText === '') {
							self.fileName = 'Success!';
                        }
                        console.log('should hide');
                        self.spinner.hide();
					},
					error(err) { 
                        console.error('something wrong occurred: ' + err);
                        self.spinner.hide(); 
                    },
					complete() { 
                        console.log('done');
                        self.spinner.hide();
                    }
				});
			} else if (name.split('.')[1] === 'csv') {
				observable = this.readSpreadsheetService.readCsv(this.files);
	            observable.subscribe({
					next(msmsArray) {
						errorText = self.buildMspService.buildMspFile(msmsArray, name);
						document.getElementById('errorText').innerHTML = '<p>' + errorText + '</p>';
						if (errorText === '') {
							self.fileName = 'Success!';
                        }
                        self.spinner.hide();
					},
					error(err) { 
                        console.error('something wrong occurred: ' + err); 
                        self.spinner.hide();
                    },
					complete() { 
                        console.log('done'); 
                        self.spinner.hide();
                    }
				});
			} else {
                document.getElementById('errorText').innerHTML = '<p>Please choose an excel or .csv file</p>';
                this.spinner.hide();
			}

			// Disable the Submit button
			this.submitValid = false;
			this.fileName = 'Select a spreadsheet to convert';

		} else {
			document.getElementById('errorText').innerHTML = '<p>Select file before clicking \'Submit\'</p>';
		}
	}

}
