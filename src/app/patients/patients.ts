import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

interface PatientRecord {
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

interface OPDRegisterEntry {
  opdNo?: string;
  regNo?: string;
  date?: string;
  patientName?: string;
  age?: number;
  sex?: string;
  contact?: string;
  address?: string;
  complaint?: string;
  diagnosis?: string;
  treatment?: string;
  department?: string;
  doctor?: string;
  notes?: string;
}

interface IPDEntry {
  id?: string;
  date?: string;
  patientName?: string;
  age?: number;
  sex?: string;
  admissionDate?: string;
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
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.html',
  styleUrls: ['./patients.scss'],
})
export class Patients {
  public doctors = ['Dr. Nalule Moureen', 'Dr. Ongia Isaac', 'Dr. Nampela Annita', 'Nagawa Annet'];
  public patientRecords: PatientRecord[] = [];
  public searchText = '';
  public filterDate = '';

  // Pagination
  public pageSize = 10;
  public currentPage = 1;
  public pageSizeOptions = [5, 10, 20];

  constructor(private auth: AuthService) {
    this.loadPatientRecords();
  }

  private loadPatientRecords() {
    if (typeof window === 'undefined') {
      this.patientRecords = [];
      return;
    }

    const recordMap = new Map<string, PatientRecord>();
    let rowNo = 1;

    // Load from OPD
    const opdRaw = localStorage.getItem(OPD_STORAGE);
    if (opdRaw) {
      try {
        const opdEntries = JSON.parse(opdRaw) as OPDRegisterEntry[];
        opdEntries.forEach((entry) => {
          const key = `OPD-${entry.regNo || entry.opdNo || entry.patientName}`;
          const record: PatientRecord = {
            rowNo: rowNo++,
            date: entry.date || '',
            time: '',
            regNo: entry.regNo || '',
            idNumber: entry.opdNo || '',
            names: entry.patientName || '',
            age: entry.age || 0,
            sex: entry.sex || '',
            village: entry.address || '',
            kgs: '',
            attendance: 'OPD Visit',
            diagnosis: entry.diagnosis || '',
            treatment: entry.treatment || '',
            source: 'OPD',
          };
          recordMap.set(key, record);
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
          const key = `IPD-${entry.id || entry.patientName}`;
          const record: PatientRecord = {
            rowNo: rowNo++,
            date: entry.date || '',
            time: '',
            regNo: '',
            idNumber: entry.id || '',
            names: entry.patientName || '',
            age: entry.age || 0,
            sex: entry.sex || '',
            village: entry.ward || '',
            kgs: '',
            attendance: 'IPD Admission',
            diagnosis: entry.diagnosis || '',
            treatment: entry.treatment || '',
            source: 'IPD',
          };
          recordMap.set(key, record);
        });
      } catch (e) {
        console.error('Error parsing IPD data:', e);
      }
    }

    // Load from doctor assignments and enrich records with diagnosis/treatment
    const assignmentsRaw = localStorage.getItem(DOCTOR_ASSIGNMENTS_STORAGE);
    if (assignmentsRaw) {
      try {
        const assignments = JSON.parse(assignmentsRaw) as any[];
        assignments.forEach((item) => {
          // Try to find matching record in OPD/IPD by regNo or idNumber
          let foundRecord: PatientRecord | null = null;

          // Check all existing records for a match
          const recordEntries = Array.from(recordMap.values());
          for (const record of recordEntries) {
            if (!foundRecord && item.patientName && record.names === item.patientName) {
              foundRecord = record;
            }
            if (!foundRecord && item.regNo && record.regNo === item.regNo) {
              foundRecord = record;
            }
            if (!foundRecord && item.idNumber && (record.idNumber === item.idNumber || record.regNo === item.idNumber)) {
              foundRecord = record;
            }
          }

          if (foundRecord) {
            // Update diagnosis and treatment from receipt data (prioritize over OPD/IPD)
            if (item.diagnosis && !foundRecord.diagnosis) {
              foundRecord.diagnosis = item.diagnosis;
            }
            if (item.treatment && !foundRecord.treatment) {
              foundRecord.treatment = item.treatment;
            }
            // Also update if receipt has more complete data
            if (item.treatment && item.treatment.length > (foundRecord.treatment?.length || 0)) {
              foundRecord.treatment = item.treatment;
            }
          } else if (item.patientName) {
            // Create new record from assignment if not found in OPD/IPD
            const newKey = `RECEIPT-${item.idNumber || item.regNo || item.patientName}`;
            const newRecord: PatientRecord = {
              rowNo: rowNo++,
              date: item.date || new Date().toISOString().slice(0, 10),
              time: '',
              regNo: item.regNo || '',
              idNumber: item.idNumber || '',
              names: item.patientName || '',
              age: item.age || 0,
              sex: item.sex || '',
              village: item.village || '',
              kgs: '',
              attendance: item.source === 'IPD' ? 'IPD Admission' : 'OPD Visit',
              diagnosis: item.diagnosis || '',
              treatment: item.treatment || '',
              source: item.source || 'OPD',
            };
            recordMap.set(newKey, newRecord);
          }
        });
      } catch (e) {
        console.error('Error parsing doctor assignments:', e);
      }
    }

    // Convert map to array and sort
    const records = Array.from(recordMap.values());
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Re-index row numbers
    records.forEach((record, index) => {
      record.rowNo = index + 1;
    });

    this.patientRecords = records;
  }

  public get filteredPatientRecords(): PatientRecord[] {
    const term = this.searchText.trim().toLowerCase();
    const dateFilter = this.filterDate.trim();

    return this.patientRecords.filter((record) => {
      const matchesSearch =
        !term ||
        record.names.toLowerCase().includes(term) ||
        record.regNo.toLowerCase().includes(term) ||
        record.idNumber.toLowerCase().includes(term) ||
        record.diagnosis.toLowerCase().includes(term);

      const matchesDate = !dateFilter || record.date === dateFilter;

      return matchesSearch && matchesDate;
    });
  }

  public get paginatedRecords(): PatientRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatientRecords.slice(start, start + this.pageSize);
  }

  public get totalRecordPages(): number {
    return Math.ceil(this.filteredPatientRecords.length / this.pageSize);
  }

  public nextRecordPage() {
    if (this.currentPage < this.totalRecordPages) {
      this.currentPage++;
    }
  }

  public prevRecordPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  public refreshPatientRecords() {
    this.currentPage = 1;
    this.loadPatientRecords();
  }

  public get isAdmin() {
    return this.auth.isAdmin();
  }

  public get isNurse() {
    return this.auth.isNurse();
  }
}




