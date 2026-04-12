import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LogoService {
  private readonly _logoData = signal<string | null>(null);
  public readonly logoData = this._logoData;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      this._logoData.set(localStorage.getItem('hospital_logo') || null);
    }
  }

  public setLogo(data: string | null): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (data === null) {
        localStorage.removeItem('hospital_logo');
      } else {
        localStorage.setItem('hospital_logo', data);
      }
    }
    this._logoData.set(data);
  }
}
