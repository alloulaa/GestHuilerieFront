import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { HuilerieService } from '../../machines/services/huilerie.service';
import { EntrepriseService } from '../../machines/services/entreprise.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-mon-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mon-profil.component.html',
  styleUrl: './mon-profil.component.scss'
})
export class MonProfilComponent implements OnInit {
  user: any = null;
  userPermissions: any[] = [];
  changePasswordForm!: FormGroup;
  isChangingPassword = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isSavingFullName = false;
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  private lastPersistedFullName = '';
  private syncFullNameInProgress = false;

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private router: Router,
    private huilerieService: HuilerieService,
    private entrepriseService: EntrepriseService,
  ) { }


  ngOnInit(): void {
    this.initializeChangePasswordForm();

    // React to any change in currentUser (e.g., permissions updated by admin)
    this.authService.currentUser.subscribe((u) => {
      this.user = u ?? this.authService.getCurrentUser();
      if (!this.user) {
        this.router.navigate(['/login']);
        return;
      }
      this.setupFullNamePersistenceHook();
      this.extractPermissions();
      this.loadEntrepriseAndHuilerie();
      this.isLoading = false;
    });

    // Fetch latest profile from backend to ensure permissions are up-to-date
    this.isLoading = true;
    this.authService.getMe().subscribe({
      next: () => { this.isLoading = false; },
      error: () => { this.isLoading = false; /* silent fallback to cached user */ },
    });
  }

  loadUserProfile(): void {
    // Deprecated: kept for compatibility. Prefer subscription in ngOnInit.
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.setupFullNamePersistenceHook();
    this.isLoading = false;
    this.extractPermissions();
    this.loadEntrepriseAndHuilerie();
  }

  private setupFullNamePersistenceHook(): void {
    if (!this.user || this.user.__fullNamePersistenceHooked) {
      return;
    }

    const initialName = this.resolveDisplayName(this.user);
    this.lastPersistedFullName = initialName;
    this.user.__fullNamePersistenceHooked = true;
    this.user.__fullNameValue = initialName;

    Object.defineProperty(this.user, 'fullName', {
      configurable: true,
      enumerable: true,
      get: () => this.user.__fullNameValue,
      set: (value: unknown) => {
        this.user.__fullNameValue = value;

        if (this.syncFullNameInProgress) {
          return;
        }

        const normalized = String(value ?? '').trim();
        if (!normalized || normalized === this.lastPersistedFullName || this.isSavingFullName) {
          return;
        }

        this.persistFullName(normalized);
      },
    });
  }

  private persistFullName(newFullName: string): void {
    const [prenom, ...nomParts] = newFullName.trim().split(/\s+/);
    const nom = nomParts.join(' ').trim();

    if (!prenom || !nom) {
      this.toastService.error('Saisissez un prenom et un nom.');
      this.revertFullName();
      return;
    }

    this.isSavingFullName = true;

    const payload = {
      prenom,
      nom,
    };

    this.authService.updateProfile(payload).subscribe({
      next: (response) => {
        const updatedUser =
          response?.utilisateur ??
          response?.user ??
          response?.data?.utilisateur ??
          response?.data?.user ??
          null;

        this.syncFullNameInProgress = true;
        this.user = {
          ...this.user,
          ...updatedUser,
          prenom,
          nom,
          fullName: newFullName,
          name: newFullName,
          nomComplet: newFullName,
        };
        this.syncFullNameInProgress = false;

        this.lastPersistedFullName = newFullName;
        localStorage.setItem('currentUser', JSON.stringify(this.user));
        this.setupFullNamePersistenceHook();
        this.toastService.success('Nom complet mis a jour avec succes');
      },
      error: (error) => {
        this.toastService.error(
          error?.error?.message ?? error?.error?.error ?? 'Echec de la mise a jour du nom complet'
        );
        this.revertFullName();
      },
      complete: () => {
        this.isSavingFullName = false;
      },
    });
  }
  private revertFullName(): void {
    this.syncFullNameInProgress = true;
    this.user.fullName = this.lastPersistedFullName;
    this.user.name = this.lastPersistedFullName;
    this.user.nomComplet = this.lastPersistedFullName;
    this.syncFullNameInProgress = false;
  }

  private resolveUserId(): number | null {
    const candidates = [
      this.user?.id,
      this.user?.idUtilisateur,
      this.user?.utilisateurId,
      this.user?.userId,
    ];

    const validId = candidates.find(value => Number.isFinite(Number(value)) && Number(value) > 0);
    return validId ? Number(validId) : null;
  }

  private resolveDisplayName(user: any): string {
    const computedName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim();
    return user?.fullName || user?.name || user?.nomComplet || computedName || user?.email || 'N/A';
  }

  extractPermissions(): void {
    const user = this.authService.getCurrentUser() ?? this.user;

    const rawPerms: any[] = Array.isArray(user?.permissions) ? user.permissions : [];

    // If admin, present full-access for visible modules
    if (this.permissionService.isAdmin()) {
      const modules = this.permissionService.getVisibleModules();
      this.userPermissions = modules.map((m) => ({ module: m, canView: true, canCreate: true, canEdit: true, canDelete: true }));
      return;
    }

    // Map backend permission objects into canonical rows
    const rows: Array<{ module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = [];

    const resolveBool = (obj: any, keys: string[]) => {
      for (const k of keys) {
        if (k in obj && obj[k] !== undefined && obj[k] !== null) {
          return Boolean(obj[k]);
        }
      }
      return false;
    };

    for (const p of rawPerms) {
      const moduleName = String(p?.module ?? p?.nom ?? p?.name ?? p?.moduleName ?? '').trim();
      if (!moduleName) continue;
      const canView = resolveBool(p, ['canRead', 'can_read', 'read', 'canView', 'afficher', 'canAfficher', 'view']);
      const canCreate = resolveBool(p, ['canCreate', 'can_create', 'create', 'creer', 'canCreate']);
      const canEdit = resolveBool(p, ['canUpdate', 'can_update', 'update', 'edit', 'editer', 'canEdit']);
      const canDelete = resolveBool(p, ['canDelete', 'can_delete', 'delete', 'supprimer', 'canDelete']);

      // Only include if at least one flag is true (avoid empty rows)
      if (canView || canCreate || canEdit || canDelete) {
        rows.push({ module: moduleName, canView, canCreate, canEdit, canDelete });
      }
    }

    // Fallback: if backend provided no structured permissions, infer from PermissionService visible modules
    if (rows.length === 0) {
      const modules = this.permissionService.getVisibleModules();
      this.userPermissions = modules.map(module => ({
        module,
        canView: this.permissionService.canRead(module),
        canCreate: this.permissionService.canCreate(module),
        canEdit: this.permissionService.canUpdate(module),
        canDelete: this.permissionService.canDelete(module),
      }));
      return;
    }

    this.userPermissions = rows;
  }

  private loadEntrepriseAndHuilerie(): void {
    try {
      const user = this.authService.getCurrentUser() ?? this.user;
      const entrepriseId = this.authService.getCurrentUserEntrepriseId();
      const huilerieId = this.authService.getCurrentUserHuilerieId();

      if (huilerieId) {
        this.huilerieService.findById(huilerieId).subscribe({
          next: (h) => {
            if (h) {
              // ensure nested huilerie/entreprise names propagate into displayed user object
              this.user.huilerie = h;
              if (!this.user.companyName) {
                const maybeEntreprise = (h as any)?.entreprise;
                if (maybeEntreprise?.nom) {
                  this.user.companyName = maybeEntreprise.nom;
                }
              }
            }
          },
          error: () => { /* ignore */ }
        });
      }

      if (entrepriseId) {
        this.entrepriseService.getById(entrepriseId).subscribe({
          next: (e) => {
            if (e) {
              this.user.companyName = e.nom ?? this.user.companyName ?? '';
            }
          },
          error: () => { /* ignore */ }
        });
      }
    } catch {
      // swallow errors to avoid breaking profile display
    }
  }

  initializeChangePasswordForm(): void {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
      return;
    }

    if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
      return;
    }

    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm.value;

    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.isChangingPassword = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = {
      currentPassword,
      newPassword,
      confirmPassword,
    };

    this.authService.updateProfile(payload).subscribe({
      next: (response) => {
        const updatedUser = response?.utilisateur ?? response?.user ?? response?.data?.utilisateur ?? response?.data?.user ?? null;
        if (updatedUser) {
          this.user = {
            ...this.user,
            ...updatedUser,
          };
          this.setupFullNamePersistenceHook();
        }

        this.successMessage = 'Mot de passe modifie avec succes';
        this.toastService.success(this.successMessage);
        this.changePasswordForm.reset();
      },
      error: (error) => {
        const backendMessage = String(error?.error?.message ?? error?.error?.error ?? '').toLowerCase();

        if (backendMessage.includes('mot de passe actuel incorrect')) {
          this.errorMessage = 'Mot de passe actuel incorrect';
        } else if (backendMessage.includes('confirmation')) {
          this.errorMessage = 'La confirmation du nouveau mot de passe est invalide';
        } else if (backendMessage.includes('obligatoires')) {
          this.errorMessage = 'Ancien mot de passe, nouveau mot de passe et confirmation sont obligatoires';
        } else {
          this.errorMessage = error?.error?.message ?? error?.error?.error ?? 'Echec de la modification du mot de passe';
        }

        this.toastService.error(this.errorMessage ?? 'Echec de la modification du mot de passe');
      },
      complete: () => {
        this.isChangingPassword = false;
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.toastService.success('Déconnexion réussie');
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 1000);
  }
}
