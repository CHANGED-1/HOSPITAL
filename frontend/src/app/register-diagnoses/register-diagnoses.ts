import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

interface Diagnosis {
  code: string;
  name: string;
  description: string;
  type: string;
  category: string;
  status: string;
}

const STORAGE_KEY = 'hospital_diagnoses_register';
const TYPE_OPTIONS = ['ICD-10', 'Local', 'Other'];
const CATEGORY_OPTIONS = ['Infectious', 'Chronic', 'Acute', 'Mental Health', 'Surgical', 'Obstetric', 'Pediatric', 'Other'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

@Component({
  selector: 'app-register-diagnoses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-diagnoses.html',
  styleUrls: ['./register-diagnoses.scss'],
})
export class RegisterDiagnoses {
  public diagnoses: Diagnosis[] = [];
  public newDiagnosis: Diagnosis = this.getEmptyDiagnosis();

  public typeOptions = TYPE_OPTIONS;
  public categoryOptions = CATEGORY_OPTIONS;
  public statusOptions = STATUS_OPTIONS;

  public pendingUploadFile: File | null = null;
  public pendingUploadName = '';

  public searchTerm = '';
  public filterType = '';
  public filterCategory = '';
  public filterStatus = '';
  public isDirty = false;

  public currentPage = 1;
  public itemsPerPage = 20;

  constructor() {
    this.loadDiagnoses();
  }

  private getEmptyDiagnosis(): Diagnosis {
    return {
      code: '',
      name: '',
      description: '',
      type: 'ICD-10',
      category: '',
      status: 'Active',
    };
  }

  private loadDiagnoses() {
    if (typeof window === 'undefined') {
      this.diagnoses = [];
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.diagnoses = [];
      return;
    }
    try {
      this.diagnoses = JSON.parse(raw) as Diagnosis[];
    } catch {
      this.diagnoses = [];
    }
  }

  private saveDiagnoses() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.diagnoses));
    this.isDirty = false;
  }

  public addDiagnosis() {
    if (!this.newDiagnosis.code.trim() || !this.newDiagnosis.name.trim()) {
      alert('Diagnosis code and name are required');
      return;
    }

    // Check for duplicate code
    if (this.diagnoses.some((d) => d.code === this.newDiagnosis.code)) {
      alert('Diagnosis code already exists');
      return;
    }

    this.diagnoses = [{ ...this.newDiagnosis }, ...this.diagnoses];
    this.isDirty = true;
    this.saveDiagnoses();
    this.newDiagnosis = this.getEmptyDiagnosis();
  }

  public deleteDiagnosis(index: number) {
    this.diagnoses.splice(index, 1);
    this.isDirty = true;
    this.saveDiagnoses();
  }

  public updateDiagnosis() {
    this.isDirty = true;
    this.saveDiagnoses();
  }

  get filteredDiagnoses(): Diagnosis[] {
    let filtered = this.diagnoses;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.code.toLowerCase().includes(term) ||
          d.name.toLowerCase().includes(term) ||
          d.description.toLowerCase().includes(term)
      );
    }

    if (this.filterType) {
      filtered = filtered.filter((d) => d.type === this.filterType);
    }

    if (this.filterCategory) {
      filtered = filtered.filter((d) => d.category === this.filterCategory);
    }

    if (this.filterStatus) {
      filtered = filtered.filter((d) => d.status === this.filterStatus);
    }

    return filtered;
  }

  get paginatedDiagnoses(): Diagnosis[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDiagnoses.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDiagnoses.length / this.itemsPerPage);
  }

  public nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  public prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  public exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(
      this.filteredDiagnoses.map((diagnosis) => ({
        'Code': diagnosis.code,
        'Name': diagnosis.name,
        'Description': diagnosis.description,
        'Type': diagnosis.type,
        'Category': diagnosis.category,
        'Status': diagnosis.status,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Diagnoses');
    XLSX.writeFile(wb, 'diagnoses_export.xlsx');
  }

  public onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      this.pendingUploadFile = null;
      this.pendingUploadName = '';
      return;
    }
    this.pendingUploadFile = input.files[0];
    this.pendingUploadName = this.pendingUploadFile.name;
    input.value = '';
  }

  public openUploadedFile() {
    if (!this.pendingUploadFile) return;

    const fileName = this.pendingUploadFile.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    if (!isXlsx && !isCsv) {
      alert('Please select a CSV or Excel file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      let imported: Diagnosis[] = [];

      if (isCsv) {
        const text = (reader.result as string) || '';
        const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
        if (!rows.length) return;

        const header = rows[0].split(',').map((h) => h.trim().toLowerCase());
        const idx = (name: string) => header.findIndex((h) => h === name.toLowerCase());

        const codeIdx = idx('code');
        const nameIdx = idx('name');
        const descIdx = idx('description');
        const typeIdx = idx('type');
        const categoryIdx = idx('category');
        const statusIdx = idx('status');

        imported = rows.slice(1).map((row) => {
          const cols = row.split(',').map((c) => c.trim());
          return {
            code: cols[codeIdx] || '',
            name: cols[nameIdx] || '',
            description: cols[descIdx] || '',
            type: cols[typeIdx] || 'ICD-10',
            category: cols[categoryIdx] || '',
            status: cols[statusIdx] || 'Active',
          };
        });
      } else {
        const workbook = XLSX.read(reader.result, { type: 'binary' });
        const worksheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[worksheetName];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        imported = data.map((row) => ({
          code: row['Code'] || row['code'] || '',
          name: row['Name'] || row['name'] || '',
          description: row['Description'] || row['description'] || '',
          type: row['Type'] || row['type'] || 'ICD-10',
          category: row['Category'] || row['category'] || '',
          status: row['Status'] || row['status'] || 'Active',
        }));
      }

      // Merge with existing, avoiding duplicates based on code
      imported.forEach((newDiag) => {
        if (!this.diagnoses.some((existing) => existing.code === newDiag.code)) {
          this.diagnoses.push(newDiag);
        }
      });

      this.diagnoses.sort((a, b) => a.code.localeCompare(b.code));
      this.isDirty = true;
      this.saveDiagnoses();
      alert(`Imported ${imported.length} diagnoses successfully!`);
      this.pendingUploadFile = null;
      this.pendingUploadName = '';
    };

    if (isXlsx) {
      reader.readAsBinaryString(this.pendingUploadFile);
    } else {
      reader.readAsText(this.pendingUploadFile);
    }
  }

  public clearSearch() {
    this.searchTerm = '';
    this.filterType = '';
    this.filterCategory = '';
    this.filterStatus = '';
    this.currentPage = 1;
  }

  public manualSave() {
    this.saveDiagnoses();
    alert('Diagnoses saved successfully!');
  }
}
