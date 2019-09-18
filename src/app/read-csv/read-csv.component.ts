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
        // this.readCsvService.readFile(event).subscribe((value) => {
        //     console.log("Observable Attempt");
        // });
    }   

    ngOnInit() {
        this.compounds = [''];
        this.submitValid = false;
    }

    fileSelected(changeEvent: Event) {
        this.submitValid = true;
        var target = <HTMLInputElement>changeEvent.target;
        var files = target.files;

        // console.log("Type", typeof(files[0]));

        // if (files && files[0]) {
        //     var msms_ss = files[0];
        //     this.readCsvService.readFile(files);
        //     reader.readAsBinaryString(msms_ss);
        // }

        // this.compoundsService.printEventData(changeEvent);

        this.readCsvService.readFile(files);
        // lines = this.readCsvService.readFile(files);


        // var files = changeEvent.target.files, reader = new FileReader();

        

        // reader.addEventListener('load', function (loadEvent) {

        //     // Explicit type declaration so that Angular won't throw an error
        //     var target = <FileReader>loadEvent.target;
        //     var data = target.result;
        //     var wb: XLSX.WorkBook = XLSX.read(data, { type: 'binary' });
        //     var jsonObj = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        //     console.log("6", jsonObj);
        //     console.log("7", jsonObj[0]);
        //     console.log("8", jsonObj[1]);
        //     // calling function to parse csv data 
        // });

        // if (files && files[0]) {
        //     var msms_ss = files[0];
        //     reader.readAsBinaryString(msms_ss);
        // }
    }

    seeCompounds(clickEvent) {
        console.log(clickEvent);
        this.compounds = this.compoundsService.getCompounds();
    }

}