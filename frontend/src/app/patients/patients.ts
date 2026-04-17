import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../auth.service';

const API = 'http://localhost:3000/api';

export interface PatientRecord {
  rowNo: number;
  date: string;
  time: string;
  regNo: string;
  idNumber: string;
  names: string;
  age: number;
  sex: string;
  village: string;
  kgs: string;
  attendance: string;
  diagnosis: string;
  treatment: string;
  source: 'OPD' | 'IPD';
}

export type SourceFilter = 'ALL' | 'OPD' | 'IPD';
export type SortField = 'date' | 'names' | 'age';
export type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.html',
  styleUrls: ['./patients.scss'],
})
export class Patients implements OnInit, OnDestroy {
  public patientRecords: PatientRecord[] = [];
  public searchText = '';
  public filterDate = '';
  public sourceFilter: SourceFilter = 'ALL';
  public sortField: SortField = 'date';
  public sortDir: SortDir = 'desc';
  public isLoading = false;
  public errorMessage = '';

  // Pagination
  public pageSize = 10;
  public currentPage = 1;
  public pageSizeOptions = [5, 10, 20, 50];

  private destroy$ = new Subject<void>();

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPatientRecords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Stats ──────────────────────────────────────────────────
  public get totalPatients(): number {
    return this.patientRecords.length;
  }

  public get opdCount(): number {
    return this.patientRecords.filter(r => r.source === 'OPD').length;
  }

  public get ipdCount(): number {
    return this.patientRecords.filter(r => r.source === 'IPD').length;
  }

  public get todayCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.patientRecords.filter(r => r.date === today).length;
  }

  // ─── Source filter tabs ──────────────────────────────────────
  public setSourceFilter(filter: SourceFilter): void {
    this.sourceFilter = filter;
    this.currentPage = 1;
  }

  // ─── Sorting ─────────────────────────────────────────────────
  public setSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.currentPage = 1;
  }

  public sortIcon(field: SortField): string {
    if (this.sortField !== field) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  // ─── Filtered + sorted records ───────────────────────────────
  public get filteredPatientRecords(): PatientRecord[] {
    const term = this.searchText.trim().toLowerCase();
    const dateFilter = this.filterDate.trim();

    let records = this.patientRecords.filter(record => {
      const matchesSource =
        this.sourceFilter === 'ALL' || record.source === this.sourceFilter;

      const matchesSearch =
        !term ||
        record.names.toLowerCase().includes(term) ||
        record.regNo.toLowerCase().includes(term) ||
        record.idNumber.toLowerCase().includes(term) ||
        record.diagnosis.toLowerCase().includes(term) ||
        record.village.toLowerCase().includes(term);

      const matchesDate = !dateFilter || record.date === dateFilter;

      return matchesSource && matchesSearch && matchesDate;
    });

    records = [...records].sort((a, b) => {
      let cmp = 0;
      if (this.sortField === 'date') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (this.sortField === 'names') {
        cmp = a.names.localeCompare(b.names);
      } else if (this.sortField === 'age') {
        cmp = a.age - b.age;
      }
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    return records;
  }

  public get paginatedRecords(): PatientRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatientRecords.slice(start, start + this.pageSize);
  }

  public get totalRecordPages(): number {
    return Math.max(1, Math.ceil(this.filteredPatientRecords.length / this.pageSize));
  }

  public get pageNumbers(): number[] {
    const total = this.totalRecordPages;
    const current = this.currentPage;
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  public goToPage(page: number): void {
    if (page >= 1 && page <= this.totalRecordPages) {
      this.currentPage = page;
    }
  }

  public nextRecordPage(): void {
    if (this.currentPage < this.totalRecordPages) this.currentPage++;
  }

  public prevRecordPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  public onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
  }

  // ─── Export ──────────────────────────────────────────────────
  public exportCSV(): void {
    const headers = [
      'No', 'Date', 'Time', 'Reg No', 'ID Number', 'Names',
      'Age', 'Sex', 'Village', 'Kgs', 'Attendance', 'Diagnosis', 'Treatment', 'Source',
    ];
    const rows = this.filteredPatientRecords.map(r => [
      r.rowNo, r.date, r.time, r.regNo, r.idNumber, `"${r.names}"`,
      r.age, r.sex, `"${r.village}"`, r.kgs, r.attendance,
      `"${r.diagnosis}"`, `"${r.treatment}"`, r.source,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Refresh ─────────────────────────────────────────────────
  public refreshPatientRecords(): void {
    this.currentPage = 1;
    this.loadPatientRecords();
  }

  public clearFilters(): void {
    this.searchText = '';
    this.filterDate = '';
    this.sourceFilter = 'ALL';
    this.currentPage = 1;
  }

  public get hasActiveFilters(): boolean {
    return !!this.searchText || !!this.filterDate || this.sourceFilter !== 'ALL';
  }

  // ─── Role helpers ─────────────────────────────────────────────
  public get isAdmin(): boolean { return this.auth.isAdmin(); }
  public get isNurse(): boolean { return this.auth.isNurse(); }

  // ─── Data loading ─────────────────────────────────────────────
  public loadPatientRecords(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      opd: this.http.get<any>(`${API}/opd?limit=1000`),
      ipd: this.http.get<any>(`${API}/ipd?limit=1000`),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.isLoading = false; })
      )
      .subscribe({
        next: ({ opd, ipd }) => {
          const opdRecords: PatientRecord[] = (opd?.data ?? []).map((v: any) => ({
            rowNo: 0,
            date: v.visit_date ?? '',
            time: '',
            regNo: v.patient_number ?? '',
            idNumber: v.patient_id ?? '',
            names: v.patient_name ?? '',
            age: v.age ?? 0,
            sex: v.gender ?? '',
            village: v.address ?? '',
            kgs: '',
            attendance: 'OPD Visit',
            diagnosis: v.diagnosis ?? '',
            treatment: v.treatment_plan ?? '',
            source: 'OPD' as const,
          }));

          const ipdRecords: PatientRecord[] = (ipd?.data ?? []).map((v: any) => ({
            rowNo: 0,
            date: v.admission_date ?? '',
            time: '',
            regNo: v.patient_number ?? '',
            idNumber: v.patient_id ?? '',
            names: v.patient_name ?? '',
            age: v.age ?? 0,
            sex: v.gender ?? '',
            village: v.ward ?? '',
            kgs: '',
            attendance: 'IPD Admission',
            diagnosis: v.diagnosis ?? '',
            treatment: v.treatment_notes ?? '',
            source: 'IPD' as const,
          }));

          // Merge, deduplicate by source+id, sort by date desc, re-number
          const merged = [...opdRecords, ...ipdRecords];
          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          merged.forEach((r, i) => { r.rowNo = i + 1; });
          this.patientRecords = merged;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load patient records. Please try again.';
          console.error('Patients load error:', err);
          this.patientRecords = [];
        },
      });
  }
}