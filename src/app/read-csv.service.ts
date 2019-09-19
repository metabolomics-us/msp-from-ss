import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { element } from 'protractor';

@Injectable({
    providedIn: 'root'
})
export class ReadCsvService {

    constructor() { }

    readFile(sheetData: FileList) {
    
      var reader = new FileReader();

      reader.addEventListener('load', function (loadEvent) {
        // Explicit type declaration so that Angular won't throw an error
        var target: FileReader = <FileReader>loadEvent.target;
        var wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });
        var msmsArray: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
        var headers: string[];
        var i: number;
        for (i = 0; i < msmsArray.length; i++) {
          if (msmsArray[i][0]) {
            headers = <any>msmsArray[i];
            break;
          }
        }
        // !ref means default
        var range = XLSX.utils.decode_range(wb.Sheets[wb.SheetNames[0]]['!ref']);
        range.s.r = i + 1;
        var newRange = XLSX.utils.encode_range(range);
        var msmsArrayHeaders = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:headers, range:newRange});
        
        var strData: string = "";
        msmsArrayHeaders.forEach(element => {
          strData = strData + 
            "Name: " + element["Metabolite name"] + '\n' +
            "PrecursorMZ: " + element["Average Mz"] + '\n' +
            "Precursor_type: " + element["Adduct type"]  + '\n' +
            "\n\n";
          // console.log(element["Metabolite name"])
        });

        // Doesn't work, now Function in FileReader called mspFromJson()
        // this.mspFromJson();

        var FileSaver = require('file-saver');
        var blob = new Blob([strData], {type: "text/plain;charset=utf-8"});
        FileSaver.saveAs(blob, "test.msp");

      });

      if (sheetData[0]) {
        reader.readAsBinaryString(sheetData[0]);
      }

    }

    
}
