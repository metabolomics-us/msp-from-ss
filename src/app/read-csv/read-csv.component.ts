import { Component, Input, OnInit } from '@angular/core';
import { CompoundsService } from './compounds.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'read-csv',
    templateUrl: 'read-csv.component.html',
    providers: [CompoundsService]
})

export class ReadCSVComponent implements OnInit{
    compounds: string[];
    isValid: boolean;

    constructor(compoundsService: CompoundsService) {
        //Testing out services
        this.compounds = compoundsService.getCompounds();
    }

    ngOnInit() {
        this.isValid = false;
    }

    fileSelected($event) {
        this.isValid = true;
        var files = $event.target.files, reader = new FileReader();

        reader.addEventListener('load', function (e) {

            // Explicit type declaration so that Angular won't throw an error
            var target = <FileReader>e.target;
            var data = target.result;
            var wb: XLSX.WorkBook = XLSX.read(data, { type: 'binary' });
            var jsonObj = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            console.log("6", jsonObj);
            console.log("7", jsonObj[0]);
            console.log("8", jsonObj[1]);
            // calling function to parse csv data 
        });

        if (files && files[0]) {
            var msms_ss = files[0];
            reader.readAsBinaryString(msms_ss);
        }
    }

}