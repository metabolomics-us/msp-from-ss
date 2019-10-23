import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReadSpreadsheetService } from '../read-spreadsheet.service';
import { DownloadFileService } from '../download-file.service';

import { BuildMspService } from '../build-msp.service';
import { Observable, of, Subscription } from 'rxjs';

import { NgxSpinnerService } from 'ngx-spinner';

import { timeout, take } from 'rxjs/operators';

@Component({
	selector: 'read-spreadsheet',
	templateUrl: 'read-spreadsheet.component.html',
	styleUrls: ['read-spreadsheet.component.css'],
	providers: [ReadSpreadsheetService, DownloadFileService, BuildMspService]
})

export class ReadSpreadsheetComponent implements OnInit, OnDestroy {
    
    submitValid: boolean;
    files: FileList;
    fileNameText: string;
    observable$: Observable<any>;
    subscription: Subscription;
    targetInput: HTMLInputElement;
    
    constructor(
		private readSpreadsheetService: ReadSpreadsheetService,
		private downloadFileService: DownloadFileService,
        private buildMspService: BuildMspService,
        private spinner: NgxSpinnerService) {}

	ngOnInit() {
		// Submit button disabled
		this.submitValid = false;
        this.fileNameText = 'Select a spreadsheet to convert';
        this.spinner.hide();
    }

    
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    // For testing purposes
    // filesExist () {
    //     console.log(this.files);
    //     if (this.files) {
    //         console.log('YES');
    //     } else {
    //         console.log('No');
    //     }
    // }
    // targetFilesExist () {
    //     console.log(this.targetInput.files);
    //     if (this.targetInput.files) {
    //         console.log('YES');
    //     } else {
    //         console.log('No');
    //     }
    // }


	// User downloads an example MS/MS spreadsheet or .msp file
	downloadExample(mouseEvent: Event) {
		// Get the DOM element, get its name, turn the name into the filename to download
		//  i.e. <a name='example-msp' ...> => example.msp
		const target = mouseEvent.target as HTMLAnchorElement;
		this.downloadFileService.downloadFile('../assets/files-to-read/', target.name.replace('-', '.'));
	}


	// Called when user selects spreadsheet to be turned into a .msp
	fileSelected(changeEvent: Event) {
        // console.log('file selected');
        this.targetInput = changeEvent.target as HTMLInputElement;

        if (this.targetInput.files.length > 0) {
            // Store selected file
            this.files = this.targetInput.files;
            this.fileNameText = this.targetInput.files[0].name;
            // Submit button can now be clicked
            this.submitValid = true;
            document.getElementById('error-text').innerHTML = '';
        } 
	}


	// Called when the user submits their spreadsheet
	readFile() {
		// If the user has chosen a file, create .msp
		if (this.files) {
            this.spinner.show();

            const name = this.files[0].name;
            
            // Call readXlsx or readCsv depending on type of file submitted
            // Get Observable that converts spreadsheet into 2x2 array
			if (name.split('.')[1] === 'xlsx') {
                // Get observable which converts .xlsx into array
                this.observable$ = this.readSpreadsheetService.readXlsx(this.files);
                this.buildMsp(name);
                // observable = this.readSpreadsheetService.readXlsx(this.files).pipe(timeout(5000));
			} else if (name.split('.')[1] === 'csv') {
                // Get observable which converts .csv into array
                this.observable$ = this.readSpreadsheetService.readCsv(this.files);
                this.buildMsp(name);
			} else {
                document.getElementById('error-text').innerHTML = '<p>Please choose an excel or .csv file</p>';
                this.fileNameText = 'Select a spreadsheet to convert';
                this.spinner.hide();
			}

		} else {
            document.getElementById('error-text').innerHTML = '<p>Select file before clicking \'Submit\'</p>';
            this.spinner.hide();
        }
        // Disable the Submit button
        this.submitValid = false;

        // Clear input field value so that user can consecutively upload files with the same name
        //  Otherwise, on the next upload, no change event will register and fileSelected won't execute
        this.targetInput.value = null;
    }


    // Create .msp from 2x2 array and/or get error descriptions
    buildMsp(name: string) {
        // Need a reference to 'this' so that we can access it within observable$.subscribe
        const self = this;
        let errorText = '';

        // take(1) means the observable will unsubscribe after one execution; prevents memory leaks
        //  Times out if unable to read and parse spreadsheet in 10 seconds
        this.subscription = this.observable$.pipe(take(1),timeout(10000)).subscribe({
        	next(msmsArray) {
                // Create .msp file and display any error test
        		errorText = self.buildMspService.buildMspFile(msmsArray, name);
        		document.getElementById('error-text').innerHTML = '<p>' + errorText + '</p>';
        		if (errorText === '') {
        			self.fileNameText = 'Success!';
                }
                self.spinner.hide();
        	},
        	error(err) { 
                // Display error in case of timeout
                document.getElementById('error-text').innerHTML = '<p>' + err + '; Check uploaded file</p>';
                self.spinner.hide(); 
            },
        	complete() { 
                console.log('Process Complete');
                self.spinner.hide();
            }
        });
    } // end buildMsp

}
