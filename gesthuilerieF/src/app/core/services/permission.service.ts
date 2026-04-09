// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\core\services\permission.service.ts
import { Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';

interface PermissionFlat {
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExecuted: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  constructor(private authService: AuthService) { }

  private getPermissions(): PermissionFlat[] {
    const user = this.authService.getCurrentUser();
    return user?.permissions ?? user?.utilisateur?.permissions ?? user?.profil?.permissions ?? [];
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  private normalizeModuleKey(value: string): string {
    return this.normalize(value).replace(/[\s-]+/g, '_');
  }

  private getModuleAliases(module: string): string[] {
    const normalized = this.normalizeModuleKey(module);

    if (normalized === 'PRODUCTION' || normalized === 'GUIDE_DE_PRODUCTION' || normalized === 'GUIDE_PRODUCTION') {
      return ['PRODUCTION', 'GUIDE_PRODUCTION', 'GUIDE_DE_PRODUCTION', 'PRODUCTION_GUIDES'];
    }

    if (
      normalized === 'LOTS' ||
      normalized === 'LOTS_TRACABILITE' ||
      normalized === 'LOTS_TRACEABILITE'
    ) {
      return ['LOTS', 'LOTS_TRACABILITE', 'LOTS_TRACEABILITE', 'LOTS_TRAÇABILITE'];
    }

    if (
      normalized === 'STOCK' ||
      normalized === 'MOUVEMENT_STOCK' ||
      normalized === 'STOCK_MOUVEMENT'
    ) {
      return ['STOCK', 'MOUVEMENT_STOCK', 'STOCK_MOUVEMENT'];
    }

    return [normalized];
  }

  private extractRoleCandidates(): string[] {
    const user = this.authService.getCurrentUser();
    const candidates: unknown[] = [
      user?.role,
      user?.profil?.nom,
      user?.profil?.name,
      user?.utilisateur?.role,
      user?.utilisateur?.profil?.nom,
      user?.utilisateur?.profil?.name,
    ];

    if (Array.isArray(user?.roles)) {
      candidates.push(...user.roles);
    }

    return candidates
      .filter((value): value is string => typeof value === 'string' && !!value.trim())
      .map((value) => this.normalize(value));
  }

  hasPermission(module: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE'): boolean {
    const aliases = this.getModuleAliases(module);
    const perm = this.getPermissions().find((p) => aliases.includes(this.normalizeModuleKey(p.module)));
    if (!perm) return false;
    switch (action) {
      case 'CREATE': return perm.canCreate;
      case 'READ': return perm.canRead;
      case 'UPDATE': return perm.canUpdate;
      case 'DELETE': return perm.canDelete;
      case 'EXECUTE': return perm.canExecuted;
      default: return false;
    }
  }

  hasAnyPermission(module: string): boolean {
    const aliases = this.getModuleAliases(module);
    const perm = this.getPermissions().find((p) => aliases.includes(this.normalizeModuleKey(p.module)));
    if (!perm) return false;
    return perm.canCreate || perm.canRead || perm.canUpdate
      || perm.canDelete || perm.canExecuted;
  }

  canRead(module: string): boolean {
    return this.hasPermission(module, 'READ');
  }

  canCreate(module: string): boolean {
    return this.hasPermission(module, 'CREATE');
  }

  canUpdate(module: string): boolean {
    return this.hasPermission(module, 'UPDATE');
  }

  canDelete(module: string): boolean {
    return this.hasPermission(module, 'DELETE');
  }

  canExecute(module: string): boolean {
    return this.hasPermission(module, 'EXECUTE');
  }

  isAdmin(): boolean {
    const roles = this.extractRoleCandidates();
    return roles.some((role) => role.includes('ADMIN')) || roles.includes('ADMINISTRATEUR');
  }

  getVisibleModules(): string[] {
    return this.getPermissions()
      .filter(p => p.canRead)
      .map(p => p.module);
  }
}
