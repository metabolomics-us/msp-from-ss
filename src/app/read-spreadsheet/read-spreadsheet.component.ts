import { Component, OnInit } from '@angular/core';
import { ReadSpreadsheetService } from '../read-spreadsheet.service';

@Component({
    selector: 'read-spreadsheet',
    templateUrl: 'read-spreadsheet.component.html',
    styleUrls: ['read-spreadsheet.component.css'],
    providers: [ReadSpreadsheetService]
})

export class ReadSpreadsheetComponent implements OnInit{
    
    submitValid: boolean;
    errorText: string;
    files: FileList;

    constructor(private readSpreadsheetService: ReadSpreadsheetService) {}   

    ngOnInit() {
        // Submit button disabled
        this.submitValid = false;

        this.errorText = "";
    }

    // Called when user selects spreadsheet to be turned into a .msp
    fileSelected(changeEvent: Event) {
        var target = <HTMLInputElement>changeEvent.target;

        // Submit button can now be clicked
        this.submitValid = true;
        // Store selected file
        this.files = target.files;
    }

    // Called when the user submits their spreadsheet
    readFile() {
        // If the user has chosen a file, create .msp with ReadSpreadsheetService
        // Otherwise, throw an error
        if (this.files) {

            // Process either excel or csv spreadsheet
            var nameElements = this.files[0].name.split(".");
            if (nameElements[1] == "xlsx") this.readSpreadsheetService.mspFromXlsx(this.files);
            else if (nameElements[1] == "csv") this.readSpreadsheetService.mspFromCsv();

            //Disable the Submit button
            this.submitValid = false;
            
        } else {
            this.errorText = "Select file before clicking 'Submit'";
        }
    }

}