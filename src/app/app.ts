import { Component, signal, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from './auth.service';
import { LogoService } from './logo.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  protected readonly title = signal('HOSPITAL');
  protected readonly auth = inject(AuthService);
  protected readonly logoService = inject(LogoService);
  protected readonly logoData = this.logoService.logoData;
  private readonly router = inject(Router);

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:keydown', ['$event'])
  @HostListener('document:scroll', ['$event'])
  @HostListener('document:click', ['$event'])
  onUserActivity(event: Event): void {
    this.auth.resetInactivityTimer();
  }

  ngOnInit(): void {
    // Track route changes and save last visited route for session restoration
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.urlAfterRedirects && this.auth.isLoggedIn()) {
          this.auth.saveCurrentRoute(event.urlAfterRedirects);
        }
      });
  }
}

