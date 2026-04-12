import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OPDRegister } from './opd-register';

describe('OPDRegister', () => {
  let component: OPDRegister;
  let fixture: ComponentFixture<OPDRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OPDRegister],
    }).compileComponents();

    fixture = TestBed.createComponent(OPDRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});