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
        var target = <FileReader>loadEvent.target;
        var data = target.result;
        var wb: XLSX.WorkBook = XLSX.read(data, { type: 'binary' });
        // wb.Workbook.Sheets
        var jsonObj = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        var csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        var jsonObjArray = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
        //Literally just turns it into a string
        // var jsonStr = JSON.stringify(jsonObj);
        // console.log("0", sheetData);
        // console.log("1", sheetData[0]);
        // console.log("6", jsonObj);
        // console.log("7", jsonObj[0]);
        // console.log("7", XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1}));

        // console.log("8", jsonObj[3]["__EMPTY_3"]);

        //Looks like this turns it into a string w/commas
        console.log("9", csv);
        // console.log("10", jsonStr);
        // console.log("13", jsonStr[3]);
        // console.log("14", csv[0]);
        // console.log("15", wb.Sheets[wb.SheetNames[0]]);
        // console.log("16", wb.Sheets);
        console.log("10", jsonObj.length);

        // Testing out pandas-js, get an error about the index length not matching the data length when making new DataFrame
        // Series seems to work ok, though
        // console.log("11", jsonObjArray[4][3]);
        // var df = new DataFrame(jsonObjArray);
        // console.log("12", df);
        // var ser = new Series(jsonObjArray[4]);
        // console.log("11", ser.toString());
        // console.log("12", ser.toString()[3]);

        jsonObjArray.forEach((element: any[]) => {
          if (element[0]) {
            console.log("Yes");
          } else {
            console.log("No");
          }
          console.log("Element: ", element);
          console.log("Length: ", element.length);
        });

        // Throws error
        // console.log("17", XLSX.readFile("../../files-to-read/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.xlsx"));
        
        
          // calling function to parse csv data 
      });

      if (sheetData[0]) {
        reader.readAsBinaryString(sheetData[0]);
      }

    }
}
