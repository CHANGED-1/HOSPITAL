import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { Subject, forkJoin, interval } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';

const API = 'http://localhost:3000/api';
const REFRESH_INTERVAL_MS = 30_000;

export interface DashboardStats {
  patients: number;
  doctors:  number;
  services: number;
  reports:  number;
}

export interface Patient {
  id:             string;
  firstName:      string;
  lastName:       string;
  age:            number;
  gender:         string;
  status:         string;
  disease:        string;
  assignedDoctor: string;
}

export interface DiseaseCount {
  disease: string;
  count:   number;
  percent: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, OnDestroy {
  public stats: DashboardStats = { patients: 0, doctors: 0, services: 0, reports: 0 };
  public patients:     Patient[]      = [];
  public diseaseStats: DiseaseCount[] = [];
  public isLoading    = false;
  public errorMessage = '';

  public readonly today = new Date().toLocaleDateString('en-UG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  public readonly currentYear = new Date().getFullYear();

  public readonly servicesOffered = [
    { id: 'S01', name: 'General Consultation', details: 'Doctor consultation and exam' },
    { id: 'S02', name: 'Lab Tests',            details: 'Blood tests, urinalysis and diagnostics' },
    { id: 'S03', name: 'Immunization',         details: 'Vaccines and seasonal shots' },
    { id: 'S04', name: 'Maternity Care',       details: 'Antenatal and postnatal support' },
    { id: 'S05', name: 'Dental Care',          details: 'Cleaning, extraction, and basic treatment' },
  ];

  private destroy$ = new Subject<void>();

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.isLoading = true;

    interval(REFRESH_INTERVAL_MS).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      switchMap(() => {
        this.isLoading = true;
        return this.fetchAllStats();
      }),
    ).subscribe({
      next:  (data) => this.applyStats(data),
      error: (err)  => {
        this.errorMessage = 'Failed to load dashboard data.';
        console.error('Dashboard load error:', err);
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Public refresh ───────────────────────────────────────────
  public refreshAllStats(): void {
    this.isLoading    = true;
    this.errorMessage = '';

    this.fetchAllStats().pipe(takeUntil(this.destroy$)).subscribe({
      next:  (data) => this.applyStats(data),
      error: (err)  => {
        this.errorMessage = 'Failed to refresh dashboard data.';
        console.error('Dashboard refresh error:', err);
        this.isLoading = false;
      },
    });
  }

  // ─── Parallel API fetch ────────────────────────────────────────
  public fetchAllStats() {
    return forkJoin({
      opd:     this.http.get<any>(`${API}/opd?limit=1000`),
      ipd:     this.http.get<any>(`${API}/ipd?limit=1000`),
      doctors: this.http.get<any>(`${API}/users?role=doctor&status=active&limit=1`),
      drugs:   this.http.get<any>(`${API}/pharmacy/drugs?limit=1`),
    });
  }

  // ─── Apply fetched data ────────────────────────────────────────
  private applyStats(data: { opd: any; ipd: any; doctors: any; drugs: any }): void {
    const opdPatients: Patient[] = (data.opd?.data ?? []).map((v: any) => ({
      id:             v.patient_id ?? v.id,
      firstName:      v.patient_name ?? '',
      lastName:       '',
      age:            v.age ?? 0,
      gender:         v.gender ?? '',
      status:         v.status ?? '',
      disease:        v.diagnosis ?? '',
      assignedDoctor: v.doctor_name ?? '',
    }));

    const ipdPatients: Patient[] = (data.ipd?.data ?? []).map((v: any) => ({
      id:             v.patient_id ?? v.id,
      firstName:      v.patient_name ?? '',
      lastName:       '',
      age:            v.age ?? 0,
      gender:         v.gender ?? '',
      status:         v.status ?? '',
      disease:        v.diagnosis ?? '',
      assignedDoctor: v.doctor_name ?? '',
    }));

    this.patients = [...opdPatients, ...ipdPatients];

    // Fixed operator precedence: parenthesise each ?? expression
    const opdTotal = (data.opd?.pagination?.total  ?? opdPatients.length);
    const ipdTotal = (data.ipd?.pagination?.total  ?? ipdPatients.length);

    this.stats = {
      patients: opdTotal + ipdTotal,
      doctors:  data.doctors?.pagination?.total ?? 0,
      services: this.servicesOffered.length,
      reports:  0,
    };

    this.diseaseStats = this.computeDiseaseStats(this.patients);
    this.isLoading    = false;
    this.errorMessage = '';
  }

  // ─── Disease helpers ───────────────────────────────────────────
  private tokenizeDiagnosis(value: string): string[] {
    return value
      .toString()
      .split(/[\r\n,;]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  private isMeaningfulDiagnosis(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    const skip = new Set([
      'unknown', 'n/a', 'na', 'none', 'not specified', 'not available',
      'not recorded', 'pending', 'tbd', 'to be determined', '-', '--',
      'nil', 'no diagnosis', 'diagnosis pending',
    ]);
    return !skip.has(normalized);
  }

  public getDiagnosisTokens(value?: unknown): string[] {
    if (!value) return [];
    const tokens = Array.isArray(value)
      ? value.flatMap(item => this.tokenizeDiagnosis(item?.toString() ?? ''))
      : this.tokenizeDiagnosis(value.toString());
    return tokens.map(t => t.trim()).filter(t => this.isMeaningfulDiagnosis(t));
  }

  private computeDiseaseStats(patients: Patient[]): DiseaseCount[] {
    const map = new Map<string, number>();
    patients.forEach(p => {
      this.getDiagnosisTokens(p.disease).forEach(d => {
        map.set(d, (map.get(d) ?? 0) + 1);
      });
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
    return Array.from(map.entries())
      .map(([disease, count]) => ({ disease, count, percent: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);
  }

  public getDiseaseCounts(): DiseaseCount[] {
    return this.diseaseStats;
  }

  public getTopDiseaseCounts(limit = 5): DiseaseCount[] {
    return this.diseaseStats.slice(0, limit);
  }

  // ─── Chart ────────────────────────────────────────────────────
  public generatePieGradient(items: DiseaseCount[]): string {
    if (!items.length) return 'conic-gradient(#dfe7ff 0 100%)';
    const colors = ['#2266ff','#2eb8ff','#00c9a1','#ffb800','#ff6b6b','#9c6fff','#00b8d4'];
    let start = 0;
    const segments = items.map((item, i) => {
      const end = start + item.percent;
      const seg = `${colors[i % colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return seg;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  // ─── Auth helpers ──────────────────────────────────────────────
  public get username(): string {
    return this.auth.currentUser?.username ?? 'User';
  }

  public get roleLabel(): string {
    const role = this.auth.role;
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  public get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}