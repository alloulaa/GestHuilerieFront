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
            const token = params['token'];
            if (token) {
                this.verifyEmail(token);
            } else {
                this.isError = true;
                this.errorMessage = 'Token de vérification manquant';
                this.isVerifying = false;
            }
        });
    }

    verifyEmail(token: string): void {
        // Appeler le service d'authentification pour vérifier l'email
        this.authService.verifyEmail(token).subscribe({
            next: (response) => {
                this.isVerifying = false;
                this.isSuccess = true;
                this.toastService.success('Email vérifié avec succès ! Redirection vers le dashboard...');
                setTimeout(() => {
                    this.router.navigate(['/pages/dashboard/production']);
                }, 2000);
            },
            error: (error) => {
                this.isVerifying = false;
                this.isError = true;
                this.errorMessage = error.error?.message || 'Erreur lors de la vérification';
                this.toastService.error(this.errorMessage);
            }
        });
    }
}
