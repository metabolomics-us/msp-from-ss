import { Component, Input, OnInit } from '@angular/core';
import { ReadCsvService } from '../read-csv.service';

@Component({
    selector: 'read-csv',
    templateUrl: 'read-csv.component.html',
    styleUrls: ['read-csv.component.css'],
    providers: [ReadCsvService]
})

export class ReadCsvComponent implements OnInit{
    
    submitValid: boolean;
    errorText: string;
    files: FileList;

    constructor(private readCsvService: ReadCsvService) {}   

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
            this.readCsvService.makeMSP(this.files);
            this.submitValid = false;
        } else {
            this.errorText = "Select file before clicking 'Submit'";
        }
    }

}