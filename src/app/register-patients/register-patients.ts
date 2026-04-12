import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

const OPD_STORAGE = 'hospital_opd_register';
const IPD_STORAGE = 'hospital_ipd_register';

@Component({
  selector: 'app-register-patients',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './register-patients.html',
  styleUrls: ['./register-patients.scss'],
})
export class RegisterPatients {
  public opdCount = 0;
  public ipdCount = 0;
  public lastUpdated = '';

  constructor() {
    this.refreshCounts();
  }

  public refreshCounts() {
    if (typeof window === 'undefined') {
      this.opdCount = 0;
      this.ipdCount = 0;
      this.lastUpdated = new Date().toLocaleString();
      return;
    }

    const opdRaw = localStorage.getItem(OPD_STORAGE);
    const ipdRaw = localStorage.getItem(IPD_STORAGE);

    this.opdCount = 0;
    this.ipdCount = 0;

    try {
      this.opdCount = opdRaw ? (JSON.parse(opdRaw) as any[]).length : 0;
    } catch {
      this.opdCount = 0;
    }

    try {
      this.ipdCount = ipdRaw ? (JSON.parse(ipdRaw) as any[]).length : 0;
    } catch {
      this.ipdCount = 0;
    }

    this.lastUpdated = new Date().toLocaleString();
  }
}
