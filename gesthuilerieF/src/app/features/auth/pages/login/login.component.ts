import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';

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

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [true],
    });
  }

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
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
          this.router.navigateByUrl(returnUrl);
        },
        error: (error) => {
          if (error?.status === 401) {
            this.errorMessage = 'Email ou mot de passe incorrect';
            return;
          }
          this.errorMessage = 'Erreur de connexion, reessayez';
        },
      });
  }
}