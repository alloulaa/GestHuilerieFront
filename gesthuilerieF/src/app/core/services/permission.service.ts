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
      normalized === 'COMPTES_PROFILS' ||
      normalized === 'GESTION_PARAMETRAGE' ||
      normalized === 'PARAMETRES' ||
      normalized === 'PROFILS' ||
      normalized === 'UTILISATEURS'
    ) {
      return ['COMPTES_PROFILS', 'GESTION_PARAMETRAGE', 'PARAMETRES', 'PROFILS', 'UTILISATEURS'];
    }

    if (
      normalized === 'LOTS' ||
      normalized === 'LOTS_TRACABILITE' ||
      normalized === 'LOTS_TRACEABILITE'
    ) {
      return ['LOTS', 'LOTS_TRACABILITE', 'LOTS_TRACEABILITE', 'LOTS_TRAÇABILITE'];
    }

    if (normalized === 'STOCK_MOUVEMENT' || normalized === 'STOCK_MOUVEMENTS' || normalized === 'MOUVEMENTS') {
      return ['STOCK_MOUVEMENT', 'STOCK_MOUVEMENTS', 'MOUVEMENTS'];
    }

    if (normalized === 'CAMPAGNE_OLIVES' || normalized === 'CAMPAGNES' || normalized === 'CAMPAGNE') {
      return ['CAMPAGNE_OLIVES', 'CAMPAGNES', 'CAMPAGNE'];
    }

    return [normalized];
  }

  private extractRoleCandidates(): string[] {
    const user = this.authService.getCurrentUser();
    const candidates: unknown[] = [
      user?.role,
      user?.roleName,
      user?.nomRole,
      user?.profile,
      user?.profileName,
      user?.profil,
      user?.profilName,
      user?.profilNom,
      user?.nomProfil,
      user?.type,
      user?.userType,
      user?.profil?.nom,
      user?.profil?.name,
      user?.profil?.profil,
      user?.profil?.code,
      user?.profil?.label,
      user?.profil?.libelle,
      user?.profil?.type,
      user?.utilisateur?.role,
      user?.utilisateur?.roleName,
      user?.utilisateur?.nomRole,
      user?.utilisateur?.profile,
      user?.utilisateur?.profileName,
      user?.utilisateur?.profil,
      user?.utilisateur?.profilName,
      user?.utilisateur?.profilNom,
      user?.utilisateur?.nomProfil,
      user?.utilisateur?.type,
      user?.utilisateur?.userType,
      user?.utilisateur?.profil?.nom,
      user?.utilisateur?.profil?.name,
      user?.utilisateur?.profil?.profil,
      user?.utilisateur?.profil?.code,
      user?.utilisateur?.profil?.label,
      user?.utilisateur?.profil?.libelle,
      user?.utilisateur?.profil?.type,
    ];

    if (Array.isArray(user?.roles)) {
      for (const role of user.roles) {
        if (typeof role === 'string') {
          candidates.push(role);
          continue;
        }

        if (role && typeof role === 'object') {
          const roleObj = role as Record<string, unknown>;
          candidates.push(
            roleObj['name'],
            roleObj['nom'],
            roleObj['code'],
            roleObj['label'],
            roleObj['libelle'],
            roleObj['type'],
            roleObj['role']
          );
        }
      }
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
    const user = this.authService.getCurrentUser();
    if (user?.isAdmin === true || user?.utilisateur?.isAdmin === true) {
      return true;
    }

    const roles = this.extractRoleCandidates();
    return roles.some((role) => role.includes('ADMIN') || role.includes('ADMINISTRATEUR'));
  }

  getVisibleModules(): string[] {
    return this.getPermissions()
      .filter(p => p.canRead)
      .map(p => p.module);
  }
}
