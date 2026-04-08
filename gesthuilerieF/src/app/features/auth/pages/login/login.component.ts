import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  readonly loginForm;
  isLoading = false;
  errorMessage: string | null = null;
  showPassword = false;
  private readonly strictEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(this.strictEmailPattern)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [true],
    });
  }

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      const emailControl = this.loginForm.get('email');
      const passwordControl = this.loginForm.get('password');

      if (emailControl?.invalid) {
        this.errorMessage = 'Format email invalide.';
        this.toastService.show('error', 'Adresse email invalide. Exemple: abcd@gmail.com', 5500);
        return;
      }

      if (passwordControl?.errors?.['minlength']) {
        this.errorMessage = 'Votre mot de passe doit contenir au moins 8 caracteres.';
        this.toastService.show('info', 'Mot de passe faible. Utilisez au moins 8 caracteres avec un chiffre et un symbole special.', 6500);
        return;
      }

      if (passwordControl?.invalid) {
        this.errorMessage = 'Le mot de passe est obligatoire.';
        this.toastService.show('info', 'Veuillez saisir votre mot de passe pour continuer.', 5000);
        return;
      }

      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.isLoading = true;
    this.errorMessage = null;

    this.authService
      .login(email ?? '', password ?? '')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          if (!this.authService.isAuthenticated()) {
            this.errorMessage = 'Connexion etablie, mais token manquant. Verifiez la reponse API login.';
            this.toastService.show('error', this.errorMessage ?? 'Erreur de connexion, reessayez', 6500);
            return;
          }

          const rawReturnUrl = this.route.snapshot.queryParams['returnUrl'];
          let returnUrl = '/pages/dashboard/production';
          if (typeof rawReturnUrl === 'string' && rawReturnUrl.trim()) {
            try {
              returnUrl = decodeURIComponent(rawReturnUrl);
            } catch {
              returnUrl = rawReturnUrl;
            }
          }
          this.toastService.show('success', 'Connexion reussie. Bienvenue !', 3500);
          this.router.navigateByUrl(returnUrl);
        },
        error: (error) => {
          const backendMessage = String(error?.error?.message ?? error?.error?.error ?? '').toLowerCase();

          if (
            backendMessage.includes('verifier votre email')
            || backendMessage.includes('email non verifie')
            || backendMessage.includes('non vérifié')
          ) {
            this.errorMessage = 'Votre email n\'est pas encore verifie.';
            this.toastService.show('info', 'Compte non verifie. Verifiez votre boite mail puis reessayez.', 7000);
            return;
          }

          if (backendMessage.includes('utilisateur inactif')) {
            this.errorMessage = 'Compte inactif. Contactez un administrateur.';
            this.toastService.show('error', this.errorMessage, 7000);
            return;
          }

          if (
            error?.status === 401
            || backendMessage.includes('mot de passe invalide')
            || backendMessage.includes('email ou mot de passe invalide')
          ) {
            this.errorMessage = 'Email ou mot de passe incorrect.';
            this.toastService.show('error', 'Identifiants invalides. Verifiez votre email et votre mot de passe.', 7000);
            return;
          }

          this.errorMessage = 'Erreur de connexion, reessayez';
          this.toastService.show('error', this.errorMessage ?? 'Erreur de connexion, reessayez', 6000);
        },
      });
  }
}