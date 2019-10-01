import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
//   title: string;
  title = 'Read-Spreadsheet';

  constructor() {}

  ngOnInit() {
    //   this.title = 'Read-Spreadsheet';
  }
}