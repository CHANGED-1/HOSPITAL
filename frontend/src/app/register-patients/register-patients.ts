import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

const API = 'http://localhost:3000/api';

@Component({
  selector: 'app-register-patients',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './register-patients.html',
  styleUrls: ['./register-patients.scss'],
})
export class RegisterPatients implements OnInit, OnDestroy {
  public opdCount      = 0;   // total OPD records
  public ipdCount      = 0;   // active IPD admissions
  public opdTodayCount = 0;   // OPD visits registered today
  public lastUpdated   = '';
  public isLoading     = false;
  public errorMessage  = '';

  public readonly today = new Date().toLocaleDateString('en-UG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  private readonly todayISO = new Date().toISOString().slice(0, 10);
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.refreshCounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public refreshCounts(): void {
    this.isLoading    = true;
    this.errorMessage = '';

    forkJoin({
      opd:      this.http.get<any>(`${API}/opd?limit=1`),
      ipd:      this.http.get<any>(`${API}/ipd?limit=1&status=admitted`),
      opdToday: this.http.get<any>(`${API}/opd?limit=1&date=${this.todayISO}`),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading    = false;
          this.lastUpdated  = new Date().toLocaleTimeString('en-UG', {
            hour: '2-digit', minute: '2-digit',
          });
        })
      )
      .subscribe({
        next: ({ opd, ipd, opdToday }) => {
          this.opdCount      = opd?.pagination?.total      ?? 0;
          this.ipdCount      = ipd?.pagination?.total      ?? 0;
          this.opdTodayCount = opdToday?.pagination?.total ?? 0;
        },
        error: (err) => {
          this.errorMessage = 'Could not load counts. Check your connection or server status.';
          console.error('Failed to fetch register counts:', err);
        },
      });
  }

  public goToNewOPD(): void {
    this.router.navigate(['/opd'], { queryParams: { action: 'new' } });
  }

  public goToNewIPD(): void {
    this.router.navigate(['/ipd'], { queryParams: { action: 'new' } });
  }
}