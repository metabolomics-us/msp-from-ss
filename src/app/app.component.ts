import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- app has mutable state read across change cycles; switching to OnPush needs its own verification pass
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [MatToolbarModule, ReadSpreadsheetComponent]
})
export class AppComponent {
  title = 'MSP Creator';
}
