import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';

import { OPDRegister, OPDRegisterEntry } from './opd-register';

const API = 'http://localhost:3000/api';

// ─── Fixtures ──────────────────────────────────────────────────
const mockDoctors = [
  { id: 'doc-1', name: 'Dr. Smith', username: 'drsmith', role: 'doctor', status: 'active' },
  { id: 'doc-2', name: 'Dr. Jane',  username: 'drjane',  role: 'doctor', status: 'active' },
];

const mockVisit1 = {
  id: 'visit-1', visit_date: '2026-04-10', patient_number: 'P-001',
  patient_id: 'p-uuid-1', patient_name: 'Alice Nakato',
  age: 32, gender: 'F', address: 'Kampala', department: 'Outpatient',
  chief_complaint: 'Fever', diagnosis: 'Malaria', treatment_plan: 'Coartem',
  doctor_name: 'drsmith', doctor_id: 'doc-1',
  vitals: { malariaTest: 'Positive', tbScreen: 'No', palliativeCare: 'No', alcoholUse: 'No', referredFrom: '' },
  notes: '',
};

const mockVisit2 = {
  id: 'visit-2', visit_date: '2026-04-11', patient_number: 'P-002',
  patient_id: 'p-uuid-2', patient_name: 'Bob Opio',
  age: 45, gender: 'M', address: 'Jinja', department: 'Dental',
  chief_complaint: 'Cough', diagnosis: 'Typhoid', treatment_plan: 'Ciprofloxacin',
  doctor_name: 'drjane', doctor_id: 'doc-2',
  vitals: { malariaTest: 'Negative', tbScreen: 'Yes', palliativeCare: 'No', alcoholUse: 'No', referredFrom: '' },
  notes: '',
};

const doctorsResp = { success: true, data: mockDoctors, pagination: { total: 2, page: 1, limit: 100 } };
const visitsResp  = { success: true, data: [mockVisit1, mockVisit2], pagination: { total: 2 } };
const emptyVisits = { success: true, data: [], pagination: { total: 0 } };

describe('OPDRegister', () => {
  let component: OPDRegister;
  let fixture:   ComponentFixture<OPDRegister>;
  let httpMock:  HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OPDRegister, CommonModule, FormsModule, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture   = TestBed.createComponent(OPDRegister);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init(doctors = doctorsResp, visits = visitsResp): void {
    fixture.detectChanges();
    httpMock.expectOne(`${API}/users?role=doctor&status=active&limit=100`).flush(doctors);
    httpMock.expectOne(`${API}/opd?limit=1000`).flush(visits);
    fixture.detectChanges();
  }

  // ─── Initialization ───────────────────────────────────────
  describe('Initialization', () => {
    it('should create', () => {
      init();
      expect(component).toBeTruthy();
    });

    it('should load doctors from API', () => {
      init();
      expect(component.doctors.length).toBe(2);
      expect(component.doctors[0].username).toBe('drsmith');
    });

    it('should set the first doctor as default on newOpdEntry', () => {
      init();
      expect(component.newOpdEntry.doctor).toBe('drsmith');
      expect(component.newOpdEntry.doctorId).toBe('doc-1');
    });

    it('should load OPD visits from API', () => {
      init();
      expect(component.opdRegister.length).toBe(2);
    });

    it('should map visit fields correctly', () => {
      init();
      const entry = component.opdRegister[0];
      expect(entry.patientName).toBe('Alice Nakato');
      expect(entry.diagnosis).toBe('Malaria');
      expect(entry.malariaTest).toBe('Positive');
    });

    it('should set isLoading false after data loads', () => {
      init();
      expect(component.isLoading).toBeFalse();
    });

    it('should be loading while requests are in-flight', () => {
      fixture.detectChanges();
      expect(component.isLoading).toBeTrue();
      httpMock.expectOne(`${API}/users?role=doctor&status=active&limit=100`).flush(doctorsResp);
      httpMock.expectOne(`${API}/opd?limit=1000`).flush(visitsResp);
    });

    it('should set errorMessage on load failure', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${API}/users?role=doctor&status=active&limit=100`).error(new ErrorEvent('fail'));
      httpMock.expectOne(`${API}/opd?limit=1000`).flush(visitsResp);
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();
    });

    it('should handle empty doctors list gracefully', () => {
      init({ success: true, data: [], pagination: { total: 0, page: 1, limit: 100 } }, visitsResp);
      expect(component.doctors).toEqual([]);
      expect(component.newOpdEntry.doctorId).toBeFalsy();
    });

    it('should default formCollapsed to false', () => {
      init();
      expect(component.formCollapsed).toBeFalse();
    });
  });

  // ─── Default form state ───────────────────────────────────
  describe('New entry defaults', () => {
    it('should default sex to Female', () => {
      init();
      expect(component.newOpdEntry.sex).toBe('Female');
    });

    it('should default clientCategory to General', () => {
      init();
      expect(component.newOpdEntry.clientCategory).toBe('General');
    });

    it('should default malariaTest to Not done', () => {
      init();
      expect(component.newOpdEntry.malariaTest).toBe('Not done');
    });

    it('should default tbScreen, palliativeCare, alcoholUse to No', () => {
      init();
      expect(component.newOpdEntry.tbScreen).toBe('No');
      expect(component.newOpdEntry.palliativeCare).toBe('No');
      expect(component.newOpdEntry.alcoholUse).toBe('No');
    });

    it("should default date to today's date", () => {
      init();
      expect(component.newOpdEntry.date).toBe(new Date().toISOString().slice(0, 10));
    });
  });

  // ─── Validation ───────────────────────────────────────────
  describe('addOpdEntry() validation', () => {
    it('should set errorMessage and NOT POST when required fields are missing', () => {
      init();
      component.newOpdEntry.patientName = '';
      component.addOpdEntry();
      httpMock.expectNone(`${API}/opd`);
      expect(component.errorMessage).toBeTruthy();
    });

    it('should set errorMessage when doctorId is missing', () => {
      init();
      component.newOpdEntry.patientName = 'Test Patient';
      component.newOpdEntry.age = 30;
      component.newOpdEntry.doctorId = '';
      component.addOpdEntry();
      expect(component.errorMessage).toBeTruthy();
    });
  });

  // ─── Add entry ────────────────────────────────────────────
  describe('addOpdEntry() — success flow', () => {
    function fillForm(): void {
      component.newOpdEntry.patientName = 'New Patient';
      component.newOpdEntry.age         = 25;
      component.newOpdEntry.sex         = 'Male';
      component.newOpdEntry.doctorId    = 'doc-1';
      component.newOpdEntry.patientId   = 'p-uuid-new';
    }

    it('should POST to /api/opd and prepend the new entry', () => {
      init();
      fillForm();
      component.addOpdEntry();
      const saved = { ...mockVisit1, id: 'visit-new', patient_name: 'New Patient' };
      httpMock.expectOne(`${API}/opd`).flush({ success: true, data: saved });
      fixture.detectChanges();
      expect(component.opdRegister.length).toBe(3);
      expect(component.opdRegister[0].patientName).toBe('New Patient');
    });

    it('should reset the form after a successful add', () => {
      init();
      fillForm();
      component.addOpdEntry();
      httpMock.expectOne(`${API}/opd`).flush({ success: true, data: mockVisit1 });
      fixture.detectChanges();
      expect(component.newOpdEntry.patientName).toBe('');
      expect(component.newOpdEntry.age).toBe(0);
    });

    it('should clear errorMessage after a successful add', () => {
      init();
      component.errorMessage = 'old error';
      fillForm();
      component.addOpdEntry();
      httpMock.expectOne(`${API}/opd`).flush({ success: true, data: mockVisit1 });
      fixture.detectChanges();
      expect(component.errorMessage).toBe('');
    });

    it('should set errorMessage on POST failure', () => {
      init();
      fillForm();
      component.addOpdEntry();
      httpMock.expectOne(`${API}/opd`).error(new ErrorEvent('network'));
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();
    });
  });

  // ─── Edit / save / cancel ─────────────────────────────────
  describe('editOpdEntry() / saveOpdEntry() / cancelOpdEdit()', () => {
    it('should set editing to true on editOpdEntry', () => {
      init();
      component.editOpdEntry(0);
      expect(component.opdRegister[0].editing).toBeTrue();
    });

    it('should PATCH /api/opd/:id and update the entry', () => {
      init();
      component.editOpdEntry(0);
      component.opdRegister[0].diagnosis = 'Updated Diagnosis';
      component.saveOpdEntry(0);
      const updated = { ...mockVisit1, diagnosis: 'Updated Diagnosis' };
      httpMock.expectOne(`${API}/opd/visit-1`).flush({ success: true, data: updated });
      fixture.detectChanges();
      expect(component.opdRegister[0].editing).toBeFalse();
      expect(component.opdRegister[0].diagnosis).toBe('Updated Diagnosis');
    });

    it('should set errorMessage when PATCH fails', () => {
      init();
      component.editOpdEntry(0);
      component.saveOpdEntry(0);
      httpMock.expectOne(`${API}/opd/visit-1`).error(new ErrorEvent('network'));
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();
    });

    it('should set editing to false and re-fetch on cancelOpdEdit', () => {
      init();
      component.editOpdEntry(0);
      component.cancelOpdEdit(0);
      expect(component.opdRegister[0].editing).toBeFalse();
      httpMock.expectOne(`${API}/opd/visit-1`).flush({ success: true, data: mockVisit1 });
    });
  });

  // ─── Delete ───────────────────────────────────────────────
  describe('deleteOpdEntry()', () => {
    it('should optimistically remove the entry and PATCH status', () => {
      init();
      component.deleteOpdEntry(0);
      expect(component.opdRegister.length).toBe(1);
      httpMock.expectOne(`${API}/opd/visit-1`).flush({ success: true, data: mockVisit1 });
    });

    it('should restore the entry on API failure', () => {
      init();
      component.deleteOpdEntry(0);
      httpMock.expectOne(`${API}/opd/visit-1`).error(new ErrorEvent('network'));
      fixture.detectChanges();
      expect(component.opdRegister.length).toBe(2);
      expect(component.errorMessage).toBeTruthy();
    });
  });

  describe('deleteSelectedRows()', () => {
    it('should remove all selected rows and fire PATCH for each', () => {
      init();
      component.selectedRows.add(0);
      component.selectedRows.add(1);
      component.deleteSelectedRows();
      expect(component.opdRegister.length).toBe(0);
      expect(component.selectedRows.size).toBe(0);
      httpMock.expectOne(`${API}/opd/visit-1`).flush({ success: true, data: mockVisit1 });
      httpMock.expectOne(`${API}/opd/visit-2`).flush({ success: true, data: mockVisit2 });
    });
  });

  // ─── Row selection ────────────────────────────────────────
  describe('toggleRowSelection()', () => {
    it('should add an index to selectedRows', () => {
      init();
      component.toggleRowSelection(0);
      expect(component.selectedRows.has(0)).toBeTrue();
    });

    it('should remove an index that is already selected', () => {
      init();
      component.toggleRowSelection(0);
      component.toggleRowSelection(0);
      expect(component.selectedRows.has(0)).toBeFalse();
    });
  });

  describe('toggleSelectAll()', () => {
    it('should select all paginated rows when none are selected', () => {
      init();
      component.pageSize = 10;
      component.currentPage = 1;
      component.toggleSelectAll();
      expect(component.selectedRows.has(0)).toBeTrue();
      expect(component.selectedRows.has(1)).toBeTrue();
    });

    it('should deselect all paginated rows when all are selected', () => {
      init();
      component.pageSize = 10;
      component.currentPage = 1;
      component.toggleSelectAll(); // select all
      component.toggleSelectAll(); // deselect all
      expect(component.selectedRows.size).toBe(0);
    });

    it('allPageSelected should be false when no rows selected', () => {
      init();
      expect(component.allPageSelected).toBeFalse();
    });

    it('allPageSelected should be true when all page rows selected', () => {
      init();
      component.pageSize = 10;
      component.currentPage = 1;
      component.selectedRows.add(0);
      component.selectedRows.add(1);
      expect(component.allPageSelected).toBeTrue();
    });

    it('allPageSelected should be false for empty paginated list', () => {
      init(doctorsResp, emptyVisits);
      expect(component.allPageSelected).toBeFalse();
    });
  });

  // ─── Filtering ────────────────────────────────────────────
  describe('filteredOpdRegister', () => {
    it('should return all entries when no filters are set', () => {
      init();
      expect(component.filteredOpdRegister.length).toBe(2);
    });

    it('should filter by patient name (case-insensitive)', () => {
      init();
      component.filterPatientName = 'alice';
      expect(component.filteredOpdRegister.length).toBe(1);
      expect(component.filteredOpdRegister[0].patientName).toBe('Alice Nakato');
    });

    it('should filter by diagnosis (case-insensitive)', () => {
      init();
      component.filterDiagnosis = 'malaria';
      expect(component.filteredOpdRegister.length).toBe(1);
    });

    it('should filter by doctor', () => {
      init();
      component.filterDoctor = 'drjane';
      expect(component.filteredOpdRegister.length).toBe(1);
      expect(component.filteredOpdRegister[0].patientName).toBe('Bob Opio');
    });

    it('should filter by date', () => {
      init();
      component.filterDate = '2026-04-10';
      expect(component.filteredOpdRegister.length).toBe(1);
    });

    it('should filter by malaria test result', () => {
      init();
      component.filterMalariaTest = 'Positive';
      expect(component.filteredOpdRegister.length).toBe(1);
    });

    it('should filter by department using partial match (includes fix)', () => {
      init();
      // "Outpatient" contains "out" — old strict === would have failed
      component.filterDepartment = 'out';
      expect(component.filteredOpdRegister.length).toBe(1);
      expect(component.filteredOpdRegister[0].patientName).toBe('Alice Nakato');
    });

    it('should filter department case-insensitively', () => {
      init();
      component.filterDepartment = 'DENTAL';
      expect(component.filteredOpdRegister.length).toBe(1);
      expect(component.filteredOpdRegister[0].patientName).toBe('Bob Opio');
    });

    it('should return empty array for no matches', () => {
      init();
      component.filterPatientName = 'zzznomatch';
      expect(component.filteredOpdRegister.length).toBe(0);
    });
  });

  // ─── hasActiveFilters / clearFilters ──────────────────────
  describe('hasActiveFilters', () => {
    it('should be false when no filters are set', () => {
      init();
      expect(component.hasActiveFilters).toBeFalse();
    });

    it('should be true when any filter is set', () => {
      init();
      component.filterPatientName = 'alice';
      expect(component.hasActiveFilters).toBeTrue();
    });
  });

  describe('clearFilters()', () => {
    it('should reset all filter fields', () => {
      init();
      component.filterPatientName  = 'alice';
      component.filterDiagnosis    = 'malaria';
      component.filterDate         = '2026-04-10';
      component.filterDoctor       = 'drsmith';
      component.filterDepartment   = 'OPD';
      component.filterMalariaTest  = 'Positive';
      component.clearFilters();
      expect(component.filterPatientName).toBe('');
      expect(component.filterDiagnosis).toBe('');
      expect(component.filterDate).toBe('');
      expect(component.filterDoctor).toBe('');
      expect(component.filterDepartment).toBe('');
      expect(component.filterMalariaTest).toBe('');
    });

    it('should reset currentPage to 1', () => {
      init();
      component.currentPage = 3;
      component.clearFilters();
      expect(component.currentPage).toBe(1);
    });
  });

  // ─── Pagination ───────────────────────────────────────────
  describe('Pagination', () => {
    it('should return correct paginatedEntries for page 1', () => {
      init();
      component.pageSize    = 1;
      component.currentPage = 1;
      expect(component.paginatedEntries.length).toBe(1);
    });

    it('should return correct entries for page 2', () => {
      init();
      component.pageSize    = 1;
      component.currentPage = 2;
      expect(component.paginatedEntries[0].patientName).toBe('Bob Opio');
    });

    it('should compute totalPages correctly', () => {
      init();
      component.pageSize = 1;
      expect(component.totalPages).toBe(2);
    });

    it('should never return 0 for totalPages', () => {
      init(doctorsResp, emptyVisits);
      expect(component.totalPages).toBe(1);
    });

    it('should navigate to a valid page', () => {
      init();
      component.pageSize = 1;
      component.goToPage(2);
      expect(component.currentPage).toBe(2);
    });

    it('should ignore out-of-bounds page navigation', () => {
      init();
      component.goToPage(999);
      expect(component.currentPage).toBe(1);
      component.goToPage(0);
      expect(component.currentPage).toBe(1);
    });

    it('should reset to page 1 on changePageSize', () => {
      init();
      component.currentPage = 2;
      component.changePageSize();
      expect(component.currentPage).toBe(1);
    });

    it('should return correct pageNumbers centered around currentPage', () => {
      init();
      component.pageSize    = 1;
      component.currentPage = 2;
      const pages = component.pageNumbers;
      expect(pages).toContain(2);
      expect(pages.length).toBeGreaterThan(0);
    });
  });

  // ─── Doctor selection ─────────────────────────────────────
  describe('onDoctorChange()', () => {
    it('should update doctor and doctorId on the target entry', () => {
      init();
      component.onDoctorChange('drjane', component.newOpdEntry);
      expect(component.newOpdEntry.doctor).toBe('drjane');
      expect(component.newOpdEntry.doctorId).toBe('doc-2');
    });
  });

  // ─── Refresh ──────────────────────────────────────────────
  describe('refreshOpdRegister()', () => {
    it('should re-fetch visits and update opdRegister', () => {
      init(doctorsResp, emptyVisits);
      expect(component.opdRegister.length).toBe(0);
      component.refreshOpdRegister();
      httpMock.expectOne(`${API}/opd?limit=1000`).flush(visitsResp);
      fixture.detectChanges();
      expect(component.opdRegister.length).toBe(2);
    });

    it('should set errorMessage on refresh failure', () => {
      init();
      component.refreshOpdRegister();
      httpMock.expectOne(`${API}/opd?limit=1000`).error(new ErrorEvent('network'));
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();
    });
  });

  // ─── Lifecycle ────────────────────────────────────────────
  describe('ngOnDestroy', () => {
    it('should complete the destroy$ subject', () => {
      init();
      spyOn((component as any).destroy$, 'next').and.callThrough();
      component.ngOnDestroy();
      expect((component as any).destroy$.next).toHaveBeenCalled();
    });
  });
});