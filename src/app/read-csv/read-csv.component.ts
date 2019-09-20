import { Component, Input, OnInit } from '@angular/core';
import { ReadCsvService } from '../read-csv.service';

@Component({
    selector: 'read-csv',
    templateUrl: 'read-csv.component.html',  
    providers: [ReadCsvService]
})

export class ReadCsvComponent implements OnInit{
    
    submitValid: boolean;
    lines: any[];

    constructor(private readCsvService: ReadCsvService) {}   

    ngOnInit() {
        this.submitValid = false;
    }

    fileSelected(changeEvent: Event) {
        this.submitValid = true;
        var target = <HTMLInputElement>changeEvent.target;
        var files = target.files;

        this.readCsvService.readFile(files);
    }

}