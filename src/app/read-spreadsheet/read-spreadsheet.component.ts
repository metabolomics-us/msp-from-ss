import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';

import { ReadSpreadsheetService } from '../read-spreadsheet-service/read-spreadsheet.service';
import { DownloadFileService } from '../download-file-service/download-file.service';
import { BuildMspService, MspSourceFormat } from '../build-msp-service/build-msp.service';
import { HeaderMapping } from '../header-mapping-service/header-mapping.service';

import { Subscription } from 'rxjs';
import { timeout, take } from 'rxjs/operators';

@Component({
    selector: 'app-read-spreadsheet',
    templateUrl: 'read-spreadsheet.component.html',
    styleUrls: ['read-spreadsheet.component.css'],
    // ReadSpreadsheetService is providedIn: 'root' and stateless; not re-provided here so that
    // this component and its tests (TestBed.inject) share the same singleton instance
    providers: [DownloadFileService, BuildMspService],
    // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- app is NgModule-based with mutable state read across change cycles; switching to OnPush needs its own verification pass
    changeDetection: ChangeDetectionStrategy.Eager,
    // eslint-disable-next-line @angular-eslint/prefer-standalone -- whole app is NgModule-based (AppModule/bootstrapModule); converting to standalone is a dedicated migration, not part of this ESLint setup task
    standalone: false
})

export class ReadSpreadsheetComponent implements OnInit, OnDestroy {
    
    submitValid: boolean;
    parsing: boolean;
    files: FileList;
    fileName: string;
    fileNameText: string;
    parseSubscription: Subscription;
    cachedMsmsArray: string[][] | null;
    headerMappings: HeaderMapping[];
    currentFormat: MspSourceFormat;
    targetInput: HTMLInputElement;

    showCorrect: boolean;
    showWrong: boolean;
    showErrorBox: boolean;
    showErrorFile: boolean;
    showNotes: boolean;
    showMappingPanel: boolean;
    mspKeys: string[];

    errorText: string;

    notesText: string;
    placeHolderText: string;
    
    private readonly readSpreadsheetService = inject(ReadSpreadsheetService);
    private readonly downloadFileService = inject(DownloadFileService);
    readonly buildMspService = inject(BuildMspService);


	ngOnInit() {
        this.files = null;
        this.updateErrorText('', false);
        this.showWrong = false;
        this.showCorrect = false;
        this.fileNameText = 'Click \'Browse\' to choose a spreadsheet';
        // Submit button disabled
        this.submitValid = false;
        this.parsing = false;
        this.showNotes = false;
        this.showMappingPanel = true;
        this.mspKeys = this.buildMspService.mspTags;

        this.notesText = "";
        this.placeHolderText = "Include optional data such as: submitter name, submitter organization, column measurements, etc.";
        this.cachedMsmsArray = null;
        this.headerMappings = [];
    }


    ngOnDestroy() {
        if (this.parseSubscription) {
            this.parseSubscription.unsubscribe();
        }
    }


    getTextFromTextArea(changeEvent: Event) {
        const textArea = changeEvent.target as HTMLInputElement;
        this.notesText = textArea.value;
    }


	// User downloads an example MSMS spreadsheet or .msp file
	downloadExample(mouseEvent: Event) {
		// Get the DOM element, get its name, turn the name into the file name to download
		//  i.e. <a name='example_msp-txt' ...> => example_msp.txt
		const target = mouseEvent.target as HTMLAnchorElement;
		this.downloadFileService.downloadFile('../assets/files-to-read/', target.name.replace('-', '.'));
    }
    

    showNotesTextArea() {
        this.showNotes = !this.showNotes;
    }


    showMappingPanelToggle() {
        this.showMappingPanel = !this.showMappingPanel;
    }


    get visibleHeaderMappings(): HeaderMapping[] {
        return this.headerMappings.filter(mapping => !mapping.isSample);
    }


    updateMapping(mapping: HeaderMapping, value: string) {
        if (value === 'ignore') {
            mapping.action = 'ignore';
            mapping.targetKey = null;
        } else if (value === 'comment') {
            mapping.action = 'comment';
            mapping.targetKey = null;
        } else {
            mapping.action = 'map';
            mapping.targetKey = value;
        }
    }


	// Called when user selects spreadsheet to be turned into a .msp
	fileSelected(changeEvent: Event) {
        this.targetInput = changeEvent.target as HTMLInputElement;

        if (this.targetInput.files.length > 0) {
            // Store selected file
            this.fileName = this.targetInput.files[0].name;
            this.fileNameText = this.fileName;

            // Check for proper file type
            if (/\.(xlsx|csv|xls|ods|numbers|txt)$/g.test(this.fileNameText)) {
                this.files = this.targetInput.files;
                // Submit button can now be clicked
                this.submitValid = true;
                this.updateErrorText('', false);
                this.showCorrectImage(true);
                this.parseSelectedFile();
            } else {
                this.files = null;
                // Submit button greyed out
                this.submitValid = false;
                this.cachedMsmsArray = null;
                this.headerMappings = [];
                this.updateErrorText('Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers, .txt', false);
                this.showCorrectImage(false);
            }
        }
	}


	// Eagerly parse the selected file so the mapping panel has real headers before Submit
	parseSelectedFile() {
        // Cancel any still-in-flight parse from a previous file selection so its (now-stale)
        // result can never land after this selection's result and overwrite it (I1).
        if (this.parseSubscription) {
            this.parseSubscription.unsubscribe();
        }

        this.parsing = true;

        this.currentFormat = /\.txt$/g.test(this.fileNameText) ? 'msdial' : 'spreadsheet';
        const readObservable = this.currentFormat === 'msdial'
            ? this.readSpreadsheetService.readAlignmentResultTxt(this.files)
            : this.readSpreadsheetService.readXlsx(this.files);

        this.parseSubscription = readObservable.pipe(take(1), timeout(10000)).subscribe({
            next: (msmsArray: string[][]) => {
                this.cachedMsmsArray = msmsArray;
                const headerPosition = this.buildMspService.getHeaderPosition(msmsArray);
                if (headerPosition >= 0) {
                    const headers = this.buildMspService.normalizeHeaderRow(msmsArray[headerPosition], this.currentFormat);
                    this.headerMappings = this.buildMspService.classifyHeaders(headers);
                } else {
                    this.headerMappings = [];
                }
                this.parsing = false;
            },
            error: () => {
                // Submit's existing error path (via buildMsp) surfaces the real error to the user
                this.cachedMsmsArray = null;
                this.headerMappings = [];
                this.parsing = false;
            }
        });
    }


	// Called when the user submits their spreadsheet
	readFile() {
		if (this.files) {
            if (this.cachedMsmsArray) {
                this.updateErrorText('', false);
                this.buildMsp(this.fileNameText, this.notesText.trim(), this.currentFormat);
            } else {
                this.updateErrorText('Error: file may be corrupted or may not exist', false);
                this.showCorrectImage(false);
                this.fileNameText = 'Click \'Browse\' to choose a spreadsheet';
            }
		} else {
            this.updateErrorText('Select file before clicking \'Submit\'', false);
            this.showCorrectImage(false);
        }
        this.submitValid = false;
        this.targetInput.value = null;
    }


    // Create .msp from the cached 2x2 array and/or get error descriptions
    buildMsp(name: string, notes: string, format: MspSourceFormat) {
        const errorData = this.buildMspService.buildMspFile(this.cachedMsmsArray, name, notes, format, this.headerMappings);
        if (errorData.length === 0 && this.buildMspService.missingData.length === 0 && this.buildMspService.duplicates.length === 0) {
            this.fileNameText = '.msp created';
            this.showCorrectImage(true);
        } else if (errorData.length > 0 && (this.buildMspService.missingData.length > 0 || this.buildMspService.duplicates.length > 0)) {
            this.fileNameText = '.msp created with some issues';
            this.showCorrectImage(true);
            this.updateErrorText(errorData, true);
        } else {
            this.fileNameText = 'Fix errors, then retry upload';
            this.showCorrectImage(false);
            this.updateErrorText(errorData, false);
        }
    } // end buildMsp


    // Download a file detailing spreadsheet errors for the user to fix
    getErrorFile() {
        this.buildMspService.saveErrorFile('error_file_' + this.fileName.split('.')[0] + '.txt');
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
