import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Stock, StockMovement } from '../../models/stock.models';
import { StockManagementService } from '../../services/stock-management.service';
import { StockService } from '../../services/stock.service';
import { switchMap } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PermissionService } from '../../../../core/services/permission.service';
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
  selectableLots: LotOlives[] = [];
  huileries: Huilerie[] = [];
  editingMovementId: number | null = null;
  private availableLotIds = new Set<number>();

  constructor(
    private formBuilder: FormBuilder,
    private stockManagementService: StockManagementService,
    private lotOlivesService: LotOlivesService,
    private stockService: StockService,
    private huilerieService: HuilerieService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
    private permissionService: PermissionService,
  ) {
    this.form = this.formBuilder.group({
      typeMouvement: ['ENTREE', [Validators.required]],
      lotId: [null as number | null, [Validators.required, Validators.min(1)]],
      dateMouvement: [new Date().toISOString().slice(0, 16), [Validators.required]],
      commentaire: ['', [Validators.required]],
      huilerieId: [1, [Validators.required, Validators.min(1)]],
    });

    this.form.get('lotId')?.valueChanges.subscribe((lotId) => {
      this.applyHuilerieFromSelectedLot(Number(lotId));
    });

    this.form.get('huilerieId')?.valueChanges.subscribe(() => {
      this.enforceLotHuilerieConsistency(true, true);
    });
  }

  ngOnInit(): void {
    this.lotOlivesService.getAll().subscribe(data => {
      this.lots = data;
      this.refreshSelectableLots();
    });

    this.loadAvailableLotsFromStock();

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
    return movement.lotReference || (`LO-${movement.lotId}`);
  }

  get isEditMode(): boolean {
    return this.editingMovementId !== null;
  }

  startEdit(movement: StockMovement): void {
    this.editingMovementId = movement.id;
    this.form.patchValue({
      typeMouvement: movement.typeMouvement,
      lotId: movement.lotId,
      dateMouvement: this.toDatetimeLocal(movement.dateMouvement),
      commentaire: movement.commentaire,
      huilerieId: movement.huilerieId,
    });
    this.refreshSelectableLots();
  }

  cancelEdit(): void {
    this.editingMovementId = null;
    this.resetForm();
    this.refreshSelectableLots();
  }

  movementLabel(type: StockMovement['typeMouvement']): string {
    if (type === 'ENTREE') {
      return 'Entree';
    }
    if (type === 'TRANSFERT') {
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

    if (!this.enforceLotHuilerieConsistency(true, true)) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      huilerieId: Number(raw.huilerieId),
      lotId: Number(raw.lotId),
      dateMouvement: raw.dateMouvement ?? new Date().toISOString(),
      commentaire: raw.commentaire ?? '',
      typeMouvement: (raw.typeMouvement as StockMovement['typeMouvement']) ?? 'ENTREE',
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
        switchMap(() => this.stockManagementService.createMovement(payload)),
      );

    request$.subscribe({
      next: () => {
        this.toastService.success(
          this.isEditMode
            ? 'Mouvement de stock modifie avec succes.'
            : 'Mouvement de stock enregistre avec succes.',
        );
        this.cancelEdit();
        this.loadAvailableLotsFromStock();
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
      typeMouvement: 'ENTREE',
      lotId: null,
      dateMouvement: new Date().toISOString().slice(0, 16),
      commentaire: '',
      huilerieId: firstHuilerieId,
    });
  }

  private applyHuilerieFromSelectedLot(lotId: number): void {
    if (!Number.isFinite(lotId) || lotId <= 0) {
      return;
    }

    const selectedLot = this.lots.find((lot) => Number(lot.idLot) === lotId);
    if (selectedLot?.huilerieId != null) {
      this.form.patchValue({ huilerieId: selectedLot.huilerieId }, { emitEvent: false });
      return;
    }

    this.lotOlivesService.findById(lotId).subscribe({
      next: (resolvedLot) => {
        if (resolvedLot?.huilerieId != null) {
          this.form.patchValue({ huilerieId: resolvedLot.huilerieId }, { emitEvent: false });
        }
      },
      error: () => {
        // Keep current huilerie when lot details cannot be resolved.
      },
    });
  }

  private toDatetimeLocal(value: string): string {
    if (!value) {
      return new Date().toISOString().slice(0, 16);
    }
    return value.length >= 16 ? value.slice(0, 16) : value;
  }

  private enforceLotHuilerieConsistency(autoFix: boolean, showToast: boolean): boolean {
    const selectedLotId = Number(this.form.get('lotId')?.value ?? 0);
    if (!Number.isFinite(selectedLotId) || selectedLotId <= 0) {
      return true;
    }

    const selectedLot = this.lots.find((lot) => Number(lot?.idLot ?? 0) === selectedLotId);
    const expectedHuilerieId = Number(selectedLot?.huilerieId ?? 0);
    if (!Number.isFinite(expectedHuilerieId) || expectedHuilerieId <= 0) {
      return true;
    }

    const currentHuilerieId = Number(this.form.get('huilerieId')?.value ?? 0);
    if (currentHuilerieId === expectedHuilerieId) {
      return true;
    }

    if (autoFix) {
      this.form.patchValue({ huilerieId: expectedHuilerieId }, { emitEvent: false });
    }

    if (showToast) {
      const lotReference = String(selectedLot?.reference ?? '').trim() || `LO-${selectedLotId}`;
      const expectedHuilerieName = this.huileries.find((h) => Number(h?.idHuilerie ?? 0) === expectedHuilerieId)?.nom;
      const huilerieLabel = String(expectedHuilerieName ?? '').trim() || `#${expectedHuilerieId}`;
      this.toastService.error(`Le lot ${lotReference} appartient a l'huilerie ${huilerieLabel}.`);
    }

    return false;
  }

  canUpdateStockMovement(): boolean {
    return this.permissionService.canUpdate('STOCK_MOUVEMENT');
  }

  private loadAvailableLotsFromStock(): void {
    this.stockService.getAll().subscribe({
      next: (stocks) => {
        this.updateAvailableLotIds(stocks);
        this.refreshSelectableLots();
      },
      error: () => {
        this.availableLotIds.clear();
        this.refreshSelectableLots();
      },
    });
  }

  private updateAvailableLotIds(stocks: Stock[]): void {
    const nextIds = new Set<number>();
    (stocks ?? []).forEach((stock) => {
      const quantiteDisponible = Number(stock?.quantiteDisponible ?? 0);
      const lotId = Number(stock?.referenceId ?? 0);
      if (lotId > 0 && quantiteDisponible > 0) {
        nextIds.add(lotId);
      }
    });

    this.availableLotIds = nextIds;
  }

  private refreshSelectableLots(): void {
    const selectedLotId = Number(this.form.get('lotId')?.value ?? 0);
    const baseLots = this.lots.filter((lot) => this.availableLotIds.has(Number(lot?.idLot ?? 0)));

    if (this.isEditMode && selectedLotId > 0 && !baseLots.some((lot) => Number(lot?.idLot ?? 0) === selectedLotId)) {
      const selectedLot = this.lots.find((lot) => Number(lot?.idLot ?? 0) === selectedLotId);
      this.selectableLots = selectedLot ? [selectedLot, ...baseLots] : baseLots;
      return;
    }

    this.selectableLots = baseLots;

    if (!this.isEditMode && selectedLotId > 0 && !this.selectableLots.some((lot) => Number(lot?.idLot ?? 0) === selectedLotId)) {
      this.form.patchValue({ lotId: null }, { emitEvent: false });
    }
  }
}
