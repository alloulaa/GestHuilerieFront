import { Routes } from '@angular/router';
import { SidebarComponent } from './@theme/components/sidebar/sidebar.component';
import { AuthGuard } from './core/auth/auth.guard';

export const APP_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(c => c.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/pages/signup/signup.component').then(c => c.SignupComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password-request.component').then(c => c.ResetPasswordRequestComponent),
  },
  {
    path: 'reset-password/confirm',
    loadComponent: () => import('./features/auth/reset-password/reset-password-confirm.component').then(c => c.ResetPasswordConfirmComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/pages/verify-email/verify-email.component').then(c => c.VerifyEmailComponent),
  },
  {
    path: 'pages',
    component: SidebarComponent,
    canActivate: [AuthGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard/production',
        loadComponent: () => import('./features/dashboard/pages/production-dashboard/production-dashboard.component').then(c => c.ProductionDashboardComponent),
      },
      {
        path: 'dashboard/admin',
        loadComponent: () => import('./features/dashboard/pages/admin-dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent),
      },
      // Reception
      {
        path: 'reception',
        loadComponent: () => import('./features/reception/pages/reception-list/reception-list.component').then(c => c.ReceptionListComponent),
      },
      {
        path: 'reception/new',
        loadComponent: () => import('./features/reception/pages/reception-new/reception-new.component').then(c => c.ReceptionNewComponent),
      },
      {
        path: 'reception/form',
        loadComponent: () => import('./features/reception/pages/reception-form/reception-form.component').then(c => c.ReceptionFormComponent),
      },
      // Production
      {
        path: 'production/guides',
        loadComponent: () => import('./features/production/pages/production-guides/production-guides.component').then(c => c.ProductionGuidesComponent),
        children: [
          { path: '', redirectTo: 'consulter', pathMatch: 'full' },
          {
            path: 'consulter',
            loadComponent: () => import('./features/production/pages/production-guides/guides-consulter.component').then(c => c.GuidesConsulterComponent),
          },
          {
            path: 'creer',
            loadComponent: () => import('./features/production/pages/production-guides/guides-creer.component').then(c => c.GuidesCreerComponent),
          },
          {
            path: 'executer',
            loadComponent: () => import('./features/production/pages/production-guides/guides-executer.component').then(c => c.GuidesExecuterComponent),
          },
        ],
      },
      {
        path: 'production/quality',
        loadComponent: () => import('./features/production/pages/quality-yield/quality-yield.component').then(c => c.QualityYieldComponent),
      },
      // Raw material
      {
        path: 'matieres-premieres',
        loadComponent: () => import('./features/matieres-premieres/pages/raw-materials/raw-materials.component').then(c => c.RawMaterialsComponent),
        children: [
          {
            path: 'creer',
            loadComponent: () => import('./features/matieres-premieres/pages/raw-materials-creer/raw-materials-creer.component').then(c => c.RawMaterialsCreerComponent),
          },
          {
            path: 'consulter',
            loadComponent: () => import('./features/matieres-premieres/pages/raw-materials-consulter/raw-materials-consulter.component').then(c => c.RawMaterialsConsulterComponent),
          },
        ],
      },
      // Machines
      {
        path: 'machines',
        loadComponent: () => import('./features/machines/pages/machines-list/machines-list.component').then(c => c.MachinesListComponent),
      },
      {
        path: 'machines/form',
        loadComponent: () => import('./features/machines/pages/machines-form/machines-form.component').then(c => c.MachinesFormComponent),
      },
      {
        path: 'machines/management',
        loadComponent: () => import('./features/machines/pages/oil-mills-management/oil-mills-management.component').then(c => c.OilMillsManagementComponent),
      },
      {
        path: 'huileries/management',
        loadComponent: () => import('./features/huilerie/pages/huileries-management/huileries-management.component').then(c => c.HuileriesManagementComponent),
      },
      // Stock
      {
        path: 'stock',
        loadComponent: () => import('./features/stock/pages/stock-list/stock-list.component').then(c => c.StockListComponent),
      },
      {
        path: 'stock/form',
        loadComponent: () => import('./features/stock/pages/stock-form/stock-form.component').then(c => c.StockFormComponent),
      },
      {
        path: 'stock/history',
        loadComponent: () => import('./features/stock/pages/stock-list/stock-list.component').then(c => c.StockListComponent),
      },
      {
        path: 'stock/weighing',
        loadComponent: () => import('./features/stock/pages/weighing-stock/weighing-stock.component').then(c => c.WeighingStockComponent),
      },
      // Lots (feature separée)
      {
        path: 'lots/traceability',
        loadComponent: () => import('./features/lots/pages/lot-traceability/lot-traceability.component').then(c => c.LotTraceabilityComponent),
      },
      {
        path: 'lots',
        loadComponent: () => import('./features/lots/pages/lot-list/lot-list.component').then(c => c.LotListComponent),
      },
      {
        path: 'lots/:id',
        loadComponent: () => import('./features/lots/pages/lot-details/lot-details.component').then(c => c.LotDetailsComponent),
      },
      { path: 'raw-material', redirectTo: 'matieres-premieres', pathMatch: 'full' },
      // Users
      {
        path: 'users',
        loadComponent: () => import('./features/users/pages/user-accounts/user-accounts.component').then(c => c.UserAccountsComponent),
      },
      {
        path: 'mon-profil',
        loadComponent: () => import('./features/auth/profile/mon-profil.component').then(c => c.MonProfilComponent),
      },
      { path: 'dashboard', redirectTo: 'dashboard/production', pathMatch: 'full' },
      { path: 'production', redirectTo: 'production/guides', pathMatch: 'full' },
      { path: 'machines/state', redirectTo: 'machines', pathMatch: 'full' },
      { path: '', redirectTo: 'dashboard/production', pathMatch: 'full' },
    ],
  },
  { path: 'reception', redirectTo: 'pages/reception', pathMatch: 'full' },
  { path: 'machines', redirectTo: 'pages/machines', pathMatch: 'full' },
  { path: 'stock', redirectTo: 'pages/stock', pathMatch: 'full' },
  { path: 'lots', redirectTo: 'pages/lots', pathMatch: 'full' },
  { path: 'matieres-premieres', redirectTo: 'pages/matieres-premieres', pathMatch: 'full' },
  { path: 'admin', loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes) },
  { path: '', redirectTo: 'signup', pathMatch: 'full' },
  { path: '**', redirectTo: 'pages' },
];
