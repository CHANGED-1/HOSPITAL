import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

interface Report {
  id: string;
  title: string;
  type: string;
  date: string;
  generatedBy: string;
  summary: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  fileName: string;
}

const REPORT_STORAGE = 'hospital_reports';
const TEMPLATE_STORAGE = 'hospital_templates';
const IPD_STORAGE = 'hospital_ipd_register';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
})
export class Reports {
  public reportTitle = '';
  public reportType = 'Patient Summary';
  public fromDate = new Date().toISOString().slice(0, 10);
  public toDate = new Date().toISOString().slice(0, 10);

  public generatedReports: Report[] = [];
  public templates: Template[] = [];
  public selectedTemplate: Template | null = null;

  public types = ['Patient Summary', 'Doctor Workload', 'Service Usage', 'Discharge Notes', 'Disease Statistics', 'HMIS 108'];
  
  public hmis108Month = new Date().toISOString().slice(0, 7); // YYYY-MM format

  constructor() {
    this.loadReports();
    this.loadTemplates();
  }

  private loadReports() {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(REPORT_STORAGE);
    if (!raw) return;
    try {
      this.generatedReports = JSON.parse(raw) as Report[];
    } catch {
      this.generatedReports = [];
    }
  }

  private loadTemplates() {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(TEMPLATE_STORAGE);
    if (!raw) return;
    try {
      this.templates = JSON.parse(raw) as Template[];
    } catch {
      this.templates = [];
    }
  }

  private saveTemplates() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TEMPLATE_STORAGE, JSON.stringify(this.templates));
  }

  public uploadTemplate(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const template: Template = {
        id: `TMPL-${Date.now()}`,
        name: file.name,
        type: file.type,
        uploadDate: new Date().toISOString().slice(0, 10),
        fileName: file.name,
      };

      // Store file content in localStorage (for PDFs, store as data URL)
      if (file.type === 'application/pdf' || file.type.includes('excel') || file.type.includes('spreadsheet')) {
        const dataUrl = e.target.result;
        localStorage.setItem(`template_${template.id}`, dataUrl);
        this.templates.push(template);
        this.saveTemplates();
        alert(`Template "${file.name}" uploaded successfully!`);
      } else {
        alert('Please upload PDF or Excel files only.');
      }
    };
    reader.readAsDataURL(file);
  }

  public deleteTemplate(templateId: string) {
    if (confirm('Delete this template?')) {
      localStorage.removeItem(`template_${templateId}`);
      this.templates = this.templates.filter(t => t.id !== templateId);
      this.saveTemplates();
    }
  }

  public generateHMIS108Report() {
    if (!this.hmis108Month) {
      alert('Please select a month');
      return;
    }

    const [year, month] = this.hmis108Month.split('-');
    const ipdRaw = localStorage.getItem(IPD_STORAGE);
    
    if (!ipdRaw) {
      alert('No IPD data available');
      return;
    }

    try {
      const ipdEntries = JSON.parse(ipdRaw) as any[];
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const monthEntries = ipdEntries.filter(entry => {
        const entryDate = new Date(entry.admissionDate);
        return entryDate >= startDate && entryDate <= endDate;
      });

      const diagnosisStats: Record<string, any> = {};
      let totalAdmissions = 0;
      let totalDischarges = 0;
      let totalDeaths = 0;
      let totalDaysOfCare = 0;

      monthEntries.forEach((entry: any) => {
        totalAdmissions++;
        totalDaysOfCare += entry.daysOfCare || 0;

        if (entry.outcome === 'discharged') totalDischarges++;
        if (entry.outcome === 'died') totalDeaths++;

        if (!diagnosisStats[entry.diagnosis]) {
          diagnosisStats[entry.diagnosis] = { admitted: 0, discharged: 0, died: 0, referred: 0, absconded: 0 };
        }
        diagnosisStats[entry.diagnosis].admitted++;
        if (entry.outcome === 'discharged') diagnosisStats[entry.diagnosis].discharged++;
        if (entry.outcome === 'died') diagnosisStats[entry.diagnosis].died++;
        if (entry.outcome === 'referred') diagnosisStats[entry.diagnosis].referred++;
        if (entry.outcome === 'absconded') diagnosisStats[entry.diagnosis].absconded++;
      });

      this.exportHMIS108ToExcel(year, month, totalAdmissions, totalDischarges, totalDeaths, totalDaysOfCare, diagnosisStats, monthEntries);
    } catch (e) {
      console.error('Error generating HMIS 108:', e);
      alert('Error generating HMIS 108 report');
    }
  }

  private exportHMIS108ToExcel(year: string, month: string, admissions: number, discharges: number, deaths: number, daysOfCare: number, diagnosisStats: Record<string, any>, entries: any[]) {
    const monthName = new Date(`${year}-${month}-01`).toLocaleString('default', { month: 'long' });
    
    // Create summary sheet
    const summaryData = [
      ['HMIS 108 - HEALTH UNIT INPATIENT MONTHLY REPORT'],
      [`Health Unit: Bugembe HCIV | Month: ${monthName} ${year}`],
      [],
      ['SUMMARY STATISTICS'],
      ['Total Admissions', admissions],
      ['Total Discharges', discharges],
      ['Total Deaths', deaths],
      ['Total Days of Care', daysOfCare],
      ['Average Length of Stay', (daysOfCare / (admissions || 1)).toFixed(2)],
      [],
      ['DIAGNOSIS BREAKDOWN'],
    ];

    // Add diagnosis rows
    Object.entries(diagnosisStats).forEach(([diagnosis, stats]: [string, any]) => {
      summaryData.push([diagnosis, stats.admitted, stats.discharged, stats.died, stats.referred, stats.absconded]);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    // Add detailed entries sheet
    const detailsHeaders = ['ID', 'Date', 'Admission Date', 'Discharge Date', 'Patient Name', 'Age', 'Sex', 'Ward', 'Doctor', 'Primary Diagnosis', 'Secondary Diagnosis', 'Outcome', 'Days of Care', 'Services', 'Treatment'];
    const detailsData = entries.map((entry: any) => [
      entry.id, entry.date, entry.admissionDate, entry.dischargeDate || '', entry.patientName, 
      entry.age, entry.sex, entry.ward, entry.doctor, entry.diagnosis, entry.secondaryDiagnosis || '', 
      entry.outcome, entry.daysOfCare || 0, entry.servicesReceived || '', entry.treatment
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([detailsHeaders, ...detailsData]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Detailed Entries');

    // Save file
    XLSX.writeFile(wb, `HMIS108_${year}_${month}.xlsx`);
  }

  private generateDiseaseStatistics(): string {
    const fromDate = new Date(this.fromDate);
    const toDate = new Date(this.toDate);
    toDate.setHours(23, 59, 59, 999); // Include the entire toDate

    const diagnosisStats: { [key: string]: { opd: number; ipd: number; total: number } } = {};

    // Collect OPD data
    const opdData = localStorage.getItem('hospital_opd_register');
    if (opdData) {
      try {
        const opdEntries = JSON.parse(opdData);
        opdEntries.forEach((entry: any) => {
          const entryDate = new Date(entry.date);
          if (entryDate >= fromDate && entryDate <= toDate && entry.diagnosis) {
            const diagnosis = entry.diagnosis.trim();
            if (!diagnosisStats[diagnosis]) {
              diagnosisStats[diagnosis] = { opd: 0, ipd: 0, total: 0 };
            }
            diagnosisStats[diagnosis].opd++;
            diagnosisStats[diagnosis].total++;
          }
        });
      } catch (e) {
        console.error('Error parsing OPD data:', e);
      }
    }

    // Collect IPD data
    const ipdData = localStorage.getItem('hospital_ipd_register');
    if (ipdData) {
      try {
        const ipdEntries = JSON.parse(ipdData);
        ipdEntries.forEach((entry: any) => {
          const entryDate = new Date(entry.date);
          if (entryDate >= fromDate && entryDate <= toDate && entry.diagnosis) {
            const diagnosis = entry.diagnosis.trim();
            if (!diagnosisStats[diagnosis]) {
              diagnosisStats[diagnosis] = { opd: 0, ipd: 0, total: 0 };
            }
            diagnosisStats[diagnosis].ipd++;
            diagnosisStats[diagnosis].total++;
          }
        });
      } catch (e) {
        console.error('Error parsing IPD data:', e);
      }
    }

    // Generate summary
    const sortedDiagnoses = Object.entries(diagnosisStats)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10); // Top 10 diagnoses

    if (sortedDiagnoses.length === 0) {
      return `No diagnosis data found for the selected period (${this.fromDate} to ${this.toDate}).`;
    }

    let summary = `Disease Statistics (${this.fromDate} to ${this.toDate}):\n\n`;
    summary += `Top ${sortedDiagnoses.length} Diagnoses:\n`;
    sortedDiagnoses.forEach(([diagnosis, stats], index) => {
      summary += `${index + 1}. ${diagnosis}: ${stats.total} cases (${stats.opd} OPD, ${stats.ipd} IPD)\n`;
    });

    const totalCases = Object.values(diagnosisStats).reduce((sum, stats) => sum + stats.total, 0);
    const totalOPD = Object.values(diagnosisStats).reduce((sum, stats) => sum + stats.opd, 0);
    const totalIPD = Object.values(diagnosisStats).reduce((sum, stats) => sum + stats.ipd, 0);

    summary += `\nTotal Cases: ${totalCases} (${totalOPD} OPD, ${totalIPD} IPD)`;
    summary += `\nUnique Diagnoses: ${Object.keys(diagnosisStats).length}`;

    return summary;
  }

  public generateReport() {
    let summary = `${this.reportType} from ${this.fromDate} to ${this.toDate}`;

    if (this.reportType === 'Disease Statistics') {
      summary = this.generateDiseaseStatistics();
    }

    const report: Report = {
      id: `R-${Math.floor(Math.random() * 10000)}`,
      title: this.reportTitle || `${this.reportType} ${this.fromDate}`,
      type: this.reportType,
      date: new Date().toISOString().slice(0, 10),
      generatedBy: 'Admin',
      summary: summary,
    };

    this.generatedReports.unshift(report);
    this.reportTitle = '';
    this.saveReports();
    this.downloadReport(report);
  }

  public downloadReport(report: Report) {
    if (report.type === 'Disease Statistics') {
      this.downloadDiseaseStatisticsReport(report);
      return;
    }

    const headers = ['ID', 'Title', 'Type', 'Date', 'Generated By', 'Summary'];
    const rows = [
      [report.id, report.title, report.type, report.date, report.generatedBy, report.summary],
    ];
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-zA-Z0-9-_ ]/g, '') || 'report'}-${report.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private downloadDiseaseStatisticsReport(report: Report) {
    const fromDate = new Date(this.fromDate);
    const toDate = new Date(this.toDate);
    toDate.setHours(23, 59, 59, 999);

    const diagnosisStats: { [key: string]: { opd: number; ipd: number; total: number; details: any[] } } = {};

    // Collect OPD data with details
    const opdData = localStorage.getItem('hospital_opd_register');
    if (opdData) {
      try {
        const opdEntries = JSON.parse(opdData);
        opdEntries.forEach((entry: any) => {
          const entryDate = new Date(entry.date);
          if (entryDate >= fromDate && entryDate <= toDate && entry.diagnosis) {
            const diagnosis = entry.diagnosis.trim();
            if (!diagnosisStats[diagnosis]) {
              diagnosisStats[diagnosis] = { opd: 0, ipd: 0, total: 0, details: [] };
            }
            diagnosisStats[diagnosis].opd++;
            diagnosisStats[diagnosis].total++;
            diagnosisStats[diagnosis].details.push({
              type: 'OPD',
              date: entry.date,
              patient: entry.patientName,
              age: entry.age,
              sex: entry.sex,
              doctor: entry.doctor,
              department: entry.department
            });
          }
        });
      } catch (e) {
        console.error('Error parsing OPD data:', e);
      }
    }

    // Collect IPD data with details
    const ipdData = localStorage.getItem('hospital_ipd_register');
    if (ipdData) {
      try {
        const ipdEntries = JSON.parse(ipdData);
        ipdEntries.forEach((entry: any) => {
          const entryDate = new Date(entry.date);
          if (entryDate >= fromDate && entryDate <= toDate && entry.diagnosis) {
            const diagnosis = entry.diagnosis.trim();
            if (!diagnosisStats[diagnosis]) {
              diagnosisStats[diagnosis] = { opd: 0, ipd: 0, total: 0, details: [] };
            }
            diagnosisStats[diagnosis].ipd++;
            diagnosisStats[diagnosis].total++;
            diagnosisStats[diagnosis].details.push({
              type: 'IPD',
              date: entry.date,
              patient: entry.patientName,
              ward: entry.ward,
              doctor: entry.doctor
            });
          }
        });
      } catch (e) {
        console.error('Error parsing IPD data:', e);
      }
    }

    // Create CSV with summary and details
    const headers = ['Diagnosis', 'Total Cases', 'OPD Cases', 'IPD Cases', 'Patient Details'];
    const rows: string[][] = [];

    Object.entries(diagnosisStats)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([diagnosis, stats]) => {
        const detailsStr = stats.details.map(d =>
          `${d.type}: ${d.patient} (${d.date})`
        ).join('; ');
        rows.push([diagnosis, stats.total.toString(), stats.opd.toString(), stats.ipd.toString(), detailsStr]);
      });

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disease-statistics-${this.fromDate}-to-${this.toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public printReport(report: Report) {
    const printContent = `
      <div style="font-family: sans-serif;">
        <h1>Report: ${report.title}</h1>
        <p><strong>ID:</strong> ${report.id}</p>
        <p><strong>Type:</strong> ${report.type}</p>
        <p><strong>Date:</strong> ${report.date}</p>
        <p><strong>Generated By:</strong> ${report.generatedBy}</p>
        <p><strong>Summary:</strong> ${report.summary}</p>
      </div>
    `;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${report.title}</title></head><body>${printContent}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  public printAllReports() {
    if (!this.generatedReports.length) return;
    const printRows = this.generatedReports
      .map(
        (r) => `<tr><td>${r.id}</td><td>${r.title}</td><td>${r.type}</td><td>${r.date}</td><td>${r.generatedBy}</td><td>${r.summary}</td></tr>`
      )
      .join('');
    const printContent = `
      <div style="font-family: sans-serif;">
        <h1>Hospital Generated Reports</h1>
        <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; width: 100%;">
          <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Date</th><th>Generated By</th><th>Summary</th></tr></thead>
          <tbody>${printRows}</tbody>
        </table>
      </div>
    `;
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>All Reports</title></head><body>${printContent}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  private saveReports() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REPORT_STORAGE, JSON.stringify(this.generatedReports));
  }

  public downloadAllReports() {
    if (!this.generatedReports.length) return;
    const headers = ['ID', 'Title', 'Type', 'Date', 'Generated By', 'Summary'];
    const rows = this.generatedReports.map((r) => [r.id, r.title, r.type, r.date, r.generatedBy, r.summary]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

