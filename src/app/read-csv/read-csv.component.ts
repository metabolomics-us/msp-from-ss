import { Component, Input } from '@angular/core';
import { CompoundsService } from './compounds.service';
import { ReadCSVService } from './read-csv.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'read-csv',
    templateUrl: 'read-csv.component.html',
    providers: [CompoundsService, ReadCSVService]
})

export class ReadCSVComponent{
    compounds: string[];
    private readCSVService: ReadCSVService;
    blurText: string;
    isValid: boolean;

    constructor(compoundsService: CompoundsService) {
        this.compounds = compoundsService.getCompounds();
        this.blurText = "";
        this.isValid = false;
    }

    fileChanged($event) {
        this.isValid = true;
        console.log("1", <HTMLInputElement>$event);
        // Note that the line below did not work for a 'load' event; got this: "ERROR in src/app/read-csv/read-csv.component.ts(40,34): error TS2339: Property 'relatedTarget' does not exist on type 'ProgressEvent'"
        console.log("1.1", $event.relatedTarget);
        console.log("2", $event.target);
        var files = $event.target.files;
        var reader = new FileReader();

        reader.addEventListener('load', function (e) {

            // Explicit type declaration so that Angular won't throw an error
            var target = <FileReader>e.target;
            // This line is equivalent to the one above
            // var target = e.target as FileReader;
            var data = target.result;
            
            var wb: XLSX.WorkBook = XLSX.read(data, { type: 'binary' });

            console.log("0", target);
            console.log("1", wb);
            console.log("2", wb.SheetNames);
            console.log("3", wb.SheetNames[0]);
            console.log("4", wb[0]);
            // console.log(wb.Strings);

            console.log("5", XLSX.utils.sheet_to_txt(wb.Sheets[wb.SheetNames[0]]));

            var jsonObj = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            console.log("6", jsonObj);

            console.log("7", jsonObj[0]);
            console.log("8", jsonObj[1]);

            // var testObj = XLSX.utils.sheet_to_row_object_array(wb.Sheets[wb.SheetNames[0]]);
            // XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

            // console.log("4", $event);
            // console.log("5", $event.target);
            // console.log("6", <FileReader>e.target);
            // console.log("7", reader.result);
            // console.log("8", target.result);
            // Error in the terminal window, but doesn't seem to affect performance
            // console.log("7", $event.target.result);
            
            // let csvdata = $event.target.result; 
            // console.log(csvdata);
            // parseCsv.getParsecsvdata(csvdata); // calling function for parse csv data 
        });

        if (files && files[0]) {
            console.log("You're on your way!");
            var msms_ss = files[0];
            reader.readAsBinaryString(msms_ss);
            // reader.readAsText(msms_ss);
        }
    }

    showBlurText() {
        this.blurText = "Blurred";
    }

    showFocusText() {
        this.blurText = "Focused";
    }

    clickMe($event) {
        console.log($event.target);
    }
}