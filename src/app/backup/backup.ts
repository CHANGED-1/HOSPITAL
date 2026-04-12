import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

interface BackupRecord {
  timestamp: string;
  size: string;
  status: 'completed' | 'pending' | 'failed';
}

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backup.html',
  styleUrls: ['./backup.scss'],
})
export class Backup {
  public backups: BackupRecord[] = [];
  public isCreatingBackup = false;
  public backupMessage = '';
  public backupError = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
    }
    this.loadBackupHistory();
  }

  private loadBackupHistory(): void {
    if (typeof window === 'undefined') return;
    const backupHistory = localStorage.getItem('hospital_backup_history');
    if (backupHistory) {
      try {
        this.backups = JSON.parse(backupHistory);
      } catch {
        this.backups = [];
      }
    }
  }

  private saveBackupHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('hospital_backup_history', JSON.stringify(this.backups));
  }

  public async createBackup(): Promise<void> {
    this.isCreatingBackup = true;
    this.backupMessage = '';
    this.backupError = '';

    try {
      // Collect all system data
      const backupData = this.collectAllData();
      
      // Create the backup file
      await this.downloadBackup(backupData);

      // Record the backup
      const record: BackupRecord = {
        timestamp: new Date().toISOString(),
        size: this.formatFileSize(JSON.stringify(backupData).length),
        status: 'completed',
      };
      this.backups.unshift(record);
      this.saveBackupHistory();

      this.backupMessage = '✓ Backup created successfully!';
    } catch (error) {
      console.error('Backup error:', error);
      this.backupError = '✗ Error creating backup. Please try again.';
    } finally {
      this.isCreatingBackup = false;
    }
  }

  private collectAllData(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};

    const backupData: Record<string, unknown> = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {},
    };

    // Storage keys to backup
    const storageKeys = [
      'hospital_auth_token',
      'hospital_system_users',
      'hospital_patients',
      'hospital_doctor_profiles',
      'hospital_services',
      'hospital_reports',
      'hospital_opd_register',
      'hospital_ipd_register',
      'hospital_goods_items',
      'hospital_diagnoses',
      'hospital_services_offered',
      'hospital_receipt_data',
      'hospital_logo',
    ];

    // Collect all data
    const dataObj = backupData['data'] as Record<string, unknown>;
    storageKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          dataObj[key] = JSON.parse(value);
        } catch {
          dataObj[key] = value;
        }
      }
    });

    return backupData;
  }

  private async downloadBackup(data: Record<string, unknown>): Promise<void> {
    // Create JSON blob
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospital-backup-${this.getDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public async restoreBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        if (!backupData.data || typeof backupData.data !== 'object') {
          throw new Error('Invalid backup file format');
        }

        // Restore data to localStorage
        Object.entries(backupData.data).forEach(([key, value]) => {
          if (typeof window !== 'undefined') {
            if (typeof value === 'string') {
              localStorage.setItem(key, value);
            } else {
              localStorage.setItem(key, JSON.stringify(value));
            }
          }
        });

        this.backupMessage = '✓ Backup restored successfully! Please refresh the page.';
        this.loadBackupHistory();
      } catch (error) {
        console.error('Restore error:', error);
        this.backupError = '✗ Error restoring backup. Invalid file format.';
      }
    };

    reader.readAsText(file);
    input.value = '';
  }

  public deleteBackupRecord(index: number): void {
    this.backups.splice(index, 1);
    this.saveBackupHistory();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/:/g, '-');
  }
}
