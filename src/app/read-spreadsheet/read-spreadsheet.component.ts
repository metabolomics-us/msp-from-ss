import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ReadSpreadsheetService } from '../read-spreadsheet.service';
import { DownloadSpreadsheetService } from '../download-spreadsheet.service';

@Component({
    selector: 'read-spreadsheet',
    templateUrl: 'read-spreadsheet.component.html',
    styleUrls: ['read-spreadsheet.component.css'],
    providers: [ReadSpreadsheetService, DownloadSpreadsheetService]
})

export class ReadSpreadsheetComponent implements OnInit{
    
    submitValid: boolean;
    errorText: string;
    files: FileList;

    randomObj: any;

    // fileInput:HTMLInputElement;

    constructor(private readSpreadsheetService: ReadSpreadsheetService, downloadSpreadsheetService: DownloadSpreadsheetService) {}   

    ngOnInit() {
        this.submitValid = false;
        this.errorText = "";

        this.randomObj = fetch("../../../files-to-read/example_spreadsheet_large.xlsx");

        // this.fileInput = <HTMLInputElement>document.getElementById("fileInput");
    }

    // getExampleSpreadsheet(clickEvent: Event) {
    //     var target = <HTMLAnchorElement>clickEvent.target;
    //     if (target.id == "exampleLarge") console.log("Large");
    //     if (target.id == "exampleSmall") console.log("Small");
    // }

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

        // Why would this line throw everything off??
        // this.fileInput.value = "";
    }

}