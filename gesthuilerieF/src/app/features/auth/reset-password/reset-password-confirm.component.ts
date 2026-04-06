// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\auth\reset-password\reset-password-confirm.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password-confirm.component.html',
  styleUrl: './reset-password-confirm.component.scss'
})
export class ResetPasswordConfirmComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  token: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  passwordStrength = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.errorMessage = 'Lien invalide ou expiré';
      return;
    }

    this.form = this.fb.group({
      password: ['', [Validators.required, this.passwordStrengthValidator()]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator() });

    this.form.get('password')?.valueChanges.subscribe((val) => {
      this.updatePasswordStrength(val);
    });
  }

  passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';
      if (!value) return null;
      const isValid = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
      return isValid ? null : { passwordStrength: true };
    };
  }

  passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get('password')?.value;
      const confirmPassword = group.get('confirmPassword')?.value;
      return password === confirmPassword ? null : { passwordsMismatch: true };
    };
  }

  updatePasswordStrength(password: string): void {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    this.passwordStrength = Math.min(strength, 4);
  }

  onSubmit(): void {
    if (!this.token) {
      this.errorMessage = 'Lien invalide ou expiré';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.authService.resetPasswordConfirm(this.token, this.form.value.password).subscribe({
      next: (response) => {
        const isLoggedIn = this.authService.persistSessionFromResponse(response);

        if (isLoggedIn) {
          this.toastService.success('Mot de passe réinitialisé. Vous êtes maintenant connecté. Redirection vers le dashboard...');
        } else {
          this.toastService.info('Mot de passe réinitialisé. Redirection vers le dashboard...');
        }

        this.isLoading = false;
        this.form.reset();
        setTimeout(() => {
          this.router.navigate(['/pages/dashboard/production']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 400) {
          this.errorMessage = 'Lien expiré. Demandez un nouveau lien.';
        } else {
          this.errorMessage = 'Erreur. Réessayez.';
        }
      }
    });
  }
}
