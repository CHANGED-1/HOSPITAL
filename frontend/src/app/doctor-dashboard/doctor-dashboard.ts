import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

interface PatientAssignment {
  rowNo: number;
  date: string;
  regNo: string;
  idNumber: string;
  patientName: string;
  age: number;
  sex: string;
  village: string;
  source: 'OPD' | 'IPD';
  doctorName: string;
  
  // Doctor inputs
  diagnosis: string;
  treatment: string;
  diagnoses: string[];
  treatments: string[];
  notes: string;
  status: 'pending' | 'completed' | 'ready-for-payment' | 'paid';
  
  // Original data ids
  originalId?: string;
}

interface OPDRegisterEntry {
  opdNo?: string;
  regNo?: string;
  date?: string;
  patientName?: string;
  age?: number;
  sex?: string;
  address?: string;
  doctor?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

interface IPDEntry {
  id?: string;
  date?: string;
  patientName?: string;
  ward?: string;
  doctor?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

const OPD_STORAGE = 'hospital_opd_register';
const IPD_STORAGE = 'hospital_ipd_register';
const DOCTOR_ASSIGNMENTS_STORAGE = 'hospital_doctor_assignments';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-dashboard.html',
  styleUrls: ['./doctor-dashboard.scss'],
})
export class DoctorDashboard implements OnInit {
  public assignedPatients: PatientAssignment[] = [];
  public filteredPatients: PatientAssignment[] = [];
  public currentDoctor = '';
  public searchText = '';
  public filterStatus: string = 'all';

  public diagnosisOptions: string[] = [];
  public treatmentOptions: string[] = []; // goods/service names

  // Search/filtering for diagnosis and treatment
  public diagnosisSearchInput = '';
  public treatmentSearchInput = '';
  public filteredDiagnosisOptions: string[] = [];
  public filteredTreatmentOptions: string[] = [];
  public showDiagnosisSuggestions = false;
  public showTreatmentSuggestions = false;
  public selectedDiagnosisIndex = -1;
  public selectedTreatmentIndex = -1;
  
  // Pagination
  public pageSize = 10;
  public currentPage = 1;
  public pageSizeOptions = [5, 10, 20];

  // UI
  public expandedRowIndex = -1;
  public editingRowIndex = -1;
  private lastRefreshDate = '';

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.currentDoctor = this.auth.currentUser?.username || 'Dr. Unknown';
    this.loadDiagnosisOptions();
    this.loadTreatmentOptions();
    this.loadAssignedPatients();
    this.startDailyRefresh();
  }

  private loadDiagnosisOptions(): void {
    if (typeof window === 'undefined') { this.diagnosisOptions = []; return; }
    const raw = localStorage.getItem('hospital_diagnoses_register');
    if (!raw) { this.diagnosisOptions = []; return; }
    try {
      const diag = JSON.parse(raw) as Array<{ code?: string; name?: string }>;
      this.diagnosisOptions = diag
        .map((d) => (d.code && d.name ? `${d.code} - ${d.name}` : d.name || d.code || ''))
        .filter((v, i, a) => !!v && a.indexOf(v) === i)
        .sort();
    } catch {
      this.diagnosisOptions = [];
    }
  }

  private loadTreatmentOptions(): void {
    if (typeof window === 'undefined') { this.treatmentOptions = []; return; }
    const raw = localStorage.getItem('hospital_goods_items');
    if (!raw) { this.treatmentOptions = []; return; }
    try {
      const goods = JSON.parse(raw) as Array<{ productName?: string; alternativeName?: string; category?: string }>;
      const names = new Set<string>();
      goods.forEach((g) => {
        if (g.productName) names.add(g.productName);
        if (g.alternativeName) names.add(g.alternativeName);
      });
      this.treatmentOptions = Array.from(names).filter((n) => !!n).sort();
    } catch {
      this.treatmentOptions = [];
    }
  }

  private loadAssignedPatients(): void {
    if (typeof window === 'undefined') {
      this.assignedPatients = [];
      return;
    }

    const patients: PatientAssignment[] = [];
    let rowNo = 1;

    // Load from OPD
    const opdRaw = localStorage.getItem(OPD_STORAGE);
    if (opdRaw) {
      try {
        const opdEntries = JSON.parse(opdRaw) as OPDRegisterEntry[];
        opdEntries.forEach((entry) => {
          if (entry.doctor === this.currentDoctor || !this.currentDoctor) {
            const savedAssignment = this.loadSavedAssignment(entry.opdNo || '');
            patients.push({
              rowNo: rowNo++,
              date: entry.date || '',
              regNo: entry.regNo || '',
              idNumber: entry.opdNo || '',
              patientName: entry.patientName || '',
              age: entry.age || 0,
              sex: entry.sex || '',
              village: entry.address || '',
              source: 'OPD',
              doctorName: entry.doctor || '',
              diagnosis: savedAssignment?.diagnosis || entry.diagnosis || '',
              treatment: savedAssignment?.treatment || entry.treatment || '',
              diagnoses: this.toList(savedAssignment?.diagnosis || entry.diagnosis),
              treatments: this.toList(savedAssignment?.treatment || entry.treatment),
              notes: savedAssignment?.notes || entry.notes || '',
              status: savedAssignment?.status || 'pending',
              originalId: entry.opdNo,
            });
          }
        });
      } catch (e) {
        console.error('Error parsing OPD data:', e);
      }
    }

    // Load from IPD
    const ipdRaw = localStorage.getItem(IPD_STORAGE);
    if (ipdRaw) {
      try {
        const ipdEntries = JSON.parse(ipdRaw) as IPDEntry[];
        ipdEntries.forEach((entry) => {
          if (entry.doctor === this.currentDoctor || !this.currentDoctor) {
            const savedAssignment = this.loadSavedAssignment(entry.id || '');
            patients.push({
              rowNo: rowNo++,
              date: entry.date || '',
              regNo: '',
              idNumber: entry.id || '',
              patientName: entry.patientName || '',
              age: 0,
              sex: '',
              village: entry.ward || '',
              source: 'IPD',
              doctorName: entry.doctor || '',
              diagnosis: savedAssignment?.diagnosis || entry.diagnosis || '',
              treatment: savedAssignment?.treatment || entry.treatment || '',              diagnoses: this.toList(savedAssignment?.diagnosis || entry.diagnosis),
              treatments: this.toList(savedAssignment?.treatment || entry.treatment),              notes: savedAssignment?.notes || entry.notes || '',
              status: savedAssignment?.status || 'pending',
              originalId: entry.id,
            });
          }
        });
      } catch (e) {
        console.error('Error parsing IPD data:', e);
      }
    }

    // Sort by date descending
    patients.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Re-index row numbers
    patients.forEach((patient, index) => {
      patient.rowNo = index + 1;
    });

    this.assignedPatients = patients;
    this.applyFilters();
  }

  public toList(value?: string): string[] {
    if (!value) {
      return [];
    }
    return value
      .split(/\r?\n/) 
      .map((v) => v.trim())
      .filter((v) => !!v);
  }

  private loadSavedAssignment(id: string): PatientAssignment | null {
    if (typeof window === 'undefined') return null;
    const all = localStorage.getItem(DOCTOR_ASSIGNMENTS_STORAGE);
    if (!all) return null;
    try {
      const assignments = JSON.parse(all) as PatientAssignment[];
      return assignments.find((a) => a.originalId === id) || null;
    } catch (e) {
      return null;
    }
  }

  private saveAssignment(patient: PatientAssignment): void {
    if (typeof window === 'undefined') return;
    let assignments: PatientAssignment[] = [];
    const all = localStorage.getItem(DOCTOR_ASSIGNMENTS_STORAGE);
    if (all) {
      try {
        assignments = JSON.parse(all);
      } catch (e) {
        assignments = [];
      }
    }

    // Remove old entry if exists
    assignments = assignments.filter((a) => a.originalId !== patient.originalId);
    // Add updated entry
    assignments.push(patient);
    localStorage.setItem(DOCTOR_ASSIGNMENTS_STORAGE, JSON.stringify(assignments));
  }

  public applyFilters(): void {
    let filtered = this.assignedPatients;

    // Search filter
    if (this.searchText.trim()) {
      const term = this.searchText.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.patientName.toLowerCase().includes(term) ||
          p.regNo.toLowerCase().includes(term) ||
          p.idNumber.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === this.filterStatus);
    }

    this.filteredPatients = filtered;
    this.currentPage = 1;
  }

  public get paginatedPatients(): PatientAssignment[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatients.slice(start, start + this.pageSize);
  }

  public get totalPages(): number {
    return Math.ceil(this.filteredPatients.length / this.pageSize);
  }

  public nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  public prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  public toggleExpanded(index: number): void {
    this.expandedRowIndex = this.expandedRowIndex === index ? -1 : index;
  }

  public startEditing(index: number): void {
    this.editingRowIndex = index;
  }

  public savePatientData(patient: PatientAssignment): void {
    this.syncDiagnosisFields(patient);
    this.syncTreatmentFields(patient);
    this.saveAssignment(patient);
    this.editingRowIndex = -1;
    alert('Patient data saved successfully!');
  }

  public syncDiagnosisFields(patient: PatientAssignment): void {
    patient.diagnosis = (patient.diagnoses || []).filter((d) => !!d).join('\n');
  }

  public syncTreatmentFields(patient: PatientAssignment): void {
    patient.treatment = (patient.treatments || []).filter((t) => !!t).join('\n');
  }

  public selectDiagnosis(patient: PatientAssignment, selected: string): void {
    if (!patient.diagnoses) patient.diagnoses = [];
    if (selected && !patient.diagnoses.includes(selected)) {
      patient.diagnoses.push(selected);
      this.syncDiagnosisFields(patient);
    }
  }

  public selectTreatment(patient: PatientAssignment, selected: string): void {
    if (!patient.treatments) patient.treatments = [];
    if (selected && !patient.treatments.includes(selected)) {
      patient.treatments.push(selected);
      this.syncTreatmentFields(patient);
    }
  }

  public removeDiagnosis(patient: PatientAssignment, diagnosis: string): void {
    if (!patient.diagnoses) return;
    patient.diagnoses = patient.diagnoses.filter((d) => d !== diagnosis);
    this.syncDiagnosisFields(patient);
  }

  public removeTreatment(patient: PatientAssignment, treatment: string): void {
    if (!patient.treatments) return;
    patient.treatments = patient.treatments.filter((t) => t !== treatment);
    this.syncTreatmentFields(patient);
  }

  public markAsReadyForPayment(patient: PatientAssignment): void {
    patient.status = 'ready-for-payment';
    this.saveAssignment(patient);
    alert(`${patient.patientName} marked as ready for payment. They can proceed to Receipt module.`);
  }

  private startDailyRefresh(): void {
    if (typeof window === 'undefined') return;
    this.lastRefreshDate = new Date().toISOString().slice(0, 10);
    window.setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      if (today !== this.lastRefreshDate) {
        this.lastRefreshDate = today;
        this.loadAssignedPatients();
      }
    }, 1000 * 60 * 60);
  }

  public cancelEdit(): void {
    this.editingRowIndex = -1;
    this.loadAssignedPatients();
  }

  public getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'status-completed';
      case 'ready-for-payment':
        return 'status-ready';
      default:
        return 'status-pending';
    }
  }

  public getStatusDisplay(status: string): string {
    switch (status) {
      case 'completed':
        return '✓ Completed';
      case 'paid':
        return '💰 Paid';
      case 'ready-for-payment':
        return '💳 Ready for Payment';
      default:
        return '⏳ Pending';
    }
  }

  // Diagnosis Search methods
  public onDiagnosisSearchInput(value: string): void {
    this.diagnosisSearchInput = value;
    this.showDiagnosisSuggestions = value.trim().length > 0;
    this.selectedDiagnosisIndex = -1; // Reset selection when typing
    this.filterDiagnosisOptions();
  }

  private filterDiagnosisOptions(): void {
    const searchTerm = this.diagnosisSearchInput.trim().toLowerCase();
    if (!searchTerm) {
      this.filteredDiagnosisOptions = [];
      return;
    }
    this.filteredDiagnosisOptions = this.diagnosisOptions
      .filter((d) => d.toLowerCase().includes(searchTerm))
      .slice(0, 10); // Limit to 10 suggestions
  }

  public selectDiagnosisFromSearch(patient: PatientAssignment, diagnosis: string): void {
    this.selectDiagnosis(patient, diagnosis);
    this.diagnosisSearchInput = '';
    this.showDiagnosisSuggestions = false;
    this.filteredDiagnosisOptions = [];
    this.selectedDiagnosisIndex = -1;
  }

  public onDiagnosisSearchKeydown(event: KeyboardEvent, patient: PatientAssignment): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedDiagnosisIndex >= 0 && this.filteredDiagnosisOptions[this.selectedDiagnosisIndex]) {
        // Select the currently highlighted option
        this.selectDiagnosisFromSearch(patient, this.filteredDiagnosisOptions[this.selectedDiagnosisIndex]);
      } else if (this.filteredDiagnosisOptions.length > 0) {
        // Select the first filtered option if none is highlighted
        this.selectDiagnosisFromSearch(patient, this.filteredDiagnosisOptions[0]);
      } else if (this.diagnosisSearchInput.trim()) {
        // If no exact match, add custom entry
        this.selectDiagnosisFromSearch(patient, this.diagnosisSearchInput.trim());
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.filteredDiagnosisOptions.length > 0) {
        this.selectedDiagnosisIndex = Math.min(
          this.selectedDiagnosisIndex + 1,
          this.filteredDiagnosisOptions.length - 1
        );
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.selectedDiagnosisIndex > -1) {
        this.selectedDiagnosisIndex = Math.max(this.selectedDiagnosisIndex - 1, -1);
      }
    } else if (event.key === 'Escape') {
      this.showDiagnosisSuggestions = false;
      this.diagnosisSearchInput = '';
      this.selectedDiagnosisIndex = -1;
    }
  }

  // Treatment Search methods
  public onTreatmentSearchInput(value: string): void {
    this.treatmentSearchInput = value;
    this.showTreatmentSuggestions = value.trim().length > 0;
    this.selectedTreatmentIndex = -1; // Reset selection when typing
    this.filterTreatmentOptions();
  }

  private filterTreatmentOptions(): void {
    const searchTerm = this.treatmentSearchInput.trim().toLowerCase();
    if (!searchTerm) {
      this.filteredTreatmentOptions = [];
      return;
    }
    this.filteredTreatmentOptions = this.treatmentOptions
      .filter((t) => t.toLowerCase().includes(searchTerm))
      .slice(0, 10); // Limit to 10 suggestions
  }

  public selectTreatmentFromSearch(patient: PatientAssignment, treatment: string): void {
    this.selectTreatment(patient, treatment);
    this.treatmentSearchInput = '';
    this.showTreatmentSuggestions = false;
    this.filteredTreatmentOptions = [];
    this.selectedTreatmentIndex = -1;
  }

  public onTreatmentSearchKeydown(event: KeyboardEvent, patient: PatientAssignment): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedTreatmentIndex >= 0 && this.filteredTreatmentOptions[this.selectedTreatmentIndex]) {
        // Select the currently highlighted option
        this.selectTreatmentFromSearch(patient, this.filteredTreatmentOptions[this.selectedTreatmentIndex]);
      } else if (this.filteredTreatmentOptions.length > 0) {
        // Select the first filtered option if none is highlighted
        this.selectTreatmentFromSearch(patient, this.filteredTreatmentOptions[0]);
      } else if (this.treatmentSearchInput.trim()) {
        // If no exact match, add custom entry
        this.selectTreatmentFromSearch(patient, this.treatmentSearchInput.trim());
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.filteredTreatmentOptions.length > 0) {
        this.selectedTreatmentIndex = Math.min(
          this.selectedTreatmentIndex + 1,
          this.filteredTreatmentOptions.length - 1
        );
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.selectedTreatmentIndex > -1) {
        this.selectedTreatmentIndex = Math.max(this.selectedTreatmentIndex - 1, -1);
      }
    } else if (event.key === 'Escape') {
      this.showTreatmentSuggestions = false;
      this.treatmentSearchInput = '';
      this.selectedTreatmentIndex = -1;
    }
  }
}
