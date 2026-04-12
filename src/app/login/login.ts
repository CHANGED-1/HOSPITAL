import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  public form: FormGroup;
  public errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {
    // Initialize form with proper configuration
    this.form = new FormGroup({
      username: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
    });
  }

  public submit(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });

    if (this.form.invalid) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    const username = this.form.get('username')?.value?.trim() ?? '';
    const password = this.form.get('password')?.value ?? '';

    if (!username || !password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (this.auth.login(username, password)) {
      this.errorMessage = '';
      
      // Try to restore the last visited route, otherwise go to dashboard
      const lastRoute = this.auth.getLastRoute();
      const targetRoute = lastRoute && lastRoute !== '/' ? lastRoute : '/dashboard';
      this.auth.clearLastRoute();
      
      this.router.navigate([targetRoute]).catch(err => {
        console.error('Navigation error:', err);
      });
      return;
    }

    this.errorMessage = 'Invalid credentials. Please check your username and password.';
  }
}

