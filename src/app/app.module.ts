import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component'; 

@NgModule({
    declarations: [
        AppComponent, ReadSpreadsheetComponent
    ],
    imports: [
        BrowserModule, AppRoutingModule
    ],
    providers: [],
    bootstrap: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
