import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DownloadSpreadsheetService {
    
    constructor() { }

    downloadSpreadsheet() {
        var reader = new FileReader();
    }
}
