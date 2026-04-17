import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicePatient } from './service-patient';

describe('ServicePatient', () => {
  let component: ServicePatient;
  let fixture: ComponentFixture<ServicePatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicePatient],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicePatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
