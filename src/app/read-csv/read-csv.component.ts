import { Component, Input, OnInit } from '@angular/core';
import { ReadCsvService } from '../read-csv.service';

@Component({
    selector: 'read-csv',
    templateUrl: 'read-csv.component.html',  
    providers: [ReadCsvService]
})

export class ReadCsvComponent implements OnInit{
    
    submitValid: boolean;
    files: FileList;

    constructor(private readCsvService: ReadCsvService) {}   

    ngOnInit() {
        this.submitValid = false;
    }

    fileSelected(changeEvent: Event) {
        var target = <HTMLInputElement>changeEvent.target;

        this.submitValid = true;
        this.files = target.files; 
    }

    readFile() {
        this.readCsvService.makeMSP(this.files);
    }

}