import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Patients, PatientRecord, SourceFilter } from './patients';
import { AuthService } from '../auth.service';

const API = 'http://localhost:3000/api';

const mockAuthService = {
  isAdmin: jasmine.createSpy('isAdmin').and.returnValue(false),
  isNurse: jasmine.createSpy('isNurse').and.returnValue(false),
};

// ─── Shared API response fixtures ─────────────────────────────────────────────

const sampleOpdData = [
  { visit_date: '2026-04-10', patient_number: 'P-001', patient_id: 'uuid-opd-1',
    patient_name: 'Alice Nakato', age: 32, gender: 'F', address: 'Kampala',
    diagnosis: 'Malaria', treatment_plan: 'Coartem' },
  { visit_date: '2026-04-11', patient_number: 'P-002', patient_id: 'uuid-opd-2',
    patient_name: 'Bob Opio', age: 45, gender: 'M', address: 'Jinja',
    diagnosis: 'Typhoid', treatment_plan: 'Ciprofloxacin' },
];

const sampleIpdData = [
  { admission_date: '2026-04-12', patient_number: 'P-003', patient_id: 'uuid-ipd-1',
    patient_name: 'Carol Nambi', age: 28, gender: 'F', ward: 'Ward A',
    diagnosis: 'Pneumonia', treatment_notes: 'Amoxicillin' },
];

const opdResponse  = { success: true, data: sampleOpdData, pagination: { total: 2, page: 1, limit: 1000 } };
const ipdResponse  = { success: true, data: sampleIpdData, pagination: { total: 1, page: 1, limit: 1000 } };
const emptyOpdResp = { success: true, data: [],            pagination: { total: 0, page: 1, limit: 1000 } };
const emptyIpdResp = { success: true, data: [],            pagination: { total: 0, page: 1, limit: 1000 } };

describe('Patients', () => {
  let component: Patients;
  let fixture: ComponentFixture<Patients>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    mockAuthService.isAdmin.calls.reset();
    mockAuthService.isNurse.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Patients, CommonModule, FormsModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture   = TestBed.createComponent(Patients);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Trigger ngOnInit + flush the two parallel API calls. */
  function init(opd = opdResponse, ipd = ipdResponse): void {
    fixture.detectChanges();                                    // triggers ngOnInit
    httpMock.expectOne(`${API}/opd?limit=1000`).flush(opd);
    httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipd);
    fixture.detectChanges();
  }

  /** Flush a manual refreshPatientRecords() call. */
  function flushRefresh(opd = opdResponse, ipd = ipdResponse): void {
    httpMock.expectOne(`${API}/opd?limit=1000`).flush(opd);
    httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipd);
    fixture.detectChanges();
  }

  // ─── Initialization ───────────────────────────────────────────────────────
  describe('Initialization', () => {
    it('should create', () => {
      init();
      expect(component).toBeTruthy();
    });

    it('should load OPD and IPD records from the API', () => {
      init();
      expect(component.patientRecords.length).toBe(3);
    });

    it('should default to ALL source filter', () => {
      init();
      expect(component.sourceFilter).toBe('ALL');
    });

    it('should default to page 1', () => {
      init();
      expect(component.currentPage).toBe(1);
    });

    it('should default sort to date descending', () => {
      init();
      expect(component.sortField).toBe('date');
      expect(component.sortDir).toBe('desc');
    });

    it('should set isLoading false after records load', () => {
      init();
      expect(component.isLoading).toBeFalse();
    });

    it('should be in loading state while requests are in-flight', () => {
      fixture.detectChanges();           // ngOnInit fires, requests pending
      expect(component.isLoading).toBeTrue();
      // flush to satisfy afterEach verify
      httpMock.expectOne(`${API}/opd?limit=1000`).flush(opdResponse);
      httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipdResponse);
    });
  });

  // ─── Stats ────────────────────────────────────────────────────────────────
  describe('Stats', () => {
    it('should compute totalPatients correctly', () => {
      init();
      expect(component.totalPatients).toBe(3);
    });

    it('should compute opdCount correctly', () => {
      init();
      expect(component.opdCount).toBe(2);
    });

    it('should compute ipdCount correctly', () => {
      init();
      expect(component.ipdCount).toBe(1);
    });

    it('should compute todayCount as 0 for non-today seeded dates', () => {
      init();
      expect(component.todayCount).toBe(0);
    });

    it('should count today correctly when a record has today\'s date', () => {
      const today = new Date().toISOString().slice(0, 10);
      const opdWithToday = {
        ...opdResponse,
        data: [...sampleOpdData, {
          visit_date: today, patient_number: 'P-TODAY', patient_id: 'uuid-today',
          patient_name: 'Today Patient', age: 20, gender: 'M',
          address: 'Here', diagnosis: 'Fever', treatment_plan: 'Paracetamol',
        }],
      };
      init(opdWithToday, ipdResponse);
      expect(component.todayCount).toBe(1);
    });
  });

  // ─── Source filter tabs ───────────────────────────────────────────────────
  describe('Source filter tabs', () => {
    it('should show all records when filter is ALL', () => {
      init();
      component.setSourceFilter('ALL');
      expect(component.filteredPatientRecords.length).toBe(3);
    });

    it('should show only OPD records when filter is OPD', () => {
      init();
      component.setSourceFilter('OPD');
      expect(component.filteredPatientRecords.every(r => r.source === 'OPD')).toBeTrue();
      expect(component.filteredPatientRecords.length).toBe(2);
    });

    it('should show only IPD records when filter is IPD', () => {
      init();
      component.setSourceFilter('IPD');
      expect(component.filteredPatientRecords.every(r => r.source === 'IPD')).toBeTrue();
      expect(component.filteredPatientRecords.length).toBe(1);
    });

    it('should reset to page 1 when source filter changes', () => {
      init();
      component.currentPage = 2;
      component.setSourceFilter('OPD');
      expect(component.currentPage).toBe(1);
    });
  });

  // ─── Search filter ────────────────────────────────────────────────────────
  describe('Search filter', () => {
    it('should filter by patient name (case-insensitive)', () => {
      init();
      component.searchText = 'alice';
      expect(component.filteredPatientRecords.length).toBe(1);
      expect(component.filteredPatientRecords[0].names).toBe('Alice Nakato');
    });

    it('should filter by reg number', () => {
      init();
      component.searchText = 'P-001';
      expect(component.filteredPatientRecords.length).toBe(1);
    });

    it('should filter by diagnosis', () => {
      init();
      component.searchText = 'malaria';
      expect(component.filteredPatientRecords.length).toBe(1);
    });

    it('should filter by village/address', () => {
      init();
      component.searchText = 'jinja';
      expect(component.filteredPatientRecords.length).toBe(1);
    });

    it('should return all records when search is empty', () => {
      init();
      component.searchText = '';
      expect(component.filteredPatientRecords.length).toBe(3);
    });

    it('should return empty array for no matches', () => {
      init();
      component.searchText = 'zzznomatch';
      expect(component.filteredPatientRecords.length).toBe(0);
    });
  });

  // ─── Date filter ──────────────────────────────────────────────────────────
  describe('Date filter', () => {
    it('should filter records by exact date', () => {
      init();
      component.filterDate = '2026-04-10';
      expect(component.filteredPatientRecords.length).toBe(1);
      expect(component.filteredPatientRecords[0].names).toBe('Alice Nakato');
    });

    it('should return empty when no records match date', () => {
      init();
      component.filterDate = '2020-01-01';
      expect(component.filteredPatientRecords.length).toBe(0);
    });

    it('should show all records when date filter is cleared', () => {
      init();
      component.filterDate = '2026-04-10';
      component.filterDate = '';
      expect(component.filteredPatientRecords.length).toBe(3);
    });
  });

  // ─── Combined filters ─────────────────────────────────────────────────────
  describe('Combined filters', () => {
    it('should combine source + search filters', () => {
      init();
      component.setSourceFilter('OPD');
      component.searchText = 'bob';
      expect(component.filteredPatientRecords.length).toBe(1);
      expect(component.filteredPatientRecords[0].names).toBe('Bob Opio');
    });

    it('should combine source + date filters', () => {
      init();
      component.setSourceFilter('IPD');
      component.filterDate = '2026-04-12';
      expect(component.filteredPatientRecords.length).toBe(1);
    });
  });

  // ─── hasActiveFilters ─────────────────────────────────────────────────────
  describe('hasActiveFilters', () => {
    it('should be false when no filters are active', () => {
      init();
      component.searchText = '';
      component.filterDate = '';
      component.sourceFilter = 'ALL';
      expect(component.hasActiveFilters).toBeFalse();
    });

    it('should be true when search text is set', () => {
      init();
      component.searchText = 'alice';
      expect(component.hasActiveFilters).toBeTrue();
    });

    it('should be true when date filter is set', () => {
      init();
      component.filterDate = '2026-04-10';
      expect(component.hasActiveFilters).toBeTrue();
    });

    it('should be true when source filter is not ALL', () => {
      init();
      component.sourceFilter = 'OPD';
      expect(component.hasActiveFilters).toBeTrue();
    });
  });

  // ─── clearFilters ─────────────────────────────────────────────────────────
  describe('clearFilters()', () => {
    it('should clear all active filters', () => {
      init();
      component.searchText = 'test';
      component.filterDate = '2026-04-10';
      component.sourceFilter = 'OPD';
      component.clearFilters();
      expect(component.searchText).toBe('');
      expect(component.filterDate).toBe('');
      expect(component.sourceFilter).toBe('ALL');
    });

    it('should reset to page 1', () => {
      init();
      component.currentPage = 3;
      component.clearFilters();
      expect(component.currentPage).toBe(1);
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────
  describe('Sorting', () => {
    it('should sort by names ascending', () => {
      init();
      component.sortField = 'names';
      component.sortDir = 'asc';
      const names = component.filteredPatientRecords.map(r => r.names);
      expect(names).toEqual([...names].sort());
    });

    it('should sort by names descending', () => {
      init();
      component.sortField = 'names';
      component.sortDir = 'desc';
      const names = component.filteredPatientRecords.map(r => r.names);
      expect(names).toEqual([...names].sort().reverse());
    });

    it('should toggle sort direction when same field clicked twice', () => {
      init();
      component.sortField = 'names';
      component.sortDir = 'asc';
      component.setSort('names');
      expect(component.sortDir).toBe('desc');
      component.setSort('names');
      expect(component.sortDir).toBe('asc');
    });

    it('should reset to asc when a new sort field is selected', () => {
      init();
      component.sortField = 'names';
      component.sortDir = 'desc';
      component.setSort('age');
      expect(component.sortField).toBe('age');
      expect(component.sortDir).toBe('asc');
    });

    it('should return correct sort icons', () => {
      init();
      component.sortField = 'date';
      component.sortDir = 'asc';
      expect(component.sortIcon('date')).toBe('↑');
      component.sortDir = 'desc';
      expect(component.sortIcon('date')).toBe('↓');
      expect(component.sortIcon('names')).toBe('↕');
    });

    it('should reset to page 1 when sort changes', () => {
      init();
      component.currentPage = 2;
      component.setSort('names');
      expect(component.currentPage).toBe(1);
    });
  });

  // ─── Pagination ───────────────────────────────────────────────────────────
  describe('Pagination', () => {
    it('should paginate correctly with pageSize 2', () => {
      init();
      component.pageSize = 2;
      component.currentPage = 1;
      expect(component.paginatedRecords.length).toBe(2);
    });

    it('should show remaining records on last page', () => {
      init();
      component.pageSize = 2;
      component.currentPage = 2;
      expect(component.paginatedRecords.length).toBe(1);
    });

    it('should calculate totalRecordPages correctly', () => {
      init();
      component.pageSize = 2;
      expect(component.totalRecordPages).toBe(2);
    });

    it('should never return 0 for totalRecordPages', () => {
      init();
      component.searchText = 'zzznomatch';
      expect(component.totalRecordPages).toBe(1);
    });

    it('should advance page with nextRecordPage', () => {
      init();
      component.pageSize = 2;
      component.currentPage = 1;
      component.nextRecordPage();
      expect(component.currentPage).toBe(2);
    });

    it('should not advance past last page', () => {
      init();
      component.pageSize = 2;
      component.currentPage = 2;
      component.nextRecordPage();
      expect(component.currentPage).toBe(2);
    });

    it('should go back with prevRecordPage', () => {
      init();
      component.currentPage = 2;
      component.prevRecordPage();
      expect(component.currentPage).toBe(1);
    });

    it('should not go below page 1', () => {
      init();
      component.currentPage = 1;
      component.prevRecordPage();
      expect(component.currentPage).toBe(1);
    });

    it('should navigate to a specific page with goToPage', () => {
      init();
      component.pageSize = 1;
      component.goToPage(2);
      expect(component.currentPage).toBe(2);
    });

    it('should ignore out-of-bounds goToPage calls', () => {
      init();
      component.goToPage(999);
      expect(component.currentPage).toBe(1);
      component.goToPage(0);
      expect(component.currentPage).toBe(1);
    });

    it('should update pageSize via onPageSizeChange and reset to page 1', () => {
      init();
      component.currentPage = 3;
      component.onPageSizeChange('20');
      expect(component.pageSize).toBe(20);
      expect(component.currentPage).toBe(1);
    });
  });

  // ─── Role helpers ─────────────────────────────────────────────────────────
  describe('Role helpers', () => {
    it('should return isAdmin from AuthService', () => {
      init();
      mockAuthService.isAdmin.and.returnValue(true);
      expect(component.isAdmin).toBeTrue();
    });

    it('should return isNurse from AuthService', () => {
      init();
      mockAuthService.isNurse.and.returnValue(true);
      expect(component.isNurse).toBeTrue();
    });
  });

  // ─── Refresh ──────────────────────────────────────────────────────────────
  describe('refreshPatientRecords()', () => {
    it('should set isLoading to true then false', () => {
      init();
      component.refreshPatientRecords();
      expect(component.isLoading).toBeTrue();
      flushRefresh();
      expect(component.isLoading).toBeFalse();
    });

    it('should reset currentPage to 1', () => {
      init();
      component.currentPage = 3;
      component.refreshPatientRecords();
      flushRefresh();
      expect(component.currentPage).toBe(1);
    });

    it('should reload records after refresh', () => {
      init(emptyOpdResp, emptyIpdResp);
      expect(component.patientRecords.length).toBe(0);
      component.refreshPatientRecords();
      flushRefresh(opdResponse, ipdResponse);
      expect(component.patientRecords.length).toBe(3);
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────────
  describe('Error handling', () => {
    it('should set errorMessage and empty records on HTTP error', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${API}/opd?limit=1000`).error(new ErrorEvent('network'));
      httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipdResponse);
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();
      expect(component.patientRecords.length).toBe(0);
      expect(component.isLoading).toBeFalse();
    });

    it('should clear errorMessage on successful reload after error', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${API}/opd?limit=1000`).error(new ErrorEvent('network'));
      httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipdResponse);
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();

      component.refreshPatientRecords();
      flushRefresh();
      expect(component.errorMessage).toBe('');
    });

    it('should handle empty data arrays gracefully', () => {
      init(emptyOpdResp, emptyIpdResp);
      expect(component.patientRecords).toEqual([]);
      expect(component.isLoading).toBeFalse();
    });
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  describe('Lifecycle', () => {
    it('should complete the destroy$ subject on ngOnDestroy', () => {
      init();
      spyOn((component as any).destroy$, 'next').and.callThrough();
      component.ngOnDestroy();
      expect((component as any).destroy$.next).toHaveBeenCalled();
    });
  });
});