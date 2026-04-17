import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { Login } from './login';
import { AuthService } from '../auth.service';

const mockAuthService = {
  login: jasmine.createSpy('login').and.returnValue(false),
  getLastRoute: jasmine.createSpy('getLastRoute').and.returnValue(null),
  clearLastRoute: jasmine.createSpy('clearLastRoute'),
};

const mockRouter = {
  navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
};

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    mockAuthService.login.calls.reset();
    mockAuthService.getLastRoute.calls.reset();
    mockAuthService.clearLastRoute.calls.reset();
    mockRouter.navigate.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ─── Component creation ──────────────────────────────────────
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize the form with empty username and password', () => {
      expect(component.form.get('username')?.value).toBe('');
      expect(component.form.get('password')?.value).toBe('');
    });

    it('should start with no error message', () => {
      expect(component.errorMessage).toBe('');
    });

    it('should start with isLoading as false', () => {
      expect(component.isLoading).toBeFalse();
    });

    it('should start with showPassword as false', () => {
      expect(component.showPassword).toBeFalse();
    });
  });

  // ─── Form validation ─────────────────────────────────────────
  describe('Form validation', () => {
    it('should be invalid when both fields are empty', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('should be invalid when only username is filled', () => {
      component.form.get('username')?.setValue('admin');
      expect(component.form.invalid).toBeTrue();
    });

    it('should be invalid when only password is filled', () => {
      component.form.get('password')?.setValue('secret');
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when both fields are filled', () => {
      component.form.get('username')?.setValue('admin');
      component.form.get('password')?.setValue('secret');
      expect(component.form.valid).toBeTrue();
    });

    it('should show username error after touching the empty field', () => {
      component.form.get('username')?.markAsTouched();
      fixture.detectChanges();
      const error = fixture.debugElement.query(By.css('#username-error'));
      expect(error).toBeTruthy();
    });

    it('should show password error after touching the empty field', () => {
      component.form.get('password')?.markAsTouched();
      fixture.detectChanges();
      const error = fixture.debugElement.query(By.css('#password-error'));
      expect(error).toBeTruthy();
    });

    it('should NOT show field errors before the fields are touched', () => {
      fixture.detectChanges();
      const usernameError = fixture.debugElement.query(By.css('#username-error'));
      const passwordError = fixture.debugElement.query(By.css('#password-error'));
      expect(usernameError).toBeNull();
      expect(passwordError).toBeNull();
    });
  });

  // ─── Password visibility toggle ──────────────────────────────
  describe('Password visibility toggle', () => {
    it('should toggle showPassword when togglePasswordVisibility is called', () => {
      expect(component.showPassword).toBeFalse();
      component.togglePasswordVisibility();
      expect(component.showPassword).toBeTrue();
      component.togglePasswordVisibility();
      expect(component.showPassword).toBeFalse();
    });

    it('should change input type from password to text when toggled', () => {
      const input = fixture.debugElement.query(By.css('#password')).nativeElement;
      expect(input.type).toBe('password');
      component.showPassword = true;
      fixture.detectChanges();
      expect(input.type).toBe('text');
    });

    it('should update aria-label on the toggle button', () => {
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('.toggle-password')).nativeElement;
      expect(btn.getAttribute('aria-label')).toBe('Show password');
      component.showPassword = true;
      fixture.detectChanges();
      expect(btn.getAttribute('aria-label')).toBe('Hide password');
    });
  });

  // ─── Submit with invalid form ─────────────────────────────────
  describe('submit() — invalid form', () => {
    it('should set an error message when form is empty on submit', fakeAsync(async () => {
      await component.submit();
      expect(component.errorMessage).toBe('Please fill in all fields.');
    }));

    it('should not call auth.login when form is invalid', fakeAsync(async () => {
      await component.submit();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    }));

    it('should mark all controls as touched on submit', fakeAsync(async () => {
      await component.submit();
      expect(component.form.get('username')?.touched).toBeTrue();
      expect(component.form.get('password')?.touched).toBeTrue();
    }));

    it('should set error when username is whitespace only', fakeAsync(async () => {
      component.form.get('username')?.setValue('   ');
      component.form.get('password')?.setValue('pass');
      await component.submit();
      expect(component.errorMessage).toBe('Please fill in all fields.');
    }));
  });

  // ─── Submit with failed login ─────────────────────────────────
  describe('submit() — failed login', () => {
    beforeEach(() => {
      mockAuthService.login.and.returnValue(false);
      component.form.get('username')?.setValue('admin');
      component.form.get('password')?.setValue('wrongpass');
    });

    it('should show invalid credentials error on failed login', fakeAsync(async () => {
      await component.submit();
      tick();
      expect(component.errorMessage).toBe(
        'Invalid credentials. Please check your username and password.'
      );
    }));

    it('should not navigate on failed login', fakeAsync(async () => {
      await component.submit();
      tick();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

    it('should reset isLoading after failed login', fakeAsync(async () => {
      await component.submit();
      tick();
      expect(component.isLoading).toBeFalse();
    }));
  });

  // ─── Submit with successful login ────────────────────────────
  describe('submit() — successful login', () => {
    beforeEach(() => {
      mockAuthService.login.and.returnValue(true);
      component.form.get('username')?.setValue('admin');
      component.form.get('password')?.setValue('admin');
    });

    it('should navigate to /dashboard when no last route is stored', fakeAsync(async () => {
      mockAuthService.getLastRoute.and.returnValue(null);
      await component.submit();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));

    it('should navigate to the stored last route when available', fakeAsync(async () => {
      mockAuthService.getLastRoute.and.returnValue('/patients');
      await component.submit();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/patients']);
    }));

    it('should fallback to /dashboard when last route is "/"', fakeAsync(async () => {
      mockAuthService.getLastRoute.and.returnValue('/');
      await component.submit();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));

    it('should call clearLastRoute on success', fakeAsync(async () => {
      mockAuthService.getLastRoute.and.returnValue(null);
      await component.submit();
      tick();
      expect(mockAuthService.clearLastRoute).toHaveBeenCalled();
    }));

    it('should clear errorMessage on successful login', fakeAsync(async () => {
      component.errorMessage = 'Some old error';
      await component.submit();
      tick();
      expect(component.errorMessage).toBe('');
    }));

    it('should reset isLoading after successful login', fakeAsync(async () => {
      mockAuthService.getLastRoute.and.returnValue(null);
      await component.submit();
      tick();
      expect(component.isLoading).toBeFalse();
    }));
  });

  // ─── Loading state ────────────────────────────────────────────
  describe('Loading state', () => {
    it('should disable the submit button while loading', () => {
      component.isLoading = true;
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('.login-btn')).nativeElement;
      expect(btn.disabled).toBeTrue();
    });

    it('should show "Signing in..." text while loading', () => {
      component.isLoading = true;
      fixture.detectChanges();
      const btnText = fixture.debugElement.query(By.css('.btn-text')).nativeElement;
      expect(btnText.textContent).toBe('Signing in...');
    });

    it('should show "Log In" text when not loading', () => {
      component.isLoading = false;
      fixture.detectChanges();
      const btnText = fixture.debugElement.query(By.css('.btn-text')).nativeElement;
      expect(btnText.textContent).toBe('Log In');
    });
  });

  // ─── Accessibility ────────────────────────────────────────────
  describe('Accessibility', () => {
    it('should set aria-invalid on username input when invalid and touched', () => {
      component.form.get('username')?.markAsTouched();
      fixture.detectChanges();
      const input = fixture.debugElement.query(By.css('#username')).nativeElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should set aria-invalid on password input when invalid and touched', () => {
      component.form.get('password')?.markAsTouched();
      fixture.detectChanges();
      const input = fixture.debugElement.query(By.css('#password')).nativeElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should render the error banner with role="alert"', () => {
      component.errorMessage = 'Some error';
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('.error-message'));
      expect(banner.nativeElement.getAttribute('role')).toBe('alert');
    });
  });
});