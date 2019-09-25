import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component'

@NgModule({
  declarations: [
    AppComponent, ReadSpreadsheetComponent
  ],
  imports: [
    BrowserModule, AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
