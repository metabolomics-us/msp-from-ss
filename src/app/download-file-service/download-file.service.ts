import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class DownloadFileService {

	// Download a file from a path location and file name
	downloadFile(path: string, fileName: string) {
		// Create and click an anchor tag that will download the file
		const dummyLink = document.createElement('a');
		dummyLink.href = path + fileName;
		dummyLink.target = '_blank';
		dummyLink.download = fileName;
		dummyLink.click();
	}

	// Anchor `name` attributes encode the target file as e.g. 'example_msp-txt', with a dash
	//  standing in for the extension's period (see the calling template's comment for why);
	//  this method owns that decoding so it isn't split between a component method and an HTML comment.
	downloadExampleFile(anchorName: string) {
		this.downloadFile('../assets/files-to-read/', anchorName.replace('-', '.'));
	}
}
