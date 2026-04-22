// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\core\guards\role.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate, CanActivateChild {
  private readonly moduleMap: Record<string, string> = {
    reception: 'RECEPTION',
    production: 'GUIDE_PRODUCTION',
    guides: 'GUIDE_PRODUCTION',
    'guide-production': 'GUIDE_PRODUCTION',
    machines: 'MACHINES',
    'matieres-premieres': 'MATIERES_PREMIERES',
    stock: 'STOCK',
    lots: 'LOTS_TRAÇABILITE',
    'lots-tracabilite': 'LOTS_TRAÇABILITE',
    traceability: 'LOTS_TRAÇABILITE',
    huileries: 'HUILERIES',
    dashboard: 'DASHBOARD',
    'stock-mouvement': 'STOCK_MOUVEMENT',
    campagnes: 'CAMPAGNE_OLIVES',
    campagne: 'CAMPAGNE_OLIVES',
    'gestion-parametrage': 'COMPTES_PROFILS',
    users: 'COMPTES_PROFILS'
  };

  private readonly actionMap: Record<string, 'canRead' | 'canCreate' | 'canExecute'> = {
    consulter: 'canRead',
    traceability: 'canRead',
    history: 'canRead',
    gerer: 'canCreate',
    creer: 'canCreate',
    new: 'canCreate',
    form: 'canCreate',
    management: 'canCreate',
    executer: 'canExecute'
  };

  private readonly fallbackRoutes: Record<string, { read?: string; create?: string; execute?: string }> = {
    RECEPTION: { read: '/pages/reception/consulter', create: '/pages/reception/gerer' },
    GUIDE_PRODUCTION: {
      read: '/pages/production/guides/consulter',
      create: '/pages/production/guides/gerer',
      execute: '/pages/production/guides/executer'
    },
    MACHINES: { read: '/pages/machines', create: '/pages/machines/management' },
    MATIERES_PREMIERES: { read: '/pages/matieres-premieres/consulter', create: '/pages/matieres-premieres/gerer' },
    STOCK: { read: '/pages/stock', create: '/pages/stock' },
    LOTS_TRAÇABILITE: { read: '/pages/lots/traceability' },
    DASHBOARD_ADMIN: { read: '/pages/dashboard/admin' },
    HUILERIES: { read: '/pages/huileries/management', create: '/pages/huileries/management' },
    STOCK_MOUVEMENT: { read: '/pages/lots/movements/history', create: '/pages/lots/movements/create' },
    CAMPAGNE_OLIVES: { read: '/pages/campagnes/consulter', create: '/pages/campagnes/gerer' },
    COMPTES_PROFILS: { read: '/admin/profils', create: '/admin/profils' },
    DASHBOARD: { read: '/pages/dashboard/production' }
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private permissionService: PermissionService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    if (state.url.startsWith('/admin') && !this.permissionService.isAdmin()) {
      this.router.navigate(['/pages']);
      return false;
    }

    const requiredProfil = route.data['requiredProfil'];
    if (requiredProfil === 'ADMIN') {
      if (this.permissionService.isAdmin()) {
        return true;
      }

      this.router.navigate(['/pages']);
      return false;
    }

    if (this.permissionService.isAdmin()) {
      return true;
    }

    if (!this.getFirstAccessibleUrl()) {
      this.router.navigate(['/access-pending']);
      return false;
    }

    const segments = state.url.split('/').filter(segment => segment);
    const moduleName = this.resolveModuleName(segments);
    const actionMethod = this.resolveActionMethod(segments);

    if (!moduleName) {
      return true;
    }

    if (!actionMethod) {
      return this.permissionService.canRead(moduleName) ? true : this.navigateToFallbackPage();
    }

    const hasPermission =
      actionMethod === 'canRead'
        ? this.permissionService.canRead(moduleName)
        : actionMethod === 'canCreate'
          ? this.permissionService.canCreate(moduleName)
          : this.permissionService.canExecute(moduleName);

    if (hasPermission) {
      return true;
    }

    return this.navigateToFallbackPage();
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(childRoute, state);
  }

  private navigateToFallbackPage(): boolean {
    const accessibleUrl = this.getFirstAccessibleUrl();

    if (accessibleUrl) {
      this.router.navigateByUrl(accessibleUrl);
      return false;
    }

    this.router.navigate(['/access-pending']);
    return false;
  }

  private resolveModuleName(segments: string[]): string | null {
    if (segments.includes('dashboard') && segments.includes('admin')) {
      return 'DASHBOARD_ADMIN';
    }

    if (segments.includes('lots') && segments.includes('movements')) {
      return 'STOCK_MOUVEMENT';
    }

    const moduleKey = segments.find(segment => this.moduleMap[segment]);
    return moduleKey ? this.moduleMap[moduleKey] : null;
  }

  private resolveActionMethod(segments: string[]): 'canRead' | 'canCreate' | 'canExecute' | null {
    const actionKey = segments.find(segment => this.actionMap[segment]);
    return actionKey ? this.actionMap[actionKey] : null;
  }

  private getFirstAccessibleUrl(): string | null {
    const moduleOrder = [
      'DASHBOARD',
      'RECEPTION',
      'GUIDE_PRODUCTION',
      'MACHINES',
      'MATIERES_PREMIERES',
      'STOCK',
      'STOCK_MOUVEMENT',
      'CAMPAGNE_OLIVES',
      'LOTS_TRAÇABILITE',
      'HUILERIES',
      'DASHBOARD_ADMIN',
      'COMPTES_PROFILS'
    ];

    for (const moduleName of moduleOrder) {
      if (moduleName === 'COMPTES_PROFILS' && !this.permissionService.isAdmin()) {
        continue;
      }

      const fallback = this.fallbackRoutes[moduleName];

      if (this.permissionService.canRead(moduleName)) {
        if (fallback?.read) {
          return fallback.read;
        }
      }

      if (this.permissionService.canCreate(moduleName)) {
        if (fallback?.create) {
          return fallback.create;
        }
      }

      if (this.permissionService.canExecute(moduleName)) {
        if (fallback?.execute) {
          return fallback.execute;
        }
      }
    }

    return null;
  }
}
