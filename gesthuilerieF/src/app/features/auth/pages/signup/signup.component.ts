import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  readonly signupForm;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.formBuilder.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
          motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      telephone: ['', [Validators.required]],
          acceptTerms: [false],
    });
  }

  submit(): void {
    console.log('[Signup] submit clicked', {
      isLoading: this.isLoading,
      formStatus: this.signupForm.status,
      formValuePreview: {
        nom: this.signupForm.get('nom')?.value,
        prenom: this.signupForm.get('prenom')?.value,
        email: this.signupForm.get('email')?.value,
        telephone: this.signupForm.get('telephone')?.value,
        motDePasseLength: String(this.signupForm.get('motDePasse')?.value ?? '').length,
        acceptTerms: this.signupForm.get('acceptTerms')?.value,
      },
    });

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      console.warn('[Signup] form invalid', {
        errorsByControl: {
          nom: this.signupForm.get('nom')?.errors,
          prenom: this.signupForm.get('prenom')?.errors,
          email: this.signupForm.get('email')?.errors,
          telephone: this.signupForm.get('telephone')?.errors,
          motDePasse: this.signupForm.get('motDePasse')?.errors,
          acceptTerms: this.signupForm.get('acceptTerms')?.errors,
        },
      });
          this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService
      .signup(this.signupForm.getRawValue())
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          console.log('[Signup] signup success');
          this.router.navigateByUrl('/login');
        },
        error: (error) => {
          console.error('[Signup] signup failed', {
            status: error?.status,
            message: error?.message,
            backend: error?.error,
          });
          this.errorMessage =
            error?.error?.message
            ?? error?.error?.error
            ?? 'Erreur d\'inscription, reessayez';
        },
      });
  }
}