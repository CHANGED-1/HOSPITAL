import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

const API = 'http://localhost:3000/api';

export interface OPDRegisterEntry {
  id?: string;
  opdNo: string;
  regNo: string;
  date: string;
  patientName: string;
  patientId?: string;
  age: number;
  sex: string;
  clientCategory: string;
  contact: string;
  address: string;
  weight?: string;
  height?: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  department: string;
  doctor: string;
  doctorId?: string;
  malariaTest: string;
  tbScreen: string;
  palliativeCare: string;
  alcoholUse: string;
  referredFrom: string;
  notes: string;
  editing?: boolean;
  saving?: boolean;
}

export interface DoctorOption {
  id: string;
  name: string;
  username: string;
}

@Component({
  selector: 'app-opd-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './opd-register.html',
  styleUrls: ['./opd-register.scss'],
})
export class OPDRegister implements OnInit, OnDestroy {
  public doctors: DoctorOption[] = [];
  public opdRegister: OPDRegisterEntry[] = [];
  public newOpdEntry: OPDRegisterEntry = this.blankEntry();

  // UI state
  public formCollapsed = false;
  public filtersCollapsed = false;

  // Filters
  public filterDate         = '';
  public filterDoctor       = '';
  public filterDepartment   = '';
  public filterDiagnosis    = '';
  public filterMalariaTest  = '';
  public filterPatientName  = '';

  // Pagination
  public pageSize        = 10;
  public currentPage     = 1;
  public pageSizeOptions = [5, 10, 20, 50];

  // Bulk selection
  public selectedRows = new Set<number>();

  // State
  public isLoading     = false;
  public isSaving      = false;
  public errorMessage  = '';
  public successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadInitialData(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Initial load ──────────────────────────────────────────────
  private loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      doctors: this.http.get<any>(`${API}/users?role=doctor&status=active&limit=100`),
      visits:  this.http.get<any>(`${API}/opd?limit=1000`),
    })
      .pipe(takeUntil(this.destroy$), finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: ({ doctors, visits }) => {
          this.doctors = (doctors?.data ?? []).map((u: any) => ({
            id: u.id, name: u.name, username: u.username,
          }));
          if (this.doctors.length > 0) {
            this.newOpdEntry.doctor   = this.doctors[0].username;
            this.newOpdEntry.doctorId = this.doctors[0].id;
          }
          this.opdRegister = (visits?.data ?? []).map((v: any) => this.mapVisitToEntry(v));
        },
        error: (err) => {
          this.errorMessage = 'Failed to load OPD data. Please refresh.';
          console.error('OPD load error:', err);
        },
      });
  }

  // ─── Refresh ───────────────────────────────────────────────────
  public refreshOpdRegister(): void {
    this.isLoading    = true;
    this.errorMessage = '';

    this.http.get<any>(`${API}/opd?limit=1000`)
      .pipe(takeUntil(this.destroy$), finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (res) => {
          this.opdRegister = (res?.data ?? []).map((v: any) => this.mapVisitToEntry(v));
        },
        error: (err) => {
          this.errorMessage = 'Failed to refresh records.';
          console.error('OPD refresh error:', err);
        },
      });
  }

  // ─── Mapping ───────────────────────────────────────────────────
  private mapVisitToEntry(v: any): OPDRegisterEntry {
    return {
      id:             v.id,
      opdNo:          v.id ?? '',
      regNo:          v.patient_number ?? '',
      date:           v.visit_date ?? '',
      patientName:    v.patient_name ?? '',
      patientId:      v.patient_id,
      age:            v.age ?? 0,
      sex:            v.gender ?? '',
      clientCategory: v.client_category ?? 'General',
      contact:        v.contact ?? '',
      address:        v.address ?? '',
      weight:         v.weight ?? '',
      height:         v.height ?? '',
      complaint:      v.chief_complaint ?? '',
      diagnosis:      v.diagnosis ?? '',
      treatment:      v.treatment_plan ?? '',
      department:     v.department ?? '',
      doctor:         v.doctor_name ?? '',
      doctorId:       v.doctor_id,
      malariaTest:    v.vitals?.malariaTest ?? 'Not done',
      tbScreen:       v.vitals?.tbScreen ?? 'No',
      palliativeCare: v.vitals?.palliativeCare ?? 'No',
      alcoholUse:     v.vitals?.alcoholUse ?? 'No',
      referredFrom:   v.vitals?.referredFrom ?? '',
      notes:          v.notes ?? '',
      editing:        false,
      saving:         false,
    };
  }

  private mapEntryToBody(entry: OPDRegisterEntry): object {
    return {
      patient_id:      entry.patientId,
      doctor_id:       entry.doctorId,
      visit_date:      entry.date,
      chief_complaint: entry.complaint,
      diagnosis:       entry.diagnosis,
      treatment_plan:  entry.treatment,
      vitals: {
        weight:         entry.weight,
        height:         entry.height,
        malariaTest:    entry.malariaTest,
        tbScreen:       entry.tbScreen,
        palliativeCare: entry.palliativeCare,
        alcoholUse:     entry.alcoholUse,
        referredFrom:   entry.referredFrom,
        clientCategory: entry.clientCategory,
        contact:        entry.contact,
      },
      notes: entry.notes,
    };
  }

  // ─── Add entry ─────────────────────────────────────────────────
  public addOpdEntry(): void {
    const e = this.newOpdEntry;
    if (!e.date || !e.patientName || !e.age || !e.sex || !e.doctorId) {
      this.errorMessage = 'Required fields: Date, Patient Name, Age, Sex, Doctor.';
      return;
    }

    this.isSaving     = true;
    this.errorMessage = '';

    this.resolvePatient(e).then(patientId => {
      e.patientId = patientId;
      this.http.post<any>(`${API}/opd`, this.mapEntryToBody(e))
        .pipe(takeUntil(this.destroy$), finalize(() => { this.isSaving = false; }))
        .subscribe({
          next: (res) => {
            this.opdRegister = [this.mapVisitToEntry(res.data), ...this.opdRegister];
            this.newOpdEntry = this.blankEntry();
            if (this.doctors.length > 0) {
              this.newOpdEntry.doctor   = this.doctors[0].username;
              this.newOpdEntry.doctorId = this.doctors[0].id;
            }
            this.showSuccess('OPD entry added successfully.');
          },
          error: (err) => {
            this.errorMessage = err?.error?.message ?? 'Failed to save OPD entry.';
          },
        });
    }).catch(() => {
      this.isSaving     = false;
      this.errorMessage = 'Failed to resolve patient. Ensure the patient is registered.';
    });
  }

  private resolvePatient(entry: OPDRegisterEntry): Promise<string> {
    if (entry.patientId) return Promise.resolve(entry.patientId);
    return new Promise((resolve, reject) => {
      this.http.get<any>(`${API}/patients?search=${encodeURIComponent(entry.patientName)}&limit=1`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            const patient = res?.data?.[0];
            patient ? resolve(patient.id) : reject(new Error('Patient not found'));
          },
          error: reject,
        });
    });
  }

  // ─── Edit / save / cancel ──────────────────────────────────────
  public editOpdEntry(index: number): void {
    this.opdRegister[index].editing = true;
  }

  public saveOpdEntry(index: number): void {
    const entry = this.opdRegister[index];
    if (!entry.id) return;

    entry.saving     = true;
    this.errorMessage = '';

    const body = {
      chief_complaint: entry.complaint,
      diagnosis:       entry.diagnosis,
      treatment_plan:  entry.treatment,
      vitals: {
        weight:         entry.weight,
        height:         entry.height,
        malariaTest:    entry.malariaTest,
        tbScreen:       entry.tbScreen,
        palliativeCare: entry.palliativeCare,
        alcoholUse:     entry.alcoholUse,
        referredFrom:   entry.referredFrom,
      },
      notes: entry.notes,
    };

    this.http.patch<any>(`${API}/opd/${entry.id}`, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.opdRegister[index] = { ...this.mapVisitToEntry(res.data), editing: false, saving: false };
          this.showSuccess('Entry updated.');
        },
        error: (err) => {
          entry.saving     = false;
          this.errorMessage = err?.error?.message ?? 'Failed to save changes.';
        },
      });
  }

  public cancelOpdEdit(index: number): void {
    this.opdRegister[index].editing = false;
    const id = this.opdRegister[index].id;
    if (!id) return;
    this.http.get<any>(`${API}/opd/${id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => { this.opdRegister[index] = this.mapVisitToEntry(res.data); } });
  }

  // ─── Delete ────────────────────────────────────────────────────
  public deleteOpdEntry(index: number): void {
    const entry = this.opdRegister[index];
    if (!entry.id) return;
    const removed = this.opdRegister.splice(index, 1)[0];
    this.http.patch<any>(`${API}/opd/${entry.id}`, { status: 'completed' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => {
          this.opdRegister.splice(index, 0, removed);
          this.errorMessage = 'Failed to delete entry.';
        },
      });
  }

  public deleteSelectedRows(): void {
    const indices = Array.from(this.selectedRows).sort((a, b) => b - a);
    const removed: Array<{ index: number; entry: OPDRegisterEntry }> = [];
    indices.forEach(i => {
      removed.push({ index: i, entry: this.opdRegister[i] });
      this.opdRegister.splice(i, 1);
    });
    this.selectedRows.clear();
    removed.forEach(({ entry }) => {
      if (!entry.id) return;
      this.http.patch<any>(`${API}/opd/${entry.id}`, { status: 'completed' })
        .pipe(takeUntil(this.destroy$))
        .subscribe({ error: () => console.error(`Failed to delete visit ${entry.id}`) });
    });
  }

  // ─── Row selection — fixed: selectAll toggles properly ────────
  public toggleRowSelection(index: number): void {
    if (this.selectedRows.has(index)) {
      this.selectedRows.delete(index);
    } else {
      this.selectedRows.add(index);
    }
  }

  public get allPageSelected(): boolean {
    if (this.paginatedEntries.length === 0) return false;
    return this.paginatedEntries.every((_, i) => {
      const globalIndex = (this.currentPage - 1) * this.pageSize + i;
      return this.selectedRows.has(globalIndex);
    });
  }

  public toggleSelectAll(): void {
    if (this.allPageSelected) {
      this.paginatedEntries.forEach((_, i) => {
        this.selectedRows.delete((this.currentPage - 1) * this.pageSize + i);
      });
    } else {
      this.paginatedEntries.forEach((_, i) => {
        this.selectedRows.add((this.currentPage - 1) * this.pageSize + i);
      });
    }
  }

  // ─── Filtering — fixed: department uses includes ───────────────
  public get filteredOpdRegister(): OPDRegisterEntry[] {
    return this.opdRegister.filter(entry => {
      const matchesDate       = !this.filterDate        || entry.date.includes(this.filterDate);
      const matchesDoctor     = !this.filterDoctor      || entry.doctor === this.filterDoctor;
      // Fixed: was strict === which never matched free-text input
      const matchesDepartment = !this.filterDepartment  || entry.department.toLowerCase().includes(this.filterDepartment.toLowerCase());
      const matchesMalaria    = !this.filterMalariaTest || entry.malariaTest === this.filterMalariaTest;
      const matchesName       = !this.filterPatientName || entry.patientName.toLowerCase().includes(this.filterPatientName.toLowerCase());
      const matchesDiagnosis  = !this.filterDiagnosis   || (entry.diagnosis ?? '').toLowerCase().includes(this.filterDiagnosis.toLowerCase());
      return matchesDate && matchesDoctor && matchesDepartment && matchesMalaria && matchesName && matchesDiagnosis;
    });
  }

  public get hasActiveFilters(): boolean {
    return !!(this.filterDate || this.filterDoctor || this.filterDepartment ||
              this.filterDiagnosis || this.filterMalariaTest || this.filterPatientName);
  }

  public clearFilters(): void {
    this.filterDate        = '';
    this.filterDoctor      = '';
    this.filterDepartment  = '';
    this.filterDiagnosis   = '';
    this.filterMalariaTest = '';
    this.filterPatientName = '';
    this.currentPage       = 1;
  }

  // ─── Pagination ────────────────────────────────────────────────
  public get paginatedEntries(): OPDRegisterEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOpdRegister.slice(start, start + this.pageSize);
  }

  public get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOpdRegister.length / this.pageSize));
  }

  public get pageNumbers(): number[] {
    const total = this.totalPages;
    const cur   = this.currentPage;
    const range: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) range.push(i);
    return range;
  }

  public goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  public changePageSize(): void { this.currentPage = 1; }

  public trackByIndex(index: number): number { return index; }

  // ─── Doctor selection ──────────────────────────────────────────
  public onDoctorChange(username: string, target: OPDRegisterEntry): void {
    const found     = this.doctors.find(d => d.username === username);
    target.doctor   = username;
    target.doctorId = found?.id ?? '';
  }

  // ─── Export ────────────────────────────────────────────────────
  public exportToCsv(): void {
    const headers = [
      'OPD No','Reg No','Date','Patient Name','Age','Sex','Client Category','Contact','Address',
      'Complaint','Diagnosis','Treatment','Department','Doctor','Malaria Test','TB Screen',
      'Palliative Care','Alcohol Use','Referred From','Notes',
    ];
    const rows = this.filteredOpdRegister.map(e => [
      e.opdNo, e.regNo, e.date, e.patientName, e.age, e.sex, e.clientCategory,
      e.contact, e.address, e.complaint, e.diagnosis, e.treatment, e.department,
      e.doctor, e.malariaTest, e.tbScreen, e.palliativeCare, e.alcoholUse, e.referredFrom, e.notes,
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${f ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `opd_register_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ─── Helpers ───────────────────────────────────────────────────
  private blankEntry(): OPDRegisterEntry {
    return {
      opdNo: '', regNo: '',
      date: new Date().toISOString().slice(0, 10),
      patientName: '', age: 0,
      sex: 'Female', clientCategory: 'General',
      contact: '', address: '', weight: '', height: '',
      complaint: '', diagnosis: '', treatment: '',
      department: '', doctor: '', doctorId: '',
      malariaTest: 'Not done', tbScreen: 'No',
      palliativeCare: 'No', alcoholUse: 'No',
      referredFrom: '', notes: '',
    };
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = ''; }, 3000);
  }
}