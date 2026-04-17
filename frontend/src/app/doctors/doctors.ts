import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

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

interface Doctor extends SystemUser {
  specialty?: string;
  availability?: string;
  doctorStatus?: 'Available' | 'On Leave' | 'Unavailable';
  editing?: boolean;
}

const USERS_STORAGE = 'hospital_system_users';
const DOCTORS_STORAGE = 'hospital_doctor_profiles';
const PATIENT_STORAGE = 'hospital_patients';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors.html',
  styleUrls: ['./doctors.scss'],
})
export class Doctors implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  public doctors: Doctor[] = [];

  constructor() {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.loadDoctorsFromUsers();
  }

  private loadDoctorsFromUsers(): void {
    if (typeof window === 'undefined') return;

    // Load users from localStorage
    const usersRaw = localStorage.getItem(USERS_STORAGE);
    if (!usersRaw) return;

    try {
      const allUsers = JSON.parse(usersRaw) as SystemUser[];

      // Filter only doctors
      const doctorUsers = allUsers.filter((u) => u.role === 'doctor');

      // Load doctor profiles (specialty, availability, status)
      const profilesRaw = localStorage.getItem(DOCTORS_STORAGE);
      const profiles: Record<string, { specialty: string; availability: string; doctorStatus: string }> = profilesRaw
        ? JSON.parse(profilesRaw)
        : {};

      // Combine user data with doctor profiles
      this.doctors = doctorUsers.map((user) => ({
        ...user,
        specialty: profiles[user.id]?.specialty || 'General Medicine',
        availability: profiles[user.id]?.availability || 'Mon–Fri 9AM–5PM',
        doctorStatus: (profiles[user.id]?.doctorStatus as 'Available' | 'On Leave' | 'Unavailable') || 'Available',
      }));
    } catch (e) {
      console.error('Error loading doctors:', e);
    }
  }

  private saveDoctorProfiles(): void {
    if (typeof window === 'undefined') return;

    const profiles: Record<string, { specialty: string; availability: string; doctorStatus: string }> = {};

    this.doctors.forEach((doctor) => {
      profiles[doctor.id] = {
        specialty: doctor.specialty || 'General Medicine',
        availability: doctor.availability || 'Mon–Fri 9AM–5PM',
        doctorStatus: doctor.doctorStatus || 'Available',
      };
    });

    localStorage.setItem(DOCTORS_STORAGE, JSON.stringify(profiles));
  }

  public editDoctor(doctor: Doctor) {
    doctor.editing = true;
  }

  public saveDoctor(doctor: Doctor) {
    doctor.editing = false;
    this.saveDoctorProfiles();
    console.log('Saved doctor', doctor);
  }

  public cancelEdit(doctor: Doctor) {
    doctor.editing = false;
    this.loadDoctorsFromUsers();
  }

  public getAssignedCount(doctorId: string): number {
    if (typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(PATIENT_STORAGE);
    if (!raw) return 0;
    try {
      const patients = JSON.parse(raw) as Array<{ assignedDoctor?: string }>;      return patients.filter((p) => p.assignedDoctor === doctorId).length;
    } catch {
      return 0;
    }
  }

  public viewPatients() {
    this.router.navigate(['/patients']);
  }
}
