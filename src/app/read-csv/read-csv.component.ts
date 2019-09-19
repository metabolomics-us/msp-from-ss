import { Component, Input, OnInit } from '@angular/core';
import { CompoundsService } from '../compounds.service';
import { ReadCsvService } from '../read-csv.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'read-csv',
    templateUrl: 'read-csv.component.html',  
    providers: [CompoundsService, ReadCsvService]
})

export class ReadCsvComponent implements OnInit{
    compounds: string[];
    submitValid: boolean;

    lines: any[];

    constructor(private compoundsService: CompoundsService, private readCsvService: ReadCsvService) {
        console.log("Constructor");
    }   

    ngOnInit() {
        this.compounds = [''];
        this.submitValid = false;
    }

    fileSelected(changeEvent: Event) {
        this.submitValid = true;
        var target = <HTMLInputElement>changeEvent.target;
        var files = target.files;

        this.readCsvService.readFile(files);
        
    }

    seeCompounds(clickEvent) {
        console.log(clickEvent);
        this.compounds = this.compoundsService.getCompounds();
    }

}