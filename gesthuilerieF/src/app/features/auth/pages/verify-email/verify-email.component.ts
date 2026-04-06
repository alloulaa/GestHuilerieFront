import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
    isVerifying = true;
    isSuccess = false;
    isError = false;
    errorMessage = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            const token = this.normalizeToken(params['token']);
            if (token) {
                this.verifyEmail(token);
            } else {
                this.isError = true;
                this.errorMessage = 'Token de vérification manquant';
                this.isVerifying = false;
            }
        });
    }

    private normalizeToken(rawToken: unknown): string {
        const token = String(rawToken ?? '').trim();
        if (!token) {
            return '';
        }

        // Some email clients may alter query strings; restore likely '+' chars.
        return token.replace(/\s+/g, '+');
    }

    verifyEmail(token: string): void {
        // Appeler le service d'authentification pour vérifier l'email
        this.authService.verifyEmail(token).subscribe({
            next: (response) => {
                this.isVerifying = false;
                this.isSuccess = true;

                const isLoggedIn = this.authService.persistSessionFromResponse(response);

                if (isLoggedIn) {
                    this.toastService.success('Email vérifié. Vous êtes maintenant connecté. Redirection vers le dashboard...');
                } else {
                    this.toastService.info('Email vérifié avec succès ! Redirection vers le dashboard...');
                }

                setTimeout(() => {
                    this.router.navigate(['/pages/dashboard/production']);
                }, 2000);
            },
            error: (error) => {
                this.isVerifying = false;
                this.isError = true;
                const backendMessage = String(error?.error?.message ?? error?.error ?? '').toLowerCase();

                if (error?.status === 400 || backendMessage.includes('token')) {
                    this.errorMessage = 'Token de vérification invalide ou expiré.';
                } else {
                    this.errorMessage = 'Erreur lors de la vérification';
                }
                this.toastService.error(this.errorMessage);
            }
        });
    }
}
