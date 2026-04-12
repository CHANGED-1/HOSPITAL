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

interface OPDRegisterEntry {
  opdNo: string;
  regNo: string;
  date: string;
  patientName: string;
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
  malariaTest: string;
  tbScreen: string;
  palliativeCare: string;
  alcoholUse: string;
  referredFrom: string;
  notes: string;
  editing?: boolean;
}

const OPD_STORAGE = 'hospital_opd_register';
const OPD_METADATA_STORAGE = 'hospital_opd_metadata';
const USERS_STORAGE = 'hospital_system_users';

@Component({
  selector: 'app-opd-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './opd-register.html',
  styleUrls: ['./opd-register.scss'],
})
export class OPDRegister implements OnInit {
  public doctors: string[] = [];

  public opdRegister: OPDRegisterEntry[] = [];
  public newOpdEntry: OPDRegisterEntry = {
    opdNo: '',
    regNo: '',
    date: new Date().toISOString().slice(0, 10),
    patientName: '',
    age: 0,
    sex: 'Female',
    clientCategory: 'General',
    contact: '',
    address: '',
    complaint: '',
    diagnosis: '',
    treatment: '',
    department: '',
    doctor: '',
    malariaTest: 'Not done',
    tbScreen: 'No',
    palliativeCare: 'No',
    alcoholUse: 'No',
    referredFrom: '',
    notes: '',
  };

  // HMIS metadata
  public healthFacilityName = '';
  public month = '';
  public year = '';
  public ward = '';

  // Filters
  public filterDate = '';
  public filterDoctor = '';
  public filterDepartment = '';
  public filterDiagnosis = '';
  public filterMalariaTest = '';
  public filterPatientName = '';

  // Pagination
  public pageSize = 10;
  public currentPage = 1;
  public pageSizeOptions = [5, 10, 20];

  // Bulk delete
  public selectedRows = new Set<number>();

  constructor() {
    this.loadDoctorsFromUsers();
    this.loadOpdRegister();
    this.loadOpdMetadata();
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
        this.newOpdEntry.doctor = this.doctors[0];
      }
    } catch (e) {
      console.error('Error loading doctors:', e);
      this.doctors = [];
    }
  }

  private loadOpdRegister() {
    if (typeof window === 'undefined') {
      this.opdRegister = [];
      return;
    }
    const raw = localStorage.getItem(OPD_STORAGE);
    if (!raw) {
      this.opdRegister = [];
      return;
    }
    try {
      this.opdRegister = JSON.parse(raw) as OPDRegisterEntry[];
    } catch {
      this.opdRegister = [];
    }
  }

  private saveOpdRegister() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OPD_STORAGE, JSON.stringify(this.opdRegister));
  }

  private loadOpdMetadata() {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(OPD_METADATA_STORAGE);
    if (!raw) return;
    try {
      const metadata = JSON.parse(raw);
      this.healthFacilityName = metadata.healthFacilityName || '';
      this.month = metadata.month || '';
      this.year = metadata.year || '';
      this.ward = metadata.ward || '';
    } catch {
      // Ignore errors
    }
  }

  public saveOpdMetadata() {
    if (typeof window === 'undefined') return;
    const metadata = {
      healthFacilityName: this.healthFacilityName,
      month: this.month,
      year: this.year,
      ward: this.ward,
    };
    localStorage.setItem(OPD_METADATA_STORAGE, JSON.stringify(metadata));
  }

  public get filteredOpdRegister() {
    return this.opdRegister.filter(entry => {
      const matchesDate = !this.filterDate || entry.date.includes(this.filterDate);
      const matchesDoctor = !this.filterDoctor || entry.doctor === this.filterDoctor;
      const matchesDepartment = !this.filterDepartment || entry.department === this.filterDepartment;
      const matchesMalaria = !this.filterMalariaTest || entry.malariaTest === this.filterMalariaTest;
      const matchesPatientName = !this.filterPatientName || entry.patientName.toLowerCase().includes(this.filterPatientName.toLowerCase());
      const matchesDiagnosis = !this.filterDiagnosis || entry.diagnosis?.toLowerCase().includes(this.filterDiagnosis.toLowerCase());
      return matchesDate && matchesDoctor && matchesDepartment && matchesMalaria && matchesPatientName && matchesDiagnosis;
    });
  }

  public exportToCsv() {
    const headers = [
      'OPD No', 'Reg No', 'Date', 'Patient Name', 'Age', 'Sex', 'Client Category', 'Contact', 'Address',
      'Complaint', 'Diagnosis', 'Treatment', 'Department', 'Doctor', 'Malaria Test', 'TB Screen',
      'Palliative Care', 'Alcohol Use', 'Referred From', 'Notes'
    ];
    const rows = this.filteredOpdRegister.map(entry => [
      entry.opdNo, entry.regNo, entry.date, entry.patientName, entry.age, entry.sex, entry.clientCategory,
      entry.contact, entry.address, entry.complaint, entry.diagnosis, entry.treatment, entry.department,
      entry.doctor, entry.malariaTest, entry.tbScreen, entry.palliativeCare, entry.alcoholUse,
      entry.referredFrom, entry.notes
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opd_register_filtered.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public addOpdEntry() {
    if (!this.newOpdEntry.date || !this.newOpdEntry.patientName || !this.newOpdEntry.age || !this.newOpdEntry.sex || !this.newOpdEntry.doctor) {
      alert('Required fields: Date, Patient Name, Age, Sex,, Doctor.');
      return;
    }

    const nextReg = `REG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${this.opdRegister.length + 1}`;
    this.newOpdEntry.regNo = this.newOpdEntry.regNo?.trim() ? this.newOpdEntry.regNo : nextReg;

    const entry = { ...this.newOpdEntry };
    if (!entry.opdNo) {
      entry.opdNo = `OPD-${Date.now()}`;
    }

    this.opdRegister = [entry, ...this.opdRegister];
    this.saveOpdRegister();

    this.newOpdEntry = {
      opdNo: '',
      regNo: '',
      date: new Date().toISOString().slice(0, 10),
      patientName: '',
      age: 0,
      sex: 'Female',
      clientCategory: 'General',
      contact: '',
      address: '',
      weight: '',
      height: '',
      complaint: '',
      diagnosis: '',
      treatment: '',
      department: '',
      doctor: this.doctors.length > 0 ? this.doctors[0] : '',
      malariaTest: 'Not done',
      tbScreen: 'No',
      palliativeCare: 'No',
      alcoholUse: 'No',
      referredFrom: '',
      notes: '',
    };
  }

  public editOpdEntry(index: number) {
    this.opdRegister[index].editing = true;
  }

  public saveOpdEntry(index: number) {
    this.opdRegister[index].editing = false;
    this.saveOpdRegister();
  }

  public cancelOpdEdit(index: number) {
    this.opdRegister[index].editing = false;
    this.loadOpdRegister();
  }

  public deleteOpdEntry(index: number) {
    this.opdRegister.splice(index, 1);
    this.saveOpdRegister();
  }

  public toggleRowSelection(index: number) {
    if (this.selectedRows.has(index)) {
      this.selectedRows.delete(index);
    } else {
      this.selectedRows.add(index);
    }
  }

  public deleteSelectedRows() {
    const indicesToDelete = Array.from(this.selectedRows).sort((a, b) => b - a);
    indicesToDelete.forEach(index => {
      this.opdRegister.splice(index, 1);
    });
    this.selectedRows.clear();
    this.saveOpdRegister();
  }

  public get paginatedEntries() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredOpdRegister.slice(startIndex, startIndex + this.pageSize);
  }

  public get totalPages() {
    return Math.ceil(this.filteredOpdRegister.length / this.pageSize);
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
}