import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant' | 'pharmacist';
  email: string;
}

const API          = 'http://localhost:3000/api';
const ACCESS_KEY   = 'hciv_access_token';
const REFRESH_KEY  = 'hciv_refresh_token';
const USER_KEY     = 'hciv_user';
const ROUTE_KEY    = 'hciv_last_route';
const INACTIVITY_MS = 2 * 60 * 1000; // 2 minutes

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _loggedIn = signal(false);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient, private router: Router) {
    // Restore session from localStorage on app boot
    const token = this.accessToken;
    this._loggedIn.set(!!token);
    if (token) this.startInactivityTimer();
  }

  // ─── Token helpers ───────────────────────────────────────────────

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  get currentUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  get role(): AuthUser['role'] | null {
    return this.currentUser?.role ?? null;
  }

  // ─── Auth actions ────────────────────────────────────────────────

  async login(username: string, password: string): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API}/auth/login`, { username, password })
      );

      if (res.success) {
        localStorage.setItem(ACCESS_KEY,  res.data.accessToken);
        localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
        localStorage.setItem(USER_KEY,    JSON.stringify(res.data.user));
        this._loggedIn.set(true);
        this.startInactivityTimer();
        return true;
      }
    } catch (err: any) {
      console.error('Login failed:', err?.error?.message ?? err.message);
    }
    return false;
  }

  async refreshAccessToken(): Promise<boolean> {
    const token = this.refreshToken;
    if (!token) return false;

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API}/auth/refresh`, { refreshToken: token })
      );
      if (res.success) {
        localStorage.setItem(ACCESS_KEY,  res.data.accessToken);
        localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
        return true;
      }
    } catch {
      // Refresh token expired — force logout
      this.clearSession();
    }
    return false;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${API}/auth/logout`, { refreshToken: this.refreshToken })
      );
    } catch { /* best-effort */ }
    this.clearSession();
    this.router.navigate(['/']);
  }

  // ─── State ───────────────────────────────────────────────────────

  isLoggedIn(): boolean    { return this._loggedIn(); }
  isAdmin(): boolean       { return this.role === 'admin'; }
  isDoctor(): boolean      { return this.role === 'doctor'; }
  isNurse(): boolean       { return this.role === 'nurse'; }
  isReceptionist(): boolean{ return this.role === 'receptionist'; }
  isAccountant(): boolean  { return this.role === 'accountant'; }
  isPharmacist(): boolean  { return this.role === 'pharmacist'; }

  // ─── Last route ──────────────────────────────────────────────────

  saveCurrentRoute(route: string): void {
    localStorage.setItem(ROUTE_KEY, route);
  }

  getLastRoute(): string | null {
    return localStorage.getItem(ROUTE_KEY);
  }

  clearLastRoute(): void {
    localStorage.removeItem(ROUTE_KEY);
  }

  // ─── Inactivity timer ────────────────────────────────────────────

  resetInactivityTimer(): void {
    if (this.isLoggedIn()) this.startInactivityTimer();
  }

  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    this.timeoutId = setTimeout(() => this.logout(), INACTIVITY_MS);
  }

  private clearInactivityTimer(): void {
    if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._loggedIn.set(false);
    this.clearInactivityTimer();
  }
}