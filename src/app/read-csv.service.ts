import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';

@Injectable({
    providedIn: 'root'
})
export class ReadCsvService {

    constructor() { }

    readFile(sheetData: FileList) {
    
      var reader = new FileReader();

      reader.addEventListener('load', function (loadEvent) {

          // Explicit type declaration so that Angular won't throw an error
          var target = <FileReader>loadEvent.target;
          var data = target.result;
          var wb: XLSX.WorkBook = XLSX.read(data, { type: 'binary' });
          // wb.Workbook.Sheets
          var jsonObj = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          var csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
          //Literally just turns it into a string
          // var jsonStr = JSON.stringify(jsonObj);
          console.log("6", jsonObj);
          console.log("7", jsonObj[0]);
          console.log("8", jsonObj[4]);
          console.log("9", csv);
          // console.log("10", jsonStr);
          // console.log("13", jsonStr[3]);
          // console.log("14", csv[0]);
          console.log("15", wb.Sheets[wb.SheetNames[0]]);
          console.log("15", wb.Sheets);

          
          // calling function to parse csv data 
      });

      if (sheetData[0]) {
        reader.readAsBinaryString(sheetData[0]);
      }

    }
}
