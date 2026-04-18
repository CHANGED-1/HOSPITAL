import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';

import { Dashboard, DashboardStats, DiseaseCount } from './dashboard';
import { AuthService } from '../auth.service';

const API = 'http://localhost:3000/api';

// ─── Mock AuthService ──────────────────────────────────────────
const mockAuthService = {
  currentUser: { username: 'nurse1', role: 'nurse' },
  role:        'nurse' as string | null,
  isAdmin:     jasmine.createSpy('isAdmin').and.returnValue(false),
  isDoctor:    jasmine.createSpy('isDoctor').and.returnValue(false),
  isNurse:     jasmine.createSpy('isNurse').and.returnValue(true),
  isLoggedIn:  jasmine.createSpy('isLoggedIn').and.returnValue(true),
  accessToken: 'mock-token',
};

// ─── API fixtures ──────────────────────────────────────────────
const opdVisit1 = {
  id: 'v-1', patient_id: 'p-1', patient_name: 'Alice Nakato',
  visit_date: '2026-04-10', age: 32, gender: 'F',
  diagnosis: 'Malaria', doctor_name: 'drsmith', status: 'completed',
};
const opdVisit2 = {
  id: 'v-2', patient_id: 'p-2', patient_name: 'Bob Opio',
  visit_date: '2026-04-11', age: 45, gender: 'M',
  diagnosis: 'Typhoid', doctor_name: 'drjane', status: 'completed',
};
const ipdAdmission = {
  id: 'a-1', patient_id: 'p-3', patient_name: 'Carol Nambi',
  admission_date: '2026-04-12', age: 28, gender: 'F',
  diagnosis: 'Malaria', doctor_name: 'drsmith', status: 'admitted',
};

const opdResp    = { success: true, data: [opdVisit1, opdVisit2], pagination: { total: 2 } };
const ipdResp    = { success: true, data: [ipdAdmission],         pagination: { total: 1 } };
const doctorResp = { success: true, data: [],                     pagination: { total: 3 } };
const drugsResp  = { success: true, data: [],                     pagination: { total: 42 } };
const emptyResp  = { success: true, data: [],                     pagination: { total: 0 } };

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture:   ComponentFixture<Dashboard>;
  let httpMock:  HttpTestingController;

  beforeEach(async () => {
    mockAuthService.isAdmin.calls.reset();
    mockAuthService.isNurse.calls.reset();
    mockAuthService.currentUser = { username: 'nurse1', role: 'nurse' };
    mockAuthService.role = 'nurse';

    await TestBed.configureTestingModule({
      imports: [Dashboard, CommonModule, HttpClientTestingModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture   = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init(
    opd     = opdResp,
    ipd     = ipdResp,
    doctors = doctorResp,
    drugs   = drugsResp,
  ): void {
    fixture.detectChanges();
    flushStats(opd, ipd, doctors, drugs);
  }

  function flushStats(
    opd     = opdResp,
    ipd     = ipdResp,
    doctors = doctorResp,
    drugs   = drugsResp,
  ): void {
    httpMock.expectOne(`${API}/opd?limit=1000`).flush(opd);
    httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipd);
    httpMock.expectOne(`${API}/users?role=doctor&status=active&limit=1`).flush(doctors);
    httpMock.expectOne(`${API}/pharmacy/drugs?limit=1`).flush(drugs);
    fixture.detectChanges();
  }

  // ─── Initialization ────────────────────────────────────────
  describe('Initialization', () => {
    it('should create', () => {
      init();
      expect(component).toBeTruthy();
    });

    it('should be loading while requests are in-flight', () => {
      fixture.detectChanges();
      expect(component.isLoading).toBeTrue();
      flushStats();
    });

    it('should set isLoading to false after data loads', () => {
      init();
      expect(component.isLoading).toBeFalse();
    });

    it('should have no errorMessage after successful load', () => {
      init();
      expect(component.errorMessage).toBe('');
    });

    it('should set errorMessage on HTTP error', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${API}/opd?limit=1000`).error(new ErrorEvent('network'));
      httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipdResp);
      httpMock.expectOne(`${API}/users?role=doctor&status=active&limit=1`).flush(doctorResp);
      httpMock.expectOne(`${API}/pharmacy/drugs?limit=1`).flush(drugsResp);
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();
    });
  });

  // ─── Header properties ─────────────────────────────────────
  describe('Header properties', () => {
    it('should return the username from AuthService', () => {
      init();
      expect(component.username).toBe('nurse1');
    });

    it('should return "User" when currentUser is null', () => {
      init();
      (mockAuthService as any).currentUser = null;
      expect(component.username).toBe('User');
    });

    it('should return capitalised roleLabel', () => {
      init();
      mockAuthService.role = 'nurse';
      expect(component.roleLabel).toBe('Nurse');
    });

    it('should return capitalised admin roleLabel', () => {
      init();
      mockAuthService.role = 'admin';
      expect(component.roleLabel).toBe('Admin');
    });

    it('should return empty string for roleLabel when role is null', () => {
      init();
      mockAuthService.role = null;
      expect(component.roleLabel).toBe('');
    });

    it('should return a non-empty greeting string', () => {
      init();
      expect(['Good morning', 'Good afternoon', 'Good evening'])
        .toContain(component.greeting);
    });

    it('should expose a today string', () => {
      init();
      expect(component.today).toBeTruthy();
      expect(typeof component.today).toBe('string');
    });

    it('should expose currentYear as the actual current year', () => {
      init();
      expect(component.currentYear).toBe(new Date().getFullYear());
    });

    it('should render the username in the header h1', () => {
      init();
      const h1 = fixture.debugElement.query(By.css('.dashboard-header h1'));
      expect(h1.nativeElement.textContent.trim().toLowerCase()).toContain('nurse1');
    });

    it('should render the role badge when role is set', () => {
      init();
      const badge = fixture.debugElement.query(By.css('.role-badge'));
      expect(badge).toBeTruthy();
      expect(badge.nativeElement.textContent.trim().toLowerCase()).toContain('nurse');
    });

    it('should render the today date in the header', () => {
      init();
      const el = fixture.debugElement.query(By.css('.header-date'));
      expect(el.nativeElement.textContent.trim().length).toBeGreaterThan(0);
    });
  });

  // ─── Stats ────────────────────────────────────────────────
  describe('stats', () => {
    it('should count total patients as OPD total + IPD total', () => {
      init();
      expect(component.stats.patients).toBe(3); // 2 + 1
    });

    it('should count doctors from pagination total', () => {
      init();
      expect(component.stats.doctors).toBe(3);
    });

    it('should count services as the length of servicesOffered', () => {
      init();
      expect(component.stats.services).toBe(component.servicesOffered.length);
    });

    it('should handle zero patients gracefully', () => {
      init(emptyResp, emptyResp, doctorResp, drugsResp);
      expect(component.stats.patients).toBe(0);
      expect(component.patients).toEqual([]);
    });

    it('should correctly add OPD and IPD pagination totals — not misprioritise ?? vs +', () => {
      // This verifies the operator precedence bug is fixed:
      // old code: total = opd.pagination.total ?? opdList.length + ipd.pagination.total
      // new code: total = (opd.pagination.total ?? opdList.length) + (ipd.pagination.total ?? ipdList.length)
      const bigOpdResp = { ...opdResp, pagination: { total: 100 } };
      const bigIpdResp = { ...ipdResp, pagination: { total: 50  } };
      init(bigOpdResp, bigIpdResp, doctorResp, drugsResp);
      expect(component.stats.patients).toBe(150);
    });

    it('should map OPD visit fields onto Patient correctly', () => {
      init();
      const alice = component.patients.find(p => p.firstName === 'Alice Nakato');
      expect(alice).toBeTruthy();
      expect(alice!.disease).toBe('Malaria');
      expect(alice!.assignedDoctor).toBe('drsmith');
    });

    it('should map IPD admission fields onto Patient correctly', () => {
      init();
      const carol = component.patients.find(p => p.firstName === 'Carol Nambi');
      expect(carol).toBeTruthy();
      expect(carol!.disease).toBe('Malaria');
    });
  });

  // ─── diseaseStats ─────────────────────────────────────────
  describe('diseaseStats', () => {
    it('should compute disease counts from patient diagnoses', () => {
      init();
      const malaria = component.diseaseStats.find(d => d.disease === 'Malaria');
      expect(malaria).toBeTruthy();
      expect(malaria!.count).toBe(2);
    });

    it('should sort diseases by count descending', () => {
      init();
      const counts = component.diseaseStats.map(d => d.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
    });

    it('should compute percent correctly', () => {
      init();
      const total = component.diseaseStats.reduce((s, d) => s + d.count, 0);
      component.diseaseStats.forEach(d => {
        expect(d.percent).toBeCloseTo((d.count / total) * 100, 2);
      });
    });

    it('should return empty array when no patients have diagnoses', () => {
      init(emptyResp, emptyResp, doctorResp, drugsResp);
      expect(component.diseaseStats).toEqual([]);
    });
  });

  // ─── getDiseaseCounts ──────────────────────────────────────
  describe('getDiseaseCounts()', () => {
    it('should return diseaseStats directly', () => {
      init();
      expect(component.getDiseaseCounts()).toBe(component.diseaseStats);
    });

    it('should return empty array when no data', () => {
      init(emptyResp, emptyResp, doctorResp, drugsResp);
      expect(component.getDiseaseCounts()).toEqual([]);
    });
  });

  // ─── getDiagnosisTokens ───────────────────────────────────
  describe('getDiagnosisTokens()', () => {
    it('should return empty array for null/undefined', () => {
      init();
      expect(component.getDiagnosisTokens(undefined)).toEqual([]);
      expect(component.getDiagnosisTokens(null as any)).toEqual([]);
    });

    it('should split comma-separated diagnoses', () => {
      init();
      expect(component.getDiagnosisTokens('Malaria, Typhoid')).toEqual(['Malaria', 'Typhoid']);
    });

    it('should split newline-separated diagnoses', () => {
      init();
      expect(component.getDiagnosisTokens('Malaria\nTyphoid')).toEqual(['Malaria', 'Typhoid']);
    });

    it('should filter out meaningless tokens', () => {
      init();
      expect(component.getDiagnosisTokens('N/A')).toEqual([]);
      expect(component.getDiagnosisTokens('unknown')).toEqual([]);
      expect(component.getDiagnosisTokens('pending')).toEqual([]);
      expect(component.getDiagnosisTokens('-')).toEqual([]);
    });

    it('should handle array input', () => {
      init();
      expect(component.getDiagnosisTokens(['Malaria', 'Typhoid'])).toEqual(['Malaria', 'Typhoid']);
    });

    it('should trim whitespace from tokens', () => {
      init();
      expect(component.getDiagnosisTokens('  Malaria  ,  Typhoid  ')).toEqual(['Malaria', 'Typhoid']);
    });
  });

  // ─── getTopDiseaseCounts ──────────────────────────────────
  describe('getTopDiseaseCounts()', () => {
    it('should return at most 5 items by default', () => {
      init();
      expect(component.getTopDiseaseCounts().length).toBeLessThanOrEqual(5);
    });

    it('should respect a custom limit', () => {
      init();
      expect(component.getTopDiseaseCounts(1).length).toBeLessThanOrEqual(1);
    });

    it('should return the highest-count diseases first', () => {
      init();
      const top = component.getTopDiseaseCounts();
      if (top.length > 1) {
        expect(top[0].count).toBeGreaterThanOrEqual(top[1].count);
      }
    });
  });

  // ─── generatePieGradient ──────────────────────────────────
  describe('generatePieGradient()', () => {
    it('should return fallback gradient for empty input', () => {
      init();
      expect(component.generatePieGradient([])).toBe('conic-gradient(#dfe7ff 0 100%)');
    });

    it('should return a conic-gradient for non-empty input', () => {
      init();
      const items: DiseaseCount[] = [
        { disease: 'Malaria', count: 3, percent: 60 },
        { disease: 'Typhoid', count: 2, percent: 40 },
      ];
      const result = component.generatePieGradient(items);
      expect(result).toContain('conic-gradient');
      expect(result).toContain('60.00%');
      expect(result).toContain('100.00%');
    });

    it('should cycle through colors for > 7 items', () => {
      init();
      const items: DiseaseCount[] = Array.from({ length: 9 }, (_, i) => ({
        disease: `D${i}`, count: 1, percent: 100 / 9,
      }));
      expect(component.generatePieGradient(items)).toContain('conic-gradient');
    });
  });

  // ─── refreshAllStats ──────────────────────────────────────
  describe('refreshAllStats()', () => {
    it('should set isLoading to true then false', () => {
      init();
      component.refreshAllStats();
      expect(component.isLoading).toBeTrue();
      flushStats();
      expect(component.isLoading).toBeFalse();
    });

    it('should clear errorMessage on successful refresh', () => {
      init();
      component.errorMessage = 'old error';
      component.refreshAllStats();
      flushStats();
      expect(component.errorMessage).toBe('');
    });

    it('should reload updated stats after refresh', () => {
      init(emptyResp, emptyResp, doctorResp, drugsResp);
      expect(component.stats.patients).toBe(0);
      component.refreshAllStats();
      flushStats(opdResp, ipdResp, doctorResp, drugsResp);
      expect(component.stats.patients).toBe(3);
    });

    it('should set errorMessage on refresh failure', () => {
      init();
      component.refreshAllStats();
      httpMock.expectOne(`${API}/opd?limit=1000`).error(new ErrorEvent('network'));
      httpMock.expectOne(`${API}/ipd?limit=1000`).flush(ipdResp);
      httpMock.expectOne(`${API}/users?role=doctor&status=active&limit=1`).flush(doctorResp);
      httpMock.expectOne(`${API}/pharmacy/drugs?limit=1`).flush(drugsResp);
      fixture.detectChanges();
      expect(component.errorMessage).toBeTruthy();
    });
  });

  // ─── Error banner DOM ─────────────────────────────────────
  describe('Error banner', () => {
    it('should render error banner when errorMessage is set', () => {
      init();
      component.errorMessage = 'Something went wrong';
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('.banner-error'));
      expect(banner).toBeTruthy();
      expect(banner.nativeElement.getAttribute('role')).toBe('alert');
    });

    it('should render Retry button inside error banner', () => {
      init();
      component.errorMessage = 'Some error';
      fixture.detectChanges();
      const retryBtn = fixture.debugElement.query(By.css('.btn-retry'));
      expect(retryBtn).toBeTruthy();
    });

    it('should call refreshAllStats when Retry is clicked', () => {
      init();
      component.errorMessage = 'Some error';
      fixture.detectChanges();
      spyOn(component, 'refreshAllStats').and.callThrough();
      fixture.debugElement.query(By.css('.btn-retry')).triggerEventHandler('click', null);
      expect(component.refreshAllStats).toHaveBeenCalled();
      flushStats();
    });

    it('should hide error banner when errorMessage is empty', () => {
      init();
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('.banner-error'));
      expect(banner).toBeNull();
    });
  });

  // ─── Auto-refresh interval ────────────────────────────────
  describe('Auto-refresh interval', () => {
    it('should fire additional API calls after the interval elapses', fakeAsync(() => {
      fixture.detectChanges();
      flushStats();
      tick(30_000);
      flushStats();
      discardPeriodicTasks();
    }));

    it('should stop polling after ngOnDestroy', fakeAsync(() => {
      fixture.detectChanges();
      flushStats();
      component.ngOnDestroy();
      tick(30_000);
      httpMock.expectNone(`${API}/opd?limit=1000`);
      discardPeriodicTasks();
    }));
  });

  // ─── servicesOffered ──────────────────────────────────────
  describe('servicesOffered', () => {
    it('should have 5 static services', () => {
      init();
      expect(component.servicesOffered.length).toBe(5);
    });

    it('should include General Consultation', () => {
      init();
      expect(component.servicesOffered.some(s => s.name === 'General Consultation')).toBeTrue();
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