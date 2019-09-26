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
        this.submitValid = false;
        this.errorText = "";
    }

    fileSelected(changeEvent: Event) {
        var target = <HTMLInputElement>changeEvent.target;
        this.submitValid = true;
        this.files = target.files;
    }

    readFile() {

        if (this.files) {

            var nameElements = this.files[0].name.split(".");
            if (nameElements[1] == "xlsx") this.readSpreadsheetService.mspFromXlsx(this.files);
            else if (nameElements[1] == "csv") this.readSpreadsheetService.mspFromCsv();
            this.submitValid = false;
            
        } else {
            this.errorText = "Select file before clicking 'Submit'";
        }
    }

}