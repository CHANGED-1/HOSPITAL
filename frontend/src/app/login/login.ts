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
  public isLoading = false;
  public showPassword = false;

  constructor(private auth: AuthService, private router: Router) {
    this.form = new FormGroup({
      username: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
    });
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  public async submit(): Promise<void> {
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

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const success = await Promise.resolve(this.auth.login(username, password));

      if (success) {
        const lastRoute = this.auth.getLastRoute();
        const targetRoute = lastRoute && lastRoute !== '/' ? lastRoute : '/dashboard';
        this.auth.clearLastRoute();

        this.router.navigate([targetRoute]).catch(err => {
          console.error('Navigation error:', err);
        });
        return;
      }

      this.errorMessage = 'Invalid credentials. Please check your username and password.';
    } catch (err) {
      console.error('Login error:', err);
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}