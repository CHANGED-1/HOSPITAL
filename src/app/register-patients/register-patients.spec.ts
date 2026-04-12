import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterPatients } from './register-patients';

describe('RegisterPatients', () => {
  let component: RegisterPatients;
  let fixture: ComponentFixture<RegisterPatients>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPatients],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPatients);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
