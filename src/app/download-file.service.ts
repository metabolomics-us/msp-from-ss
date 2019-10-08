import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DownloadFileService {

    constructor() { }

    // Download a file from a path location
    downloadFile(path: string, fileName: string) {
        // Create, click, and then remove a dummy anchor tag that will download the file
        const dummyLink = document.createElement('a');
        dummyLink.href = path + fileName;
        dummyLink.target = '_blank';
        dummyLink.download = fileName;
        dummyLink.click();
        dummyLink.remove();
    }
}
