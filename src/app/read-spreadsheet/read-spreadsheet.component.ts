import { Component, OnInit, OnDestroy } from '@angular/core';

import { ReadSpreadsheetService } from '../read-spreadsheet-service/read-spreadsheet.service';
import { DownloadFileService } from '../download-file-service/download-file.service';
import { BuildMspService } from '../build-msp-service/build-msp.service';
import { NgxSpinnerService } from 'ngx-spinner';

import { Observable, Subscription } from 'rxjs';
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

    showCorrect: boolean;
    showWrong: boolean;
    showErrorBox: boolean;
    showErrorFile: boolean;

    errorText: string;
    
    constructor(
		private readSpreadsheetService: ReadSpreadsheetService,
		private downloadFileService: DownloadFileService,
        private buildMspService: BuildMspService,
        private spinner: NgxSpinnerService) {}

	ngOnInit() {
        this.files = null;
        this.updateErrorText('', false);
        this.showWrong = false;
        this.showCorrect = false;
        this.fileNameText = 'Click \'Browse\' to choose a spreadsheet';
        // Submit button disabled
		this.submitValid = false;
        this.spinner.hide();
    }

    
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
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
        // console.log('file selected');
        this.targetInput = changeEvent.target as HTMLInputElement;

        if (this.targetInput.files.length > 0) {
            // Store selected file
            
            this.fileNameText = this.targetInput.files[0].name;

            // Check for proper file type
            if (/\.(xlsx|csv|xls|ods|numbers)$/g.test(this.fileNameText)) {
                this.files = this.targetInput.files;
                // Submit button can now be clicked
                this.submitValid = true;
                this.updateErrorText('', false);
                this.showCorrectImage(true);
            } else {
                this.files = null;
                // Submit button greyed out
                this.submitValid = false;
                this.updateErrorText('Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers', false);
                this.showCorrectImage(false);
            }
        } 
	}


	// Called when the user submits their spreadsheet
	readFile() {
		// If the user has chosen a file, create .msp
		if (this.files) {
            this.spinner.show();

            // Check for proper file type
            // Call readXlsx or readCsv depending on type of file submitted
            // Get Observable that converts spreadsheet into 2x2 array
			if (/\.(xlsx|csv|xls|ods|numbers)$/g.test(this.fileNameText)) {
                this.updateErrorText('', false);                
                // Get observable which converts .xlsx into array
                this.observable$ = this.readSpreadsheetService.readXlsx(this.files);
                this.buildMsp(this.fileNameText);
			} else {
                this.updateErrorText('Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers', false);
                this.showCorrectImage(false);
                this.fileNameText = 'Click \'Browse\' to choose a spreadsheet';
                this.spinner.hide();
			}

		} else {
            this.updateErrorText('Select file before clicking \'Submit\'', false);
            this.showCorrectImage(false);
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

        // take(1) means the observable will unsubscribe after one execution; prevents memory leaks
        //  Times out if unable to read and parse spreadsheet in 10 seconds
        this.subscription = this.observable$.pipe(take(1),timeout(10000)).subscribe({
        	next(msmsArray) {
                let errorData = '';
                // Create .msp file and display any error test
                errorData = self.buildMspService.buildMspFile(msmsArray, name);
        		if (errorData.length === 0 && self.buildMspService.missingData.length === 0 && self.buildMspService.duplicates.length === 0) {
                    self.fileNameText = '.msp created';
                    self.showCorrectImage(true);
                } else if (errorData.length > 0 && (self.buildMspService.missingData.length > 0 || self.buildMspService.duplicates.length > 0)) {
                    self.fileNameText = '.msp created with some issues';
                    self.showCorrectImage(true);
                    self.updateErrorText(errorData, true);
                } else {
                    self.fileNameText = 'Fix errors, then retry upload';
                    self.showCorrectImage(false);
                    self.updateErrorText(errorData, false);
                }
                self.spinner.hide();
        	},
        	error(err) { 
                // Display error in case of timeout
                self.updateErrorText(err + '; Check uploaded file', false)
                self.showCorrectImage(false);
                self.spinner.hide(); 
            },
        	complete() { 
                console.log('Process Complete');
                self.spinner.hide();
            }
        });
    } // end buildMsp


    getErrorFile() {
        this.buildMspService.saveErrorFile('errors.txt');
    }


    // Alert the user of any errors; hide error text otherwise
    updateErrorText(errText: string, showFile: boolean) {
        // If error text exists, tell the user
        this.showErrorBox = (errText ? true : false);
        this.errorText = errText;
        // Allow user to download error file if one exists
        this.showErrorFile = showFile;
    }


    // Show appropriate image after a user action
    showCorrectImage(correct: boolean) {
        this.showCorrect = correct;
        this.showWrong = !correct;
    }

}
