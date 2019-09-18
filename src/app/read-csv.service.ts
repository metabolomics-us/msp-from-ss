import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import { Series, DataFrame } from 'pandas-js';
import { element } from 'protractor';
import * as d3 from 'd3';

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
        // console.log("mAH", msmsArrayHeaders);
        msmsArrayHeaders.forEach(element => {
          console.log(element["Metabolite name"])
        });
      });

      if (sheetData[0]) {
        reader.readAsBinaryString(sheetData[0]);
      }

    }
}
