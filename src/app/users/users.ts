import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

interface SystemUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant' | 'pharmacist';
  email: string;
  phone: string;
  department: string;
  status: 'active' | 'inactive';
  createdDate: string;
  editing?: boolean;
}

const USERS_STORAGE = 'hospital_system_users';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
})
export class Users implements OnInit {
  public users: SystemUser[] = [];
  public searchText = '';
  public filterRole = '';
  public filterStatus = 'all';

  public newUser: SystemUser = {
    id: '',
    name: '',
    username: '',
    password: '',
    role: 'nurse',
    email: '',
    phone: '',
    department: '',
    status: 'active',
    createdDate: new Date().toISOString().split('T')[0],
  };

  public roles = ['admin', 'doctor', 'nurse', 'receptionist', 'accountant', 'pharmacist'];
  public departments = ['OPD', 'IPD', 'Finance', 'Pharmacy', 'Laboratory', 'General'];
  public statuses = ['active', 'inactive'];

  // Pagination
  public pageSize = 10;
  public currentPage = 1;
  public pageSizeOptions = [5, 10, 20];

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.loadUsers();
    if (this.users.length === 0) {
      this.loadDefaultUsers();
    }
  }

  private loadDefaultUsers(): void {
    const defaultUsers: SystemUser[] = [
      {
        id: 'USR001',
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        email: 'admin@hospital.com',
        phone: '+256 700 123456',
        department: 'General',
        status: 'active',
        createdDate: '2026-01-15',
      },
      {
        id: 'USR002',
        name: 'Dr Test',
        username: 'doctor',
        password: 'doctor123',
        role: 'doctor',
        email: 'doctor@hospital.com',
        phone: '+256 700 234567',
        department: 'OPD',
        status: 'active',
        createdDate: '2026-01-20',
      },
      {
        id: 'USR003',
        name: 'Nurse 1',
        username: 'nurse1',
        password: 'nurse123',
        role: 'nurse',
        email: 'nurse1@hospital.com',
        phone: '+256 700 345678',
        department: 'IPD',
        status: 'active',
        createdDate: '2026-01-22',
      },
      {
        id: 'USR004',
        name: 'Receptionist',
        username: 'receptionist',
        password: 'receptionist123',
        role: 'receptionist',
        email: 'front@hospital.com',
        phone: '+256 700 456789',
        department: 'General',
        status: 'active',
        createdDate: '2026-01-25',
      },
      {
        id: 'USR005',
        name: 'Accountant',
        username: 'accountant',
        password: 'accountant123',
        role: 'accountant',
        email: 'accounts@hospital.com',
        phone: '+256 700 567890',
        department: 'Finance',
        status: 'active',
        createdDate: '2026-02-01',
      },
      {
        id: 'USR006',
        name: 'Pharmacist',
        username: 'pharmacist',
        password: 'pharmacist123',
        role: 'pharmacist',
        email: 'pharmacy@hospital.com',
        phone: '+256 700 678901',
        department: 'Pharmacy',
        status: 'active',
        createdDate: '2026-02-05',
      },
    ];

    this.users = defaultUsers;
    this.saveUsers();
  }

  private loadUsers(): void {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(USERS_STORAGE);
    if (stored) {
      try {
        this.users = JSON.parse(stored);
      } catch (e) {
        this.users = [];
      }
    }
  }

  private saveUsers(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USERS_STORAGE, JSON.stringify(this.users));
  }

  public get filteredUsers(): SystemUser[] {
    let filtered = this.users;

    // Search filter
    if (this.searchText.trim()) {
      const term = this.searchText.trim().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.phone.includes(term)
      );
    }

    // Role filter
    if (this.filterRole) {
      filtered = filtered.filter((u) => u.role === this.filterRole);
    }

    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter((u) => u.status === this.filterStatus);
    }

    return filtered;
  }

  public get paginatedUsers(): SystemUser[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  public get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize);
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

  public addUser(): void {
    if (!this.auth.isLoggedIn()) {
      alert('You must be logged in to add users');
      return;
    }

    if (!this.newUser.name || !this.newUser.username || !this.newUser.email || !this.newUser.password) {
      alert('Name, username, email, and password are required');
      return;
    }

    const user: SystemUser = {
      ...this.newUser,
      id: 'USR' + String(this.users.length + 1).padStart(3, '0'),
      createdDate: new Date().toISOString().split('T')[0],
    };

    this.users.unshift(user);
    this.saveUsers();
    this.resetForm();
    alert(`User ${user.username} added successfully!`);
  }

  public editUser(user: SystemUser): void {
    if (!this.auth.isLoggedIn()) return;
    user.editing = true;
  }

  public saveUser(user: SystemUser): void {
    if (!this.auth.isLoggedIn()) return;
    user.editing = false;
    this.saveUsers();
    alert('User updated successfully!');
  }

  public cancelEdit(user: SystemUser): void {
    user.editing = false;
    this.loadUsers();
  }

  public deleteUser(index: number): void {
    if (!this.auth.isLoggedIn()) {
      alert('You must be logged in to delete users');
      return;
    }

    const user = this.filteredUsers[index];
    if (confirm(`Are you sure you want to delete ${user.username}?`)) {
      this.users = this.users.filter((u) => u.id !== user.id);
      this.saveUsers();
      alert('User deleted successfully!');
      this.currentPage = 1;
    }
  }

  public toggleStatus(user: SystemUser): void {
    if (!this.isAdmin) return;
    user.status = user.status === 'active' ? 'inactive' : 'active';
    this.saveUsers();
  }

  private resetForm(): void {
    this.newUser = {
      id: '',
      name: '',
      username: '',
      password: '',
      role: 'nurse',
      email: '',
      phone: '',
      department: '',
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0],
    };
  }

  public get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  public getRoleColor(role: string): string {
    switch (role) {
      case 'admin':
        return '#d32f2f';
      case 'doctor':
        return '#1976d2';
      case 'nurse':
        return '#f57c00';
      case 'receptionist':
        return '#7b1fa2';
      case 'accountant':
        return '#00796b';
      case 'pharmacist':
        return '#c2185b';
      default:
        return '#666';
    }
  }

  public getStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  public exportUsers(): void {
    if (!this.auth.isLoggedIn()) {
      alert('You must be logged in to export users');
      return;
    }

    const dataStr = JSON.stringify(this.users, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'hospital_users_backup_' + new Date().toISOString().split('T')[0] + '.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  public importUsers(event: any): void {
    if (!this.auth.isLoggedIn()) {
      alert('You must be logged in to import users');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedUsers = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedUsers)) {
          // Validate the structure
          const isValid = importedUsers.every(user =>
            user.id && user.username && user.password && user.role && user.status
          );
          if (isValid) {
            this.users = importedUsers;
            this.saveUsers();
            alert('Users imported successfully!');
            this.currentPage = 1;
          } else {
            alert('Invalid file format. Please select a valid users backup file.');
          }
        } else {
          alert('Invalid file format. Please select a valid users backup file.');
        }
      } catch (error) {
        alert('Error reading file. Please select a valid JSON file.');
      }
    };
    reader.readAsText(file);
  }
}
