import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { element } from 'protractor';
import * as fs from 'file-saver';
import { read } from 'fs';
import { type } from 'os';

@Injectable({
    providedIn: 'root'
})
export class ReadCsvService{

    constructor() { }

    buildMSPString(dataArray: any) {
        var spectrum: string[];
        var mspString: string = "";
        dataArray.forEach((element:any) => {
            mspString += 
            "Name: " + element["Metabolite name"] + "\n" +
            "InChIKey: " + element["INCHIKEY"] + "\n" +
            "Precursor Type: " + element["Adduct type"] + "\n" +
            "Precursor Mz: " + element["Average Mz"] + "\n" +
            "Retention Time: " + element["Average Rt(min)"] + "\n" +
            "Formula: " + element["Formula"] + "\n";
            spectrum = element["MS/MS spectrum"].split(" ");
            mspString += "Num Peaks: " + spectrum.length.toString() + "\n";
            spectrum.forEach(massIntensity => {
                mspString += massIntensity.replace(":", " ") + "\n";
            });
            mspString = mspString + "\n\n";
        });
        return mspString;
    }

    makeMSP(sheetData: FileList) {

        var reader = new FileReader();

        // reader.addEventListener('error', function() {
        //     console.log("error");
        // });

        reader.addEventListener('load', (loadEvent) => {

            // Explicit type declaration so that Angular won't throw an error
            var target: FileReader = <FileReader>loadEvent.target;
            var wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });
            var msmsArray: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});

            console.log(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]).split("\n")[4]);

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

            var blob = new Blob([this.buildMSPString(msmsArrayHeaders)], {type: "text/plain;charset=utf-8"});
            // Why does this line remove all console logs? What does saveAs do here?
            fs.saveAs(blob, sheetData[0].name.split(".")[0] + ".msp");

        });
      
        if (sheetData[0]) {
            // var nameElements = sheetData[0].name.split(".");
            // console.log("SD: ", nameElements[nameElements.length - 1]);
            reader.readAsBinaryString(sheetData[0]);
        }

    }
  
}
