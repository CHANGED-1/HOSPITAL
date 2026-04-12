import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface SystemUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant' | 'pharmacist';
  email: string;
  phone: string;
  department: string;
  status: 'active' | 'inactive';
  createdDate: string;
}

interface IPDEntry {
  id: string;
  date: string;
  patientName: string;
  age: number;
  sex: string;
  admissionDate: string;
  dischargeDate?: string;
  ward: string;
  doctor: string;
  address?: string;
  telephone: string;
  hivStatus: 'known-positive' | 'positive-this-visit' | 'negative' | 'unknown';
  nutritionSupport: 'none' | 'assessment' | 'education' | 'supplements';
  referralFrom: string;
  diagnosis: string;
  secondaryDiagnosis?: string;
  treatment: string;
  outcome: 'alive' | 'dead' | 'recovered' | 'referred' | 'transferred' | 'discharged';
  daysOfCare?: number;
  servicesReceived?: string;
  notes: string;
  editing?: boolean;
}

const IPD_STORAGE = 'hospital_ipd_register';
const USERS_STORAGE = 'hospital_system_users';

@Component({
  selector: 'app-ipd-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ipd-register.html',
  styleUrls: ['./ipd-register.scss'],
})
export class IPDRegister implements OnInit {
  public ipdEntries: IPDEntry[] = [];
  public doctors: string[] = [];
  public wards = [
    'Male medical ward',
    'Female medical ward',
    'Paediatrics ward',
    'Maternity/Obstetric ward',
    'Male surgical',
    'Female surgical',
    'TB ward',
    'Psychiatric ward',
    'Emergency ward',
    'Gynaecology ward',
    'Acute care unit (ACU)',
    'Palliative ward',
    'Eye ward',
    'Intensive care unit (ICU)',
    'Nutrition Ward/Corner',
    'Ear, Nose and Throat (ENT)',
    'Orthopaedic',
    'Neonatal Unit',
    'Rehabilitation ward',
    'Others'
  ];
  public outcomes = ['recovered', 'referred', 'dead', 'absconded', 'transferred', 'discharged'];
  
  public filterDateFrom = '';
  public filterDateTo = '';
  public filterDoctor = '';
  public filterWard = '';
  public filterPatientName = '';

  public pageSize = 10;
  public currentPage = 1;
  public pageSizeOptions = [5, 10, 20];

  public newIpdEntry: IPDEntry = {
    id: '',
    date: new Date().toISOString().slice(0, 10),
    patientName: '',
    age: 0,
    sex: 'Male',
    admissionDate: new Date().toISOString().slice(0, 10),
    dischargeDate: new Date().toISOString().slice(0, 10),
    ward: '',
    doctor: '',
    address: '',
    telephone: '',
    hivStatus: 'unknown',
    nutritionSupport: 'none',
    referralFrom: '',
    diagnosis: '',
    secondaryDiagnosis: '',
    treatment: '',
    outcome: 'discharged',
    daysOfCare: 0,
    servicesReceived: '',
    notes: '',
  };

  constructor() {
    this.loadDoctorsFromUsers();
    this.loadIpdEntries();
  }

  ngOnInit(): void {}

  private loadDoctorsFromUsers(): void {
    if (typeof window === 'undefined') return;

    const usersRaw = localStorage.getItem(USERS_STORAGE);
    if (!usersRaw) return;

    try {
      const allUsers = JSON.parse(usersRaw) as SystemUser[];
      // Filter only active doctors
      const doctorUsers = allUsers.filter((u) => u.role === 'doctor' && u.status === 'active');
      this.doctors = doctorUsers.map((u) => u.username);
      
      // Set default doctor to first available
      if (this.doctors.length > 0) {
        this.newIpdEntry.doctor = this.doctors[0];
      }
    } catch (e) {
      console.error('Error loading doctors:', e);
      this.doctors = [];
    }
  }

  private loadIpdEntries() {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(IPD_STORAGE);
    if (!raw) return;
    try {
      this.ipdEntries = JSON.parse(raw) as IPDEntry[];
    } catch {
      this.ipdEntries = [];
    }
  }

  private saveIpdEntries() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(IPD_STORAGE, JSON.stringify(this.ipdEntries));
  }

  public get filteredIpdEntries() {
    return this.ipdEntries.filter(entry => {
      const entryDate = new Date(entry.admissionDate);
      const fromDate = this.filterDateFrom ? new Date(this.filterDateFrom) : null;
      const toDate = this.filterDateTo ? new Date(this.filterDateTo) : null;

      const matchesDateFrom = !fromDate || entryDate >= fromDate;
      const matchesDateTo = !toDate || entryDate <= toDate;
      const matchesDoctor = !this.filterDoctor || entry.doctor === this.filterDoctor;
      const matchesWard = !this.filterWard || entry.ward === this.filterWard;
      const matchesPatientName = !this.filterPatientName || entry.patientName.toLowerCase().includes(this.filterPatientName.toLowerCase());

      return matchesDateFrom && matchesDateTo && matchesDoctor && matchesWard && matchesPatientName;
    });
  }

  public get paginatedEntries() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredIpdEntries.slice(startIndex, startIndex + this.pageSize);
  }

  public get totalPages() {
    return Math.ceil(this.filteredIpdEntries.length / this.pageSize);
  }

  public goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  public changePageSize() {
    this.currentPage = 1;
  }

  public trackByIndex(index: number): number {
    return index;
  }

  public addIpdEntry() {
    if (!this.newIpdEntry.patientName || !this.newIpdEntry.ward || !this.newIpdEntry.diagnosis) {
      alert('Please enter Patient Name, Ward, and Diagnosis before saving.');
      return;
    }
    // Calculate days of care
    const admission = new Date(this.newIpdEntry.admissionDate);
    const discharge = new Date(this.newIpdEntry.dischargeDate || new Date());
    const daysOfCare = Math.ceil((discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24));
    
    const entry: IPDEntry = {
      ...this.newIpdEntry,
      id: `IPD-${Date.now()}`,
      daysOfCare: Math.max(1, daysOfCare),
    };
    this.ipdEntries = [entry, ...this.ipdEntries];
    this.saveIpdEntries();
    this.resetForm();
  }

  private resetForm() {
    this.newIpdEntry = {
      id: '',
      date: new Date().toISOString().slice(0, 10),
      patientName: '',
      age: 0,
      sex: 'Male',
      admissionDate: new Date().toISOString().slice(0, 10),
      dischargeDate: new Date().toISOString().slice(0, 10),
      ward: '',
      doctor: this.doctors.length > 0 ? this.doctors[0] : '',
      address: '',
      telephone: '',
      hivStatus: 'unknown',
      nutritionSupport: 'none',
      referralFrom: '',
      diagnosis: '',
      secondaryDiagnosis: '',
      treatment: '',
      outcome: 'discharged',
      daysOfCare: 0,
      servicesReceived: '',
      notes: '',
    };
  }

  public getOutcomeClass(outcome: string) {
    switch (outcome) {
      case 'discharged':
        return 'outcome-discharged';
      case 'recovered':
        return 'outcome-recovered';
      case 'transferred':
        return 'outcome-transferred';
      case 'referred':
        return 'outcome-referred';
      case 'alive':
        return 'outcome-alive';
      case 'dead':
        return 'outcome-dead';
      default:
        return 'outcome-unselected';
    }
  }

  public editIpdEntry(index: number) {
    this.ipdEntries[index].editing = true;
  }

  public saveIpdEntry(index: number) {
    const entry = this.ipdEntries[index];
    if (!entry.patientName || !entry.ward || !entry.diagnosis) {
      alert('Patient Name, Ward, and Diagnosis are required.');
      return;
    }
    entry.editing = false;
    this.saveIpdEntries();
  }

  public cancelIpdEdit(index: number) {
    this.ipdEntries[index].editing = false;
    this.loadIpdEntries();
  }

  public deleteIpdEntry(index: number) {
    if (confirm('Are you sure you want to delete this IPD entry?')) {
      this.ipdEntries.splice(index, 1);
      this.saveIpdEntries();
    }
  }

  public exportToCsv() {
    const headers = ['ID', 'Date', 'Admission Date', 'Discharge Date', 'Patient', 'Age', 'Sex', 'Ward', 'Doctor', 'Primary Diagnosis', 'Secondary Diagnosis', 'Outcome', 'Days of Care', 'Services', 'Treatment', 'Notes'];
    const rows = this.filteredIpdEntries.map(entry => [
      entry.id, entry.date, entry.admissionDate, entry.dischargeDate || '', entry.patientName, entry.age, entry.sex,
      entry.ward, entry.doctor, entry.diagnosis, entry.secondaryDiagnosis || '', entry.outcome, entry.daysOfCare || 0, 
      entry.servicesReceived || '', entry.treatment, entry.notes
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipd_register.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public generateHMIS108Report(month: string, year: string): any {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    const monthEntries = this.ipdEntries.filter(entry => {
      const entryDate = new Date(entry.admissionDate);
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Aggregate data by diagnosis and outcome
    const diagnosisStats: Record<string, Record<string, number>> = {};
    let totalAdmissions = 0;
    let totalDischarges = 0;
    let totalDeaths = 0;
    let totalDaysOfCare = 0;

    monthEntries.forEach(entry => {
      totalAdmissions++;
      totalDaysOfCare += entry.daysOfCare || 0;

      if (entry.outcome === 'discharged') totalDischarges++;
      if (entry.outcome === 'dead') totalDeaths++;

      if (!diagnosisStats[entry.diagnosis]) {
        diagnosisStats[entry.diagnosis] = { admitted: 0, discharged: 0, died: 0, referred: 0 };
      }
      diagnosisStats[entry.diagnosis]['admitted']++;
      if (entry.outcome === 'discharged') diagnosisStats[entry.diagnosis]['discharged']++;
      if (entry.outcome === 'dead') diagnosisStats[entry.diagnosis]['died']++;
      if (entry.outcome === 'referred') diagnosisStats[entry.diagnosis]['referred']++;
    });

    return {
      month,
      year,
      totalAdmissions,
      totalDischarges,
      totalDeaths,
      totalDaysOfCare,
      averageLengthOfStay: totalAdmissions > 0 ? (totalDaysOfCare / totalAdmissions).toFixed(2) : 0,
      diagnosisStats,
      entries: monthEntries,
    };
  }
}
