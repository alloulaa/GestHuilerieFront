// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\auth\profile\mon-profil.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { PermissionService } from '../../../core/services/permission.service';
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
  isSavingFullName = false;
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  private lastPersistedFullName = '';
  private syncFullNameInProgress = false;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private permissionService: PermissionService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUserProfile();
    this.initializeChangePasswordForm();
  }

  loadUserProfile(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.setupFullNamePersistenceHook();
    this.isLoading = false;
    this.extractPermissions();
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
    const userId = this.resolveUserId();
    if (!userId) {
      this.toastService.error('Impossible de sauvegarder le nom: identifiant utilisateur introuvable.');
      this.revertFullName();
      return;
    }

    this.isSavingFullName = true;

    const payload = {
      ...this.user,
      fullName: newFullName,
      name: newFullName,
      nomComplet: newFullName,
    };

    this.adminService.updateUtilisateur(userId, payload).subscribe({
      next: (updatedUser) => {
        this.syncFullNameInProgress = true;
        this.user = {
          ...this.user,
          ...(updatedUser ?? {}),
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
      error: () => {
        this.toastService.error('Echec de la mise a jour du nom complet');
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
    const modules = [
      'DASHBOARD',
      'RECEPTION',
      'PRODUCTION',
      'MACHINES',
      'MATIERES_PREMIERES',
      'STOCK',
      'LOTS',
      'UTILISATEURS',
      'PROFILS',
      'PARAMETRES'
    ];

    this.userPermissions = modules.map(module => ({
      module,
      canView: this.permissionService.hasPermission(module, 'READ'),
      canCreate: this.permissionService.hasPermission(module, 'CREATE'),
      canEdit: this.permissionService.hasPermission(module, 'UPDATE'),
      canDelete: this.permissionService.hasPermission(module, 'DELETE')
    }));
  }

  initializeChangePasswordForm(): void {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
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
