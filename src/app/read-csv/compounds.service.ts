// import { read } from 'fs';

export class CompoundsService {

    reader = new FileReader();
    // fname = new File();

    // testMe() {
    //     this.reader.readAsBinaryString();
    // }

    getCompounds() : string[] {
        return ['1-Methyltryptophan', '2-Deoxycytidine', '2-Deoxyguanosine'];
    }

    getWrongCompounds() : string[] {
        return ['Cat', 'Dog', 'Parrot'];
    }

}