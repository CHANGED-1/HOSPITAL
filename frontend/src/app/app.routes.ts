import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Login } from './login/login';
import { AuthGuard } from './auth.guard';
import { Patients } from './patients/patients';
import { RegisterPatients } from './register-patients/register-patients';
import { ServicePatient } from './service-patient/service-patient';
import { IPDRegister } from './ipd-register/ipd-register';
import { Doctors } from './doctors/doctors';
import { Reports } from './reports/reports';
import { ServicesDashboard } from './services-dashboard/services-dashboard';
import { Settings } from './settings/settings';
import { OPDRegister } from './opd-register/opd-register';
import { SimplePage } from './simple-page/simple-page';
import { RegisterGoodsServices } from './register-goods-services/register-goods-services';
import { RegisterDiagnoses } from './register-diagnoses/register-diagnoses';
import { Receipt } from './receipt/receipt';
import { DoctorDashboard } from './doctor-dashboard/doctor-dashboard';
import { Users } from './users/users';
import { Backup } from './backup/backup';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard] },
  { path: 'patients', component: Patients, canActivate: [AuthGuard] },
  { path: 'register', component: RegisterPatients, canActivate: [AuthGuard] },
  { path: 'service', component: ServicePatient, canActivate: [AuthGuard] },
  { path: 'opd', component: OPDRegister, canActivate: [AuthGuard] },
  { path: 'ipd', component: IPDRegister, canActivate: [AuthGuard] },
  { path: 'services', component: ServicesDashboard, canActivate: [AuthGuard] },
  { path: 'doctors', component: Doctors, canActivate: [AuthGuard] },
  { path: 'doctor-dashboard', component: DoctorDashboard, canActivate: [AuthGuard] },
  { path: 'reports', component: Reports, canActivate: [AuthGuard] },
  { path: 'settings', component: Settings, canActivate: [AuthGuard] },
  
  // Register dropdown items
  { path: 'departments', component: SimplePage, data: { title: 'Departments', description: 'Manage hospital departments.' }, canActivate: [AuthGuard] },
  
  // Finance dropdown items
  { path: 'receipt', component: Receipt, data: { title: 'Receipt', description: 'Create and manage receipts.' }, canActivate: [AuthGuard] },
  { path: 'outgoing-invoices', component: SimplePage, data: { title: 'Outgoing Invoices', description: 'Create and track outgoing invoices.' }, canActivate: [AuthGuard] },
  { path: 'incoming-invoices', component: SimplePage, data: { title: 'Incoming Invoices', description: 'Manage incoming supplier invoices.' }, canActivate: [AuthGuard] },
  { path: 'payments', component: SimplePage, data: { title: 'Payments', description: 'Record and track payments.' }, canActivate: [AuthGuard] },
  
  // Inventory dropdown items
  { path: 'stock', component: SimplePage, data: { title: 'Stock', description: 'View and manage inventory stock levels.' }, canActivate: [AuthGuard] },
  { path: 'register-goods-services', component: RegisterGoodsServices, canActivate: [AuthGuard] },
  { path: 'register-diagnoses', component: RegisterDiagnoses, canActivate: [AuthGuard] },
  { path: 'suppliers', component: SimplePage, data: { title: 'Suppliers', description: 'Manage supplier information and contacts.' }, canActivate: [AuthGuard] },
  
  // System dropdown items
  { path: 'tools', component: SimplePage, data: { title: 'Tools', description: 'Access system tools and utilities.' }, canActivate: [AuthGuard] },
  { path: 'taskpane', component: SimplePage, data: { title: 'Task Pane', description: 'Quick access to common tasks.' }, canActivate: [AuthGuard] },
  { path: 'users', component: Users, data: { title: 'Users', description: 'Manage system users and permissions.' }, canActivate: [AuthGuard] },
  { path: 'backup', component: Backup, canActivate: [AuthGuard] },
  
  // Legacy routes (kept for compatibility)
  { path: 'pricelist', component: SimplePage, data: { title: 'PriceList', description: 'View and edit price list items.' }, canActivate: [AuthGuard] },
  { path: 'company-accounts', component: SimplePage, data: { title: 'Company Accounts', description: 'Manage company financial accounts.' }, canActivate: [AuthGuard] },
  { path: 'register-wards', component: SimplePage, data: { title: 'Register Wards', description: 'Add and configure hospital wards.' }, canActivate: [AuthGuard] },
  
  { path: '**', redirectTo: '' },
];


