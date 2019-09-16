
export class CompoundsService {

    getCompounds() : string[] {
        return ['1-Methyltryptophan', '2-Deoxycytidine', '2-Deoxyguanosine'];
    }

    getWrongCompounds() : string[] {
        return ['Cat', 'Dog', 'Parrot'];
    }

}