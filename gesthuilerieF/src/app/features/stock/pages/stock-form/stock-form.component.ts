import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { StockMovement } from '../../models/stock.models';
import { StockManagementService } from '../../services/stock-management.service';
import { EMPTY, switchMap } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { LotOlives } from '../../../lots/models/lot.models';
import { LotOlivesService } from '../../../lots/services/lot-olives.service';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { Huilerie } from '../../../machines/models/enterprise.models';

@Component({
  selector: 'app-stock-form',
  standalone: true,
  templateUrl: './stock-form.component.html',
  styleUrls: ['./stock-form.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class StockFormComponent {
  readonly form;
  errorMessage = '';
  movements: StockMovement[] = [];
  lots: LotOlives[] = [];
  huileries: Huilerie[] = [];
  editingMovementId: number | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private stockManagementService: StockManagementService,
    private lotOlivesService: LotOlivesService,
    private huilerieService: HuilerieService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
  ) {
    this.form = this.formBuilder.group({
      typeMouvement: ['ARRIVAL', [Validators.required]],
      referenceId: [null as number | null, [Validators.required, Validators.min(1)]],
      quantite: [0, [Validators.required, Validators.min(1)]],
      dateMouvement: [new Date().toISOString().slice(0, 16), [Validators.required]],
      commentaire: ['', [Validators.required]],
      huilerieId: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.lotOlivesService.getAll().subscribe(data => {
      this.lots = data;
    });

    this.huilerieService.getAll().subscribe(data => {
      this.huileries = data;
      const current = Number(this.form.get('huilerieId')?.value);
      if (!this.huileries.some(h => h.idHuilerie === current) && this.huileries.length > 0) {
        this.form.patchValue({ huilerieId: this.huileries[0].idHuilerie });
      }
    });

    this.stockManagementService.loadInitialData().subscribe(() => {
      this.stockManagementService.movements$.subscribe(data => {
        this.movements = data;
      });
    });
  }

  movementReference(movement: StockMovement): string {
    return movement.reference || (`MS-${movement.id}`);
  }

  lotReference(movement: StockMovement): string {
    return movement.lotReference || (`LO-${movement.referenceId}`);
  }

  get isEditMode(): boolean {
    return this.editingMovementId !== null;
  }

  startEdit(movement: StockMovement): void {
    this.editingMovementId = movement.id;
    this.form.patchValue({
      typeMouvement: movement.typeMouvement,
      referenceId: movement.referenceId,
      quantite: movement.quantite,
      dateMouvement: this.toDatetimeLocal(movement.dateMouvement),
      commentaire: movement.commentaire,
      huilerieId: movement.huilerieId,
    });
  }

  cancelEdit(): void {
    this.editingMovementId = null;
    this.resetForm();
  }

  movementLabel(type: StockMovement['typeMouvement']): string {
    if (type === 'ARRIVAL') {
      return 'Entree';
    }
    if (type === 'DEPARTURE') {
      return 'Sortie';
    }
    if (type === 'TRANSFER') {
      return 'Transfert';
    }
    return 'Ajustement';
  }

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Veuillez corriger les champs invalides avant de continuer.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      huilerieId: Number(raw.huilerieId),
      referenceId: Number(raw.referenceId),
      quantite: Number(raw.quantite),
      dateMouvement: raw.dateMouvement ?? new Date().toISOString(),
      commentaire: raw.commentaire ?? '',
      typeMouvement: (raw.typeMouvement as StockMovement['typeMouvement']) ?? 'ARRIVAL',
    };

    const confirmed = await this.confirmDialogService.confirm({
      title: this.isEditMode ? 'Confirmer la modification' : 'Confirmer l\'enregistrement',
      message: this.isEditMode
        ? 'Voulez-vous modifier ce mouvement de stock ?'
        : 'Voulez-vous enregistrer ce mouvement de stock ?',
      confirmText: this.isEditMode ? 'Modifier' : 'Enregistrer',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

    const request$ = this.isEditMode
      ? this.stockManagementService.updateMovementType(this.editingMovementId!, payload)
      : this.stockManagementService.loadInitialData().pipe(
          switchMap(() => {
            if (payload.typeMouvement === 'DEPARTURE') {
              const quantiteDisponible = this.stockManagementService.getAvailableQuantity(
                payload.huilerieId,
                payload.referenceId,
              );

              if (payload.quantite > quantiteDisponible) {
                this.errorMessage = 'La quantite en stock est insuffisante.';
                this.toastService.error(this.errorMessage);
                return EMPTY;
              }
            }

            return this.stockManagementService.createMovement(payload);
          }),
        );

    request$.subscribe({
      next: () => {
        this.toastService.success(
          this.isEditMode
            ? 'Mouvement de stock modifie avec succes.'
            : 'Mouvement de stock enregistre avec succes.',
        );
        this.cancelEdit();
      },
      error: errorResponse => {
        this.errorMessage =
          errorResponse?.error?.message ??
          errorResponse?.message ??
          'Impossible de creer le mouvement.';
        this.toastService.error(this.errorMessage);
      },
    });
  }

  private resetForm(): void {
    const firstHuilerieId = this.huileries[0]?.idHuilerie ?? 1;
    this.form.patchValue({
      typeMouvement: 'ARRIVAL',
      referenceId: null,
      quantite: 0,
      dateMouvement: new Date().toISOString().slice(0, 16),
      commentaire: '',
      huilerieId: firstHuilerieId,
    });
  }

  private toDatetimeLocal(value: string): string {
    if (!value) {
      return new Date().toISOString().slice(0, 16);
    }
    return value.length >= 16 ? value.slice(0, 16) : value;
  }
}
