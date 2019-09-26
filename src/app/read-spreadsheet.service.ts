import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { read } from 'fs';

@Injectable({
    providedIn: 'root'
})
export class ReadSpreadsheetService{

    constructor() { }

    // Create a string from a 2x2 array of MS/MS data
    buildMspStringFromJson(dataArray: any) {
        // Initialize string to be returned
        var mspString: string = "";

        // A list of mass and intensity for each peak
        var spectrum: string[];

        // Traverse each row of dataArray and build mspString
        //  Each row represents data for one metabolite
        dataArray.forEach((element:any) => {
            mspString += 
            "Name: " + element["Metabolite name"] + "\n" +
            "InChIKey: " + element["INCHIKEY"] + "\n" +
            "Precursor Type: " + element["Adduct type"] + "\n" +
            "Precursor Mz: " + element["Average Mz"] + "\n" +
            "Retention Time: " + element["Average Rt(min)"] + "\n" +
            "Formula: " + element["Formula"] + "\n";

            // Create array of mass/intensity peaks to be written into the string line by line
            spectrum = element["MS/MS spectrum"].split(" ");
            mspString += "Num Peaks: " + spectrum.length.toString() + "\n";
            spectrum.forEach(massIntensity => {
                mspString += massIntensity.replace(":", " ") + "\n";
            });
            mspString = mspString + "\n\n";
        });
        return mspString;

    } // end buildMspStringFromJson


    mspFromCsv() {

    } // end mspFromCsv


    // Create .msp from an excel file
    mspFromXlsx(sheetData: FileList) {

        var reader = new FileReader();

        // Create callback function for when the excel file has been loaded by the FileReader()
        reader.addEventListener('load', (loadEvent) => {

            // <FileReader> - explicit type declaration so that Angular won't throw an error
            var target: FileReader = <FileReader>loadEvent.target;
            var wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });

            // Convert spreadsheet data to JSON data
            // Using header:1 will generate an array of arrays that we will traverse to find column headers
            var msmsArray: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});

            // In the test spreadsheet, the column names weren't the top line; find them and store them
            //  as column headers
            var headers: string[];
            var i: number;
            for (i = 0; i < msmsArray.length; i++) {
                if (msmsArray[i][0]) {
                    headers = <any>msmsArray[i];
                    break;
                }
            }

            // Exclude any empty rows at the beginning of the spreadsheet by resetting its range
            // !ref accesses the default range of the spreadsheet
            var range = XLSX.utils.decode_range(wb.Sheets[wb.SheetNames[0]]['!ref']);
            range.s.r = i + 1;
            var newRange = XLSX.utils.encode_range(range);

            // Create a new array of arrays with the proper column headers and range
            var msmsArrayHeaders = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:headers, range:newRange});

            // Create a string of the data to be written into a .msp file using buildMspStringFromJson()
            //  Create a blob from the resulting string
            var blob = new Blob([this.buildMspStringFromJson(msmsArrayHeaders)], {type: "text/plain;charset=utf-8"});
            
            // User will be prompted to save a .msp for their data
            saveAs(blob, sheetData[0].name.split(".")[0] + ".msp");
        });
      
        if (sheetData[0]) {
            // Read the excel file and execute callback function from addEventListener
            reader.readAsBinaryString(sheetData[0]);
        }

    } // end mspFromXlsx
  
}
