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


    // Builds JSON array of dictionaries
    buildJsonArray(headers: string[], data: string[][]): any[] {

        var i: number, j: number, dict: any = {}, jObj: any = [];
        // Building a dictionary with headers as the keys and data as the values
        for (i = 0; i < data.length; i++) {
            dict = {};
            for (j = 0; j < headers.length; j++) {
                dict[headers[j]] = data[i][j];
            }
            // Create a JSON object of dictionaries
            jObj.push(dict);
        }
        return jObj;
    }


    // Check array for column headers
    validateHeaders(line: any[]): boolean {

        // List of necessary columns as uppercase strings
        const cols = ["AVERAGE RT(MIN)", "AVERAGE MZ", "METABOLITE NAME", "ADDUCT TYPE", 
        "FORMULA", "INCHIKEY", "MS1 ISOTOPIC SPECTRUM", "MS/MS SPECTRUM"];
        // Format the line of data from the MS/MS spreadsheet to be similar to that of cols
        //  i.e. all uppercase strings
        const formattedLine = line.map(x => String(x).toUpperCase());

        // Check if the line contains all necessary columns; return false if a column is missing
        //  This is apparently asynchronous, though Google tells me foreach loops are not...wtf
        // cols.forEach((col: string) => {
        //     if (!formattedLine.includes(col)) {
        //         return false;
        //     }
        // });

        var i: number;
        for (i = 0; i < cols.length; i ++) {
            if (!formattedLine.includes(cols[i])) {
                return false;
            }
        }
        return true;
    }


    // Some MS/MS data spreadsheets do not have their headers as the first row
    //  Get the line in the MS data spreadsheet that contains the headers
    getHeaderPosition(lines: string[][]): number {

        console.log("3");

        // Iterate through the lines of data for the column headers
        for (var i = 0; i < lines.length; i++) {
            if (this.validateHeaders(lines[i])) {
                return i;
            }
        }
        // The headers are incorrectly labeled
        return -1;
    }


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

        // Create callback function for when the excel file has been loaded by the FileReader()
        reader.addEventListener('load', (loadEvent) => {
            // <FileReader> - explicit type declaration so that Angular won't throw an error
            var target: FileReader = <FileReader>loadEvent.target;
            var msmsText: string = <string>target.result;
            msmsText = msmsText.trim();
            // Turn the string of data into a 2x2 array
            var msmsArray: string[][] = msmsText.split("\n").map(line => line.split(","));

            var sheetName = sheetData[0].name;
            this.buildMspFile(msmsArray, sheetName);
        });

        if (sheetData[0]){
            // Read the excel file and execute callback function from addEventListener
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
            // Using header:1 will generate a 2x2 array
            var msmsArray: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
            var sheetName = sheetData[0].name;

            this.buildMspFile(msmsArray, sheetName);
        });
      
        if (sheetData[0]) {
            // Read the excel file and execute callback function from addEventListener
            reader.readAsBinaryString(sheetData[0]);
        }

    } // end mspFromXlsx
  
}
