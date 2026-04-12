import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface AuthToken {
  token: string;
  username: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant' | 'pharmacist';
}

const STORAGE_KEY = 'hospital_auth_token';
const SESSION_ROUTE_KEY = 'hospital_last_route';
const SESSION_TIMESTAMP_KEY = 'hospital_session_timestamp';
const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const SESSION_MEMORY_TIMEOUT = 2 * 60 * 1000; // 2 minutes for session memory resumption

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _loggedIn = signal(false);
  private timeoutId: number | null = null;

  constructor(private router: Router) {
    // Ensure users are loaded on initialization
    if (this.isBrowser) {
      let usersRaw = window.localStorage.getItem('hospital_system_users');
      if (!usersRaw) {
        this.loadDefaultUsers();
        usersRaw = window.localStorage.getItem('hospital_system_users');
      }
    }
    
    // Check for existing token and update logged-in state
    const existingToken = this.token;
    this._loggedIn.set(!!existingToken?.token);
    
    if (this.isLoggedIn() && existingToken) {
      this.startInactivityTimer();
    }
  }

  private get isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  public get token(): AuthToken | null {
    if (!this.isBrowser) return null;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthToken;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  public isLoggedIn(): boolean {
    return this._loggedIn();
  }

  public get role(): 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant' | 'pharmacist' | null {
    return this.token?.role ?? null;
  }

  public login(username: string, password: string): boolean {
    // Check against users from localStorage
    if (!this.isBrowser) return false;

    let usersRaw = window.localStorage.getItem('hospital_system_users');
    if (!usersRaw) {
      // Load default users if none exist
      this.loadDefaultUsers();
      usersRaw = window.localStorage.getItem('hospital_system_users');
    }

    if (!usersRaw) {
      console.error('Failed to load users from localStorage');
      return false;
    }

    try {
      const users = JSON.parse(usersRaw) as Array<{
        id: string;
        username: string;
        password: string;
        role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant' | 'pharmacist';
        status: 'active' | 'inactive';
      }>;

      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (user && user.status === 'active') {
        const token: AuthToken = { token: 'demo-token-' + Date.now(), username: user.username, role: user.role };
        this.setToken(token);
        this._loggedIn.set(true);
        this.startInactivityTimer();
        console.log(`Login successful for user: ${username}`);
        return true;
      } else {
        if (!user) {
          console.warn(`User not found: ${username}`);
        } else {
          console.warn(`User inactive: ${username}`);
        }
      }
    } catch (e) {
      console.error('Login error:', e);
    }

    return false;
  }

  public logout(): void {
    if (this.isBrowser) {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    this._loggedIn.set(false);
    this.clearInactivityTimer();
    this.router.navigate(['/']);
  }

  public saveCurrentRoute(route: string): void {
    if (this.isBrowser) {
      window.localStorage.setItem(SESSION_ROUTE_KEY, route);
      window.localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    }
  }

  public getLastRoute(): string | null {
    if (!this.isBrowser) return null;
    
    const route = window.localStorage.getItem(SESSION_ROUTE_KEY);
    const timestamp = window.localStorage.getItem(SESSION_TIMESTAMP_KEY);
    
    // If no route or timestamp is stored, return null
    if (!route || !timestamp) {
      this.clearLastRoute();
      return null;
    }
    
    // Check if the session is still valid (within 2 minutes)
    const storedTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const timeDiff = currentTime - storedTime;
    
    if (timeDiff > SESSION_MEMORY_TIMEOUT) {
      // Session has expired, clear it
      this.clearLastRoute();
      return null;
    }
    
    // Session is still valid
    return route;
  }

  public clearLastRoute(): void {
    if (this.isBrowser) {
      window.localStorage.removeItem(SESSION_ROUTE_KEY);
      window.localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    }
  }

  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    this.timeoutId = window.setTimeout(() => {
      this.logout();
    }, INACTIVITY_TIMEOUT);
  }

  public resetInactivityTimer(): void {
    if (this.isLoggedIn()) {
      this.startInactivityTimer();
    }
  }

  private clearInactivityTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  public isAdmin(): boolean {
    return this.role === 'admin';
  }

  public isDoctor(): boolean {
    return this.role === 'doctor';
  }

  public isNurse(): boolean {
    return this.role === 'nurse';
  }

  public isReceptionist(): boolean {
    return this.role === 'receptionist';
  }

  public isAccountant(): boolean {
    return this.role === 'accountant';
  }

  public isPharmacist(): boolean {
    return this.role === 'pharmacist';
  }

  private loadDefaultUsers(): void {
    if (!this.isBrowser) return;

    const defaultUsers = [
      {
        id: 'USR001',
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin' as const,
        email: 'admin@hospital.com',
        phone: '+256 700 123456',
        department: 'General',
        status: 'active' as const,
        createdDate: '2026-01-15',
      },
      {
        id: 'USR002',
        name: 'Dr Test',
        username: 'doctor',
        password: 'doctor123',
        role: 'doctor' as const,
        email: 'doctor@hospital.com',
        phone: '+256 700 234567',
        department: 'OPD',
        status: 'active' as const,
        createdDate: '2026-01-20',
      },
      {
        id: 'USR003',
        name: 'Nurse 1',
        username: 'nurse1',
        password: 'nurse123',
        role: 'nurse' as const,
        email: 'nurse1@hospital.com',
        phone: '+256 700 345678',
        department: 'IPD',
        status: 'active' as const,
        createdDate: '2026-01-22',
      },
      {
        id: 'USR004',
        name: 'Receptionist',
        username: 'receptionist',
        password: 'receptionist123',
        role: 'receptionist' as const,
        email: 'front@hospital.com',
        phone: '+256 700 456789',
        department: 'General',
        status: 'active' as const,
        createdDate: '2026-01-25',
      },
      {
        id: 'USR005',
        name: 'Accountant',
        username: 'accountant',
        password: 'accountant123',
        role: 'accountant' as const,
        email: 'accounts@hospital.com',
        phone: '+256 700 567890',
        department: 'Finance',
        status: 'active' as const,
        createdDate: '2026-02-01',
      },
      {
        id: 'USR006',
        name: 'Pharmacist',
        username: 'pharmacist',
        password: 'pharmacist123',
        role: 'pharmacist' as const,
        email: 'pharmacy@hospital.com',
        phone: '+256 700 678901',
        department: 'Pharmacy',
        status: 'active' as const,
        createdDate: '2026-02-05',
      },
    ];

    window.localStorage.setItem('hospital_system_users', JSON.stringify(defaultUsers));
  }

  private setToken(token: AuthToken) {
    if (!this.isBrowser) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
  }
}
