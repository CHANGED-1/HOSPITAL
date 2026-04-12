import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { LogoService } from '../logo.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings {
  protected get logoData() {
    return this.logoService.logoData;
  }

  constructor(
    protected readonly auth: AuthService,
    protected readonly logoService: LogoService,
    protected readonly router: Router,
  ) {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/dashboard']);
    }
  }

  protected onLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const data = reader.result as string;
      this.logoService.setLogo(data);
    };

    reader.readAsDataURL(file);
  }

  protected clearLogo(): void {
    this.logoService.setLogo(null);
  }

  protected clearAndUpload(fileInput: HTMLInputElement): void {
    this.clearLogo();
    fileInput.value = '';
    fileInput.click();
  }
}
