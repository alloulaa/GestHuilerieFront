// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\auth\reset-password\reset-password-request.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password-request.component.html',
  styleUrl: './reset-password-request.component.scss'
})
export class ResetPasswordRequestComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    this.authService.resetPasswordRequest(this.form.value.email).subscribe({
      next: () => {
        this.successMessage = 'Si ce compte existe, un email a été envoyé. Le lien expire dans 30 minutes.';
        this.isLoading = false;
        this.form.reset();
      },
      error: () => {
        this.errorMessage = 'Erreur lors de l\'envoi. Réessayez.';
        this.isLoading = false;
      }
    });
  }
}
