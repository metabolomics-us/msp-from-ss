import { async, ComponentFixture, TestBed } from '@angular/core/testing';

// Doesn't seem to fix problem of Template parse errors
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ReadSpreadsheetComponent } from './read-spreadsheet.component';

describe('ReadSpreadsheetComponent', () => {
  let component: ReadSpreadsheetComponent;
  let fixture: ComponentFixture<ReadSpreadsheetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReadSpreadsheetComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReadSpreadsheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
