import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { read } from 'fs';
import { load } from 'ssf/types';
import { stringify } from 'querystring';

@Injectable({
    providedIn: 'root'
})
export class ReadSpreadsheetService{

    constructor() {}


    // Check array for column headers
    validateHeaders(headers: string[]): boolean {
        // validation
        return false;
    }


    // Get the line in the data that contains the headers
    getHeaderPosition(lines: string[][]): number {
        for (var i = 0; i < lines.length; i++) {
            if (this.validateHeaders(lines[i])) {
                return i;
            }
        }
        // The headers are incorrectly labeled
        return -1;
    }


    // Builds JSON array of dictionaries
    buildJsonArray(headers: string[], data: string[][]): any[] {
        return [];
    }


    // Create a string from a 2x2 array of MS/MS data
    buildMspStringFromJson(dataArray: any): string {
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


    // Create .msp file from an array of data
    buildMspFile(msmsArray: string[][], fileName: string) {
        var headerPosition = this.getHeaderPosition(msmsArray);
        if (headerPosition >= 0) {
            var headers = msmsArray[headerPosition];
            var data = msmsArray.slice(headerPosition + 1, msmsArray.length);
            var jsonObj = this.buildJsonArray(headers, data);
            var mspString = this.buildMspStringFromJson(jsonObj);
            var blob = new Blob([mspString], {type: "text/plain;charset=utf-8"});
            // User will be prompted to save a .msp for their data
            saveAs(blob, fileName.split(".")[0] + ".msp");
        } else {
            // throw error
        }
    }

    
    // Create .msp text file from a .csv file
    mspFromCsv(sheetData: FileList) {

        var reader = new FileReader();

        reader.addEventListener('load', (loadEvent) => {
            var target: FileReader = <FileReader>loadEvent.target;
            var msmsText: string = <string>target.result;
            var msmsArray: string[][] = msmsText.split("\n").map(line => line.split(","));
            var sheetName = sheetData[0].name;
            this.buildMspFile(msmsArray, sheetName);
        });

        if (sheetData[0]){
            reader.readAsText(sheetData[0]);
        }

    } // end mspFromCsv


    // Create .msp text file from an excel file
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

            //separateHeadersData(msmsArray)

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
