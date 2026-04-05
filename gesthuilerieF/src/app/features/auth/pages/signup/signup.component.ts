import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

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
  private readonly strictEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.signupForm = this.formBuilder.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(this.strictEmailPattern)]],
      motDePasse: ['', [Validators.required, Validators.minLength(8), this.passwordComplexityValidator()]],
      telephone: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    });
  }

  private passwordComplexityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '');
      if (!value) {
        return null;
      }

      const hasNumber = /\d/.test(value);
      const hasSpecial = /[^A-Za-z0-9]/.test(value);
      return hasNumber && hasSpecial ? null : { weakPassword: true };
    };
  }

  submit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      const emailControl = this.signupForm.get('email');
      const passwordControl = this.signupForm.get('motDePasse');
      const termsControl = this.signupForm.get('acceptTerms');

      if (emailControl?.invalid) {
        this.toastService.show(
          'error',
          'Format email invalide. Exemple valide: abcd@gmail.com',
          6000
        );
        this.errorMessage = 'Veuillez corriger votre adresse email.';
        return;
      }

      if (passwordControl?.errors?.['minlength'] || passwordControl?.errors?.['weakPassword']) {
        this.toastService.show(
          'info',
          'Mot de passe faible. Utilisez au moins 8 caracteres avec un chiffre et un symbole special.',
          6500
        );
        this.errorMessage = 'Votre mot de passe ne respecte pas les criteres de securite.';
        return;
      }

      if (termsControl?.invalid) {
        this.toastService.show(
          'info',
          'Veuillez accepter les conditions pour continuer l\'inscription.',
          5000
        );
        this.errorMessage = 'Vous devez accepter les conditions d\'utilisation.';
        return;
      }

      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    const formValue = this.signupForm.getRawValue();

    this.isLoading = true;
    this.errorMessage = null;

    this.authService
      .signup(formValue)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          const email = formValue.email ?? 'votre adresse';
          this.toastService.show('success', `Un mail de verification a ete envoye a ${email}. Verifiez votre boite mail.`, 7000);
          this.signupForm.reset({ acceptTerms: false });
        },
        error: (error) => {
          const backendMessage = String(error?.error?.message ?? error?.error?.error ?? '').toLowerCase();

          if (error?.status === 409 || backendMessage.includes('deja utilise') || backendMessage.includes('already')) {
            this.errorMessage = 'Cette adresse email est deja utilisee.';
            this.toastService.show('error', 'Cet email est deja utilise. Essayez de vous connecter ou utilisez un autre email.', 7000);
            return;
          }

          this.errorMessage =
            error?.error?.message
            ?? error?.error?.error
            ?? 'Erreur d\'inscription, reessayez';
          this.toastService.show('error', this.errorMessage ?? 'Erreur d\'inscription, reessayez', 6000);
        },
      });
  }
}