// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\core\guards\role.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const requiredProfil = route.data['requiredProfil'];
    if (!requiredProfil) {
      return true;
    }

    if (requiredProfil === 'ADMIN') {
      const canManageAccess = this.permissionService.hasAnyPermission('COMPTES_PROFILS');
      if (this.permissionService.isAdmin() || canManageAccess) {
        return true;
      }
    }

    this.router.navigate(['/pages']);
    return false;
  }
}
