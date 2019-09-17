import * as XLSX from 'xlsx';

export class CompoundsService {

    getCompounds() : string[] {
        return ['1-Methyltryptophan', '2-Deoxycytidine', '2-Deoxyguanosine'];
    }

    getWrongCompounds() : string[] {
        return ['Cat', 'Dog', 'Parrot'];
    }

    printEventData(e) {
        console.log("moved target", e.target);

        var files = e.target.files, reader = new FileReader();

        reader.addEventListener('load', function (loadEvent) {

            // Explicit type declaration so that Angular won't throw an error
            var target = <FileReader>loadEvent.target;
            var data = target.result;
            var wb: XLSX.WorkBook = XLSX.read(data, { type: 'binary' });
            var jsonObj = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            console.log("6", jsonObj);
            console.log("7", jsonObj[0]);
            console.log("8", jsonObj[1]);
            // calling function to parse csv data 
        });

        if (files && files[0]) {
            var msms_ss = files[0];
            reader.readAsBinaryString(msms_ss);
        }
    }

}