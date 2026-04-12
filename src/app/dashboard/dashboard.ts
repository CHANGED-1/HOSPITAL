import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { interval, Subscription } from 'rxjs';

const PATIENT_OPD_STORAGE = 'hospital_opd_register';
const PATIENT_IPD_STORAGE = 'hospital_ipd_register';
const REPORT_STORAGE = 'hospital_reports';
const USERS_STORAGE = 'hospital_system_users';
const SERVICE_STORAGE = 'hospital_goods_items';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  status: string;
  disease?: string;
  diagnosis?: string;
  assignedDoctor?: string;
}

interface DashboardStats {
  patients: number;
  doctors: number;
  services: number;
  reports: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnDestroy {
  public readonly stats: DashboardStats = {
    patients: 0,
    doctors: 0,
    services: 0,
    reports: 0,
  };

  public patients: Patient[] = [];
  public diseaseStats: Array<{ disease: string; count: number; percent: number }> = [];
  public reportsByMonth: Array<{ month: string; count: number }> = [];
  private refreshSubscription: Subscription | null = null;

  private tokenizeDiagnosis(value: string): string[] {
    return value
      .toString()
      .split(/[\r\n,;]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private isMeaningfulDiagnosis(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    const missingValues = new Set([
      'unknown',
      'n/a',
      'na',
      'none',
      'not specified',
      'not available',
      'not recorded',
      'pending',
      'tbd',
      'to be determined',
      '-',
      '--',
      'nil',
      'no diagnosis',
      'diagnosis pending',
    ]);
    return !missingValues.has(normalized);
  }

  private getDiagnosisTokens(value?: unknown): string[] {
    if (!value) return [];

    const tokens = Array.isArray(value)
      ? value.flatMap((item) => this.tokenizeDiagnosis(item?.toString() ?? ''))
      : this.tokenizeDiagnosis(value.toString());

    const meaningful = tokens
      .map((item) => item.trim())
      .filter((item) => this.isMeaningfulDiagnosis(item));

    return meaningful;
  }

  public servicesOffered = [
    { id: 'S01', name: 'General Consultation', details: 'Doctor consultation and exam' },
    { id: 'S02', name: 'Lab Tests', details: 'Blood tests, urinalysis and diagnostics' },
    { id: 'S03', name: 'Immunization', details: 'Vaccines and seasonal shots' },
    { id: 'S04', name: 'Maternity Care', details: 'Antenatal and postnatal support' },
    { id: 'S05', name: 'Dental Care', details: 'Cleaning, extraction, and basic treatment' },
  ];

  public get username() {
    return this.auth.token?.username ?? 'User';
  }

  constructor(public auth: AuthService) {
    this.refreshAllStats();
    
    // Auto-refresh dashboard statistics every 3 seconds
    this.refreshSubscription = interval(3000).subscribe(() => {
      this.refreshAllStats();
    });
  }

  public refreshAllStats(): void {
    this.loadStats();
    this.loadServiceCount();
    this.loadDoctorCount();
    this.loadReportCount();
    this.loadDiseaseStats();
    this.loadReportsByMonth();
  }

  public ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private loadServiceCount() {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(SERVICE_STORAGE);
    if (!raw) {
      this.stats.services = 0;
      return;
    }
    try {
      const items = JSON.parse(raw) as Array<{ category?: string }>;
      // Count only items with category === 'Services'
      const services = items.filter(item => item.category === 'Services');
      this.stats.services = services.length;
    } catch {
      this.stats.services = 0;
    }
  }

  private loadDoctorCount() {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(USERS_STORAGE);
    if (!raw) {
      this.stats.doctors = 0;
      return;
    }
    try {
      const users = JSON.parse(raw) as Array<{ role?: string }>;
      // Count only users with role === 'doctor'
      const doctors = users.filter(user => user.role === 'doctor');
      this.stats.doctors = doctors.length;
    } catch {
      this.stats.doctors = 0;
    }
  }

  private loadReportCount() {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(REPORT_STORAGE);
    if (!raw) {
      this.stats.reports = 0;
      return;
    }
    try {
      const reports = JSON.parse(raw) as Array<{ id?: string }>;
      this.stats.reports = reports.length;
    } catch {
      this.stats.reports = 0;
    }
  }

  public loadStats() {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PATIENT_OPD_STORAGE) : null;
    const ipdRaw = typeof window !== 'undefined' ? localStorage.getItem(PATIENT_IPD_STORAGE) : null;
    
    let entries: any[] = [];
    
    // Load OPD patients
    if (raw) {
      try {
        entries = [...entries, ...JSON.parse(raw) as any[]];
      } catch {
        // ignore
      }
    }
    
    // Load IPD patients
    if (ipdRaw) {
      try {
        entries = [...entries, ...JSON.parse(ipdRaw) as any[]];
      } catch {
        // ignore
      }
    }
    
    this.patients = entries.map((entry) => {
      const rawDiagnosis = entry.disease || entry.diagnosis || entry.secondaryDiagnosis || entry.diagnoses || '';
      const normalizedDiagnosis = Array.isArray(rawDiagnosis)
        ? rawDiagnosis.map((item) => item?.toString().trim() || '').filter(Boolean).join('\n')
        : rawDiagnosis.toString().trim();
      return {
        id: entry.id || entry.opdNo || entry.regNo || '',
        firstName: entry.firstName || entry.patientName || '',
        lastName: entry.lastName || '',
        age: entry.age || 0,
        gender: entry.gender || entry.sex || '',
        status: entry.status || '',
        disease: normalizedDiagnosis || '',
        assignedDoctor: entry.assignedDoctor || entry.doctor || '',
      } as Patient;
    });
    this.stats.patients = this.patients.length;
  }

  private loadDiseaseStats() {
    if (typeof window === 'undefined') {
      this.diseaseStats = [];
      return;
    }

    // Only pull from patients' disease field
    const map = new Map<string, number>();
    this.patients.forEach((p) => {
      this.getDiagnosisTokens(p.disease).forEach((disease) => {
        map.set(disease, (map.get(disease) ?? 0) + 1);
      });
    });

    const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0) || 1;
    this.diseaseStats = Array.from(map.entries())
      .map(([disease, count]) => ({ disease, count, percent: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);
  }

  private loadReportsByMonth() {
    if (typeof window === 'undefined') {
      this.reportsByMonth = [];
      return;
    }

    const raw = localStorage.getItem(REPORT_STORAGE);
    if (!raw) {
      this.reportsByMonth = [];
      return;
    }

    try {
      const reports = JSON.parse(raw) as Array<{ id?: string; date?: string }>;
      const monthMap = new Map<string, number>();

      reports.forEach((report) => {
        if (report.date) {
          // Extract year-month from date string (YYYY-MM-DD format)
          const dateStr = report.date.substring(0, 7); // Get YYYY-MM
          monthMap.set(dateStr, (monthMap.get(dateStr) ?? 0) + 1);
        }
      });

      // Convert to sorted array
      this.reportsByMonth = Array.from(monthMap.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } catch (e) {
      console.error('Error parsing reports for month statistics', e);
      this.reportsByMonth = [];
    }
  }

  public getTopDiseaseCounts(limit = 5) {
    return this.getDiseaseCounts().slice(0, limit);
  }

  public getDiseaseCounts() {
    if (this.diseaseStats.length > 0) {
      return this.diseaseStats;
    }

    const map = new Map<string, number>();
    this.patients.forEach((p) => {
      this.getDiagnosisTokens(p.disease).forEach((disease) => {
        map.set(disease, (map.get(disease) ?? 0) + 1);
      });
    });
    const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0) || 1;
    return Array.from(map.entries())
      .map(([disease, count]) => ({ disease, count, percent: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);
  }

  public generatePieGradient(items: Array<{disease:string;count:number;percent:number;}>) {
    if (!items.length) return 'conic-gradient(#dfe7ff 0 100%)';
    const colors = ['#2266ff', '#2eb8ff', '#00c9a1', '#ffb800', '#ff6b6b', '#9c6fff', '#00b8d4'];
    let start = 0;
    const segments = items.map((item, index) => {
      const end = start + item.percent;
      const color = colors[index % colors.length];
      const seg = `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return seg;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }
}
