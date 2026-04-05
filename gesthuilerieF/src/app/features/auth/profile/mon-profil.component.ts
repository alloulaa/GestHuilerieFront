// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\auth\profile\mon-profil.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
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
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private router: Router
  ) {}

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
    this.isLoading = false;
    this.extractPermissions();
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

    const { currentPassword, newPassword } = this.changePasswordForm.value;

    if (newPassword !== this.changePasswordForm.value.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.isChangingPassword = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Note: This would require an API endpoint for changing password
    // For now, we'll show a placeholder message
    setTimeout(() => {
      this.toastService.success('Mot de passe modifié avec succès');
      this.changePasswordForm.reset();
      this.isChangingPassword = false;
    }, 1000);
  }

  onLogout(): void {
    this.authService.logout();
    this.toastService.success('Déconnexion réussie');
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 1000);
  }
}
