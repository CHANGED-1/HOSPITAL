import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    // Check both signal state and localStorage token for reliability
    if (this.auth.isLoggedIn() || this.auth.currentUser) {
      return true;
    }

    this.router.navigate(['/']);
    return false;
  }
}

