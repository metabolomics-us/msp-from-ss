import { Component, OnInit } from '@angular/core';
import { ThemeService } from './theme-service/theme.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit {
  title = 'Read-Spreadsheet';

  constructor(public themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.initTheme();
  }
}
