import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { RegisterPatients } from './register-patients';

const API = 'http://localhost:3000/api';
const TODAY_ISO = new Date().toISOString().slice(0, 10);

const mockOpdResponse      = { success: true, data: [], pagination: { total: 12, page: 1, limit: 1, pages: 12 } };
const mockIpdResponse      = { success: true, data: [], pagination: { total: 4,  page: 1, limit: 1, pages: 4  } };
const mockOpdTodayResponse = { success: true, data: [], pagination: { total: 5,  page: 1, limit: 1, pages: 5  } };

describe('RegisterPatients', () => {
  let component: RegisterPatients;
  let fixture:   ComponentFixture<RegisterPatients>;
  let httpMock:  HttpTestingController;
  let router:    Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPatients, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture   = TestBed.createComponent(RegisterPatients);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
    router    = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  /** Flush all three API calls triggered by ngOnInit / refreshCounts() */
  function flushAll(
    opd      = mockOpdResponse,
    ipd      = mockIpdResponse,
    opdToday = mockOpdTodayResponse,
  ) {
    fixture.detectChanges(); // triggers ngOnInit → refreshCounts()
    httpMock.expectOne(`${API}/opd?limit=1`).flush(opd);
    httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(ipd);
    httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(opdToday);
    fixture.detectChanges();
  }

  // ─── Creation ─────────────────────────────────────────────
  describe('Initialization', () => {
    it('should create', () => {
      flushAll();
      expect(component).toBeTruthy();
    });

    it('should start with isLoading true and no error', () => {
      fixture.detectChanges();
      expect(component.isLoading).toBeTrue();
      expect(component.errorMessage).toBe('');
      httpMock.expectOne(`${API}/opd?limit=1`).flush(mockOpdResponse);
      httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(mockIpdResponse);
      httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(mockOpdTodayResponse);
    });

    it('should expose a human-readable today date string', () => {
      flushAll();
      expect(component.today).toBeTruthy();
      expect(typeof component.today).toBe('string');
    });

    it('should render the today date in the DOM', () => {
      flushAll();
      const el = fixture.debugElement.query(By.css('.today-date'));
      expect(el.nativeElement.textContent.trim().length).toBeGreaterThan(0);
    });
  });

  // ─── Successful fetch ──────────────────────────────────────
  describe('Successful data fetch', () => {
    it('should populate opdCount from API', () => {
      flushAll();
      expect(component.opdCount).toBe(12);
    });

    it('should populate ipdCount from API', () => {
      flushAll();
      expect(component.ipdCount).toBe(4);
    });

    it('should populate opdTodayCount from API', () => {
      flushAll();
      expect(component.opdTodayCount).toBe(5);
    });

    it('should set lastUpdated after a successful fetch', () => {
      flushAll();
      expect(component.lastUpdated).toBeTruthy();
    });

    it('should set isLoading to false after fetch completes', () => {
      flushAll();
      expect(component.isLoading).toBeFalse();
    });

    it('should clear errorMessage on success', () => {
      flushAll();
      expect(component.errorMessage).toBe('');
    });
  });

  // ─── DOM rendering ────────────────────────────────────────
  describe('DOM rendering', () => {
    it('should render the OPD total count in the first .count-value', () => {
      flushAll();
      const values = fixture.debugElement.queryAll(By.css('.count-value'));
      expect(values[0].nativeElement.textContent.trim()).toBe('12');
    });

    it('should render the OPD today count in the second .count-value', () => {
      flushAll();
      const values = fixture.debugElement.queryAll(By.css('.count-value'));
      expect(values[1].nativeElement.textContent.trim()).toBe('5');
    });

    it('should render the IPD count in the third .count-value', () => {
      flushAll();
      const values = fixture.debugElement.queryAll(By.css('.count-value'));
      expect(values[2].nativeElement.textContent.trim()).toBe('4');
    });

    it('should show "—" placeholders while loading', () => {
      fixture.detectChanges();
      const values = fixture.debugElement.queryAll(By.css('.count-value'));
      values.forEach(v => expect(v.nativeElement.textContent.trim()).toBe('—'));
      httpMock.expectOne(`${API}/opd?limit=1`).flush(mockOpdResponse);
      httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(mockIpdResponse);
      httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(mockOpdTodayResponse);
    });

    it('should render OPD and IPD navigation links', () => {
      flushAll();
      const links = fixture.debugElement.queryAll(By.css('.link-box a'));
      const hrefs = links.map(l => l.nativeElement.getAttribute('href'));
      expect(hrefs).toContain('/opd');
      expect(hrefs).toContain('/ipd');
    });

    it('should render All Patients nav link', () => {
      flushAll();
      const links = fixture.debugElement.queryAll(By.css('.link-box a'));
      const hrefs = links.map(l => l.nativeElement.getAttribute('href'));
      expect(hrefs).toContain('/patients');
    });

    it('should show last-updated text after successful load', () => {
      flushAll();
      const el = fixture.debugElement.query(By.css('.last-updated'));
      expect(el).toBeTruthy();
      expect(el.nativeElement.textContent).toContain(component.lastUpdated);
    });
  });

  // ─── Zero / missing counts ─────────────────────────────────
  describe('Null / missing pagination', () => {
    it('should default opdCount to 0 when pagination is null', () => {
      flushAll({ success: true, data: [], pagination: null } as any, mockIpdResponse, mockOpdTodayResponse);
      expect(component.opdCount).toBe(0);
    });

    it('should default ipdCount to 0 when pagination is null', () => {
      flushAll(mockOpdResponse, { success: true, data: [], pagination: null } as any, mockOpdTodayResponse);
      expect(component.ipdCount).toBe(0);
    });

    it('should default opdTodayCount to 0 when pagination is null', () => {
      flushAll(mockOpdResponse, mockIpdResponse, { success: true, data: [], pagination: null } as any);
      expect(component.opdTodayCount).toBe(0);
    });
  });

  // ─── Error handling ────────────────────────────────────────
  describe('Error handling', () => {
    function triggerOpdError() {
      fixture.detectChanges();
      httpMock.expectOne(`${API}/opd?limit=1`).error(new ErrorEvent('network error'));
      httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(mockIpdResponse);
      httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(mockOpdTodayResponse);
      fixture.detectChanges();
    }

    it('should set errorMessage on HTTP error', () => {
      triggerOpdError();
      expect(component.errorMessage).toBeTruthy();
      expect(component.isLoading).toBeFalse();
    });

    it('should display the error banner in the DOM', () => {
      triggerOpdError();
      const banner = fixture.debugElement.query(By.css('.error-banner'));
      expect(banner).toBeTruthy();
    });

    it('should render the error text with role="alert"', () => {
      triggerOpdError();
      const banner = fixture.debugElement.query(By.css('.error-banner'));
      expect(banner.nativeElement.getAttribute('role')).toBe('alert');
    });

    it('should render a Retry button inside the error banner', () => {
      triggerOpdError();
      const retryBtn = fixture.debugElement.query(By.css('.btn-retry'));
      expect(retryBtn).toBeTruthy();
    });

    it('should call refreshCounts when Retry button is clicked', () => {
      triggerOpdError();
      spyOn(component, 'refreshCounts').and.callThrough();
      const retryBtn = fixture.debugElement.query(By.css('.btn-retry'));
      retryBtn.triggerEventHandler('click', null);
      expect(component.refreshCounts).toHaveBeenCalled();
      httpMock.expectOne(`${API}/opd?limit=1`).flush(mockOpdResponse);
      httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(mockIpdResponse);
      httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(mockOpdTodayResponse);
    });

    it('should clear errorMessage on successful refresh after error', () => {
      triggerOpdError();
      expect(component.errorMessage).toBeTruthy();

      component.refreshCounts();
      httpMock.expectOne(`${API}/opd?limit=1`).flush(mockOpdResponse);
      httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(mockIpdResponse);
      httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(mockOpdTodayResponse);
      fixture.detectChanges();
      expect(component.errorMessage).toBe('');
    });

    it('should hide last-updated text when there is an error', () => {
      triggerOpdError();
      const el = fixture.debugElement.query(By.css('.last-updated'));
      expect(el).toBeNull();
    });
  });

  // ─── Refresh button ────────────────────────────────────────
  describe('Refresh button', () => {
    it('should be disabled while loading', () => {
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('.btn-refresh')).nativeElement;
      expect(btn.disabled).toBeTrue();
      httpMock.expectOne(`${API}/opd?limit=1`).flush(mockOpdResponse);
      httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(mockIpdResponse);
      httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(mockOpdTodayResponse);
    });

    it('should be enabled after loading completes', () => {
      flushAll();
      const btn = fixture.debugElement.query(By.css('.btn-refresh')).nativeElement;
      expect(btn.disabled).toBeFalse();
    });

    it('should call refreshCounts when clicked', () => {
      flushAll();
      spyOn(component, 'refreshCounts').and.callThrough();
      fixture.debugElement.query(By.css('.btn-refresh')).triggerEventHandler('click', null);
      expect(component.refreshCounts).toHaveBeenCalled();
      httpMock.expectOne(`${API}/opd?limit=1`).flush(mockOpdResponse);
      httpMock.expectOne(`${API}/ipd?limit=1&status=admitted`).flush(mockIpdResponse);
      httpMock.expectOne(`${API}/opd?limit=1&date=${TODAY_ISO}`).flush(mockOpdTodayResponse);
    });
  });

  // ─── Quick Actions ─────────────────────────────────────────
  describe('Quick action navigation', () => {
    it('should navigate to /opd with action=new on goToNewOPD()', () => {
      flushAll();
      const spy = spyOn(router, 'navigate');
      component.goToNewOPD();
      expect(spy).toHaveBeenCalledWith(['/opd'], { queryParams: { action: 'new' } });
    });

    it('should navigate to /ipd with action=new on goToNewIPD()', () => {
      flushAll();
      const spy = spyOn(router, 'navigate');
      component.goToNewIPD();
      expect(spy).toHaveBeenCalledWith(['/ipd'], { queryParams: { action: 'new' } });
    });

    it('should render Register OPD and Admit Patient action buttons', () => {
      flushAll();
      const btns = fixture.debugElement.queryAll(By.css('.btn-action'));
      expect(btns.length).toBe(2);
    });

    it('should call goToNewOPD when Register OPD button is clicked', () => {
      flushAll();
      spyOn(component, 'goToNewOPD');
      const btn = fixture.debugElement.query(By.css('.btn-action-primary'));
      btn.triggerEventHandler('click', null);
      expect(component.goToNewOPD).toHaveBeenCalled();
    });

    it('should call goToNewIPD when Admit Patient button is clicked', () => {
      flushAll();
      spyOn(component, 'goToNewIPD');
      const btn = fixture.debugElement.query(By.css('.btn-action-teal'));
      btn.triggerEventHandler('click', null);
      expect(component.goToNewIPD).toHaveBeenCalled();
    });
  });

  // ─── Cleanup ──────────────────────────────────────────────
  describe('ngOnDestroy', () => {
    it('should call next on the destroy$ subject', () => {
      flushAll();
      spyOn((component as any).destroy$, 'next').and.callThrough();
      component.ngOnDestroy();
      expect((component as any).destroy$.next).toHaveBeenCalled();
    });
  });
});