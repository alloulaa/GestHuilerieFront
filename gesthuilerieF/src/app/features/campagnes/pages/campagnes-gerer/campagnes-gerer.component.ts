import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CampagneOlives } from '../../models/campagne.models';
import { CampagneService } from '../../services/campagne.service';
import { ToastService } from '../../../../core/services/toast.service';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
    selector: 'app-campagnes-gerer',
    standalone: true,
    templateUrl: './campagnes-gerer.component.html',
    styleUrls: ['./campagnes-gerer.component.scss'],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
    ],
})
export class CampagnesGererComponent implements OnInit {
    campagnes: CampagneOlives[] = [];
    huileries: Array<{ idHuilerie: number; nom: string }> = [];
    editingId: number | null = null;
    readonly isAdmin: boolean;

    readonly form: FormGroup<{
        annee: FormControl<string | null>;
        dateDebut: FormControl<string | null>;
        dateFin: FormControl<string | null>;
        huilerieId: FormControl<number | null>;
    }>;

    constructor(
        private fb: FormBuilder,
        private campagneService: CampagneService,
        private toastService: ToastService,
        private huilerieService: HuilerieService,
        private authService: AuthService,
        private confirmDialogService: ConfirmDialogService,
    ) {
        this.isAdmin = this.authService.isCurrentUserAdmin();
        this.form = this.fb.group({
            annee: this.fb.control<string | null>('', [Validators.required, Validators.pattern(/^\d{4}$/)]),
            dateDebut: this.fb.control<string | null>(''),
            dateFin: this.fb.control<string | null>(''),
            huilerieId: this.fb.control<number | null>(null, [Validators.required]),
        });
    }

    ngOnInit(): void {
        this.loadHuileries();
        this.reload();
    }

    get isEditMode(): boolean {
        return this.editingId !== null;
    }

    async submit(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.toastService.error('Veuillez corriger les champs requis.');
            return;
        }

        const raw = this.form.getRawValue();
        const huilerieId = Number(raw.huilerieId ?? 0);

        if (!this.isEditMode && (!Number.isFinite(huilerieId) || huilerieId <= 0)) {
            this.toastService.error('Selectionnez une huilerie valide.');
            return;
        }

        const payload = {
            annee: String(raw.annee ?? '').trim(),
            dateDebut: String(raw.dateDebut ?? '').trim() || undefined,
            dateFin: String(raw.dateFin ?? '').trim() || undefined,
            huilerieId,
        };

        const confirmed = await this.confirmDialogService.confirm({
            title: this.isEditMode ? 'Confirmer la modification' : 'Confirmer la creation',
            message: this.isEditMode
                ? 'Voulez-vous enregistrer les modifications de cette campagne ?'
                : 'Voulez-vous creer cette campagne ? ',
            confirmText: 'Confirmer',
            cancelText: 'Annuler',
            intent: 'primary',
        });

        if (!confirmed) {
            this.toastService.info('Operation annulee.');
            return;
        }

        const request$ = this.isEditMode
            ? this.campagneService.update(this.editingId!, {
                annee: payload.annee,
                dateDebut: payload.dateDebut,
                dateFin: payload.dateFin,
                huilerieId: payload.huilerieId,
            })
            : this.campagneService.create(payload);

        request$.subscribe({
            next: () => {
                this.toastService.success(this.isEditMode ? 'Campagne mise a jour.' : 'Campagne creee.');
                this.resetForm();
                this.reload();
            },
            error: () => {
                this.toastService.error('Impossible d enregistrer la campagne.');
            },
        });
    }

    edit(campagne: CampagneOlives): void {
        this.editingId = campagne.idCampagne ?? null;
        this.form.patchValue({
            annee: campagne.annee ?? '',
            dateDebut: campagne.dateDebut ?? '',
            dateFin: campagne.dateFin ?? '',
            huilerieId: campagne.huilerieId ?? this.form.get('huilerieId')?.value ?? null,
        });
    }

    async delete(campagne: CampagneOlives): Promise<void> {
        const idCampagne = campagne.idCampagne;
        if (!idCampagne) {
            return;
        }

        const confirmed = await this.confirmDialogService.confirm({
            title: 'Supprimer la campagne',
            message: `Confirmez-vous la suppression de la campagne ${campagne.reference ?? ''} ?`,
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            intent: 'danger',
        });

        if (!confirmed) {
            this.toastService.info('Suppression annulee.');
            return;
        }

        this.campagneService.delete(idCampagne).subscribe({
            next: () => {
                if (this.editingId === idCampagne) {
                    this.resetForm();
                }
                this.toastService.success('Campagne supprimee.');
                this.reload();
            },
            error: (error: HttpErrorResponse) => {
                this.toastService.error(this.resolveDeleteErrorMessage(error));
            },
        });
    }

    cancelEdit(): void {
        this.resetForm();
        this.toastService.info('Mode edition annule.');
    }

    private resetForm(): void {
        this.editingId = null;
        const defaultHuilerieId = this.resolveDefaultHuilerieId();
        this.form.reset({ annee: '', dateDebut: '', dateFin: '', huilerieId: defaultHuilerieId });
    }

    private reload(): void {
        this.campagneService.getAll().subscribe({
            next: (items) => {
                this.campagnes = items;
            },
            error: () => {
                this.campagnes = [];
            },
        });
    }

    private loadHuileries(): void {
        this.huilerieService.getAll().subscribe({
            next: (items) => {
                this.huileries = (items ?? []).map((item: any) => ({
                    idHuilerie: Number(item?.idHuilerie ?? 0),
                    nom: String(item?.nom ?? '').trim(),
                })).filter((item) => item.idHuilerie > 0);

                const defaultHuilerieId = this.resolveDefaultHuilerieId();
                if (defaultHuilerieId != null && defaultHuilerieId > 0) {
                    this.form.patchValue({ huilerieId: defaultHuilerieId }, { emitEvent: false });
                }
            },
            error: () => {
                this.huileries = [];
            },
        });
    }

    private resolveDefaultHuilerieId(): number | null {
        const currentUserHuilerieId = Number(this.authService.getCurrentUserHuilerieId() ?? 0);
        if (currentUserHuilerieId > 0) {
            return currentUserHuilerieId;
        }

        if (!this.isAdmin && this.huileries.length === 1) {
            return this.huileries[0].idHuilerie;
        }

        return null;
    }

    private resolveDeleteErrorMessage(error: HttpErrorResponse): string {
        const apiError = error?.error as { errors?: unknown; message?: unknown } | undefined;
        const firstError = Array.isArray(apiError?.errors)
            ? String(apiError?.errors[0] ?? '').trim()
            : '';

        if (firstError) {
            return firstError;
        }

        const fallbackMessage = String(apiError?.message ?? '').trim();
        if (fallbackMessage && error.status === 409) {
            return fallbackMessage;
        }

        if (error.status === 409) {
            return 'Suppression impossible: cette campagne est liee a d autres donnees.';
        }

        return 'Impossible de supprimer la campagne.';
    }
}
