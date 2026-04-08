import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule, NbSelectModule } from '@nebular/theme';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService, CreatePeseeInput } from '../../../lots/services/lot-management.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../../core/services/toast.service';
import { LotOlives } from '../../../lots/models/lot.models';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-reception-gerer',
  standalone: true,
  templateUrl: './reception-gerer.component.html',
  styleUrls: ['./reception-gerer.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, NbCardModule, NbInputModule, NbButtonModule, NbIconModule, NbSelectModule],
})
export class ReceptionGererComponent implements OnInit {
  pesees: Pesee[] = [];
  lots: LotOlives[] = [];
  huileries: Huilerie[] = [];
  formErrorMessage = '';
  lastCreatedReference = '';

  editingId: number | null = null;
  isEditMode = false;
  successMessage = '';

  readonly form;

  constructor(
    private fb: FormBuilder,
    private lotManagementService: LotManagementService,
    private toastService: ToastService,
    private huilerieService: HuilerieService,
    private confirmDialogService: ConfirmDialogService,
  ) {
    this.form = this.fb.group({
      datePesee: [new Date().toISOString().slice(0, 16), [Validators.required]],
      poidsBrut: [0, [Validators.required, Validators.min(0)]],
      poidsTare: [0, [Validators.required, Validators.min(0)]],
      lotId: [0, [Validators.required, Validators.min(1)]],
      huilerieId: [1, [Validators.required, Validators.min(1)]],
    });

    this.form.get('poidsBrut')?.valueChanges.subscribe(() => this.updatePoidsNet());
    this.form.get('poidsTare')?.valueChanges.subscribe(() => this.updatePoidsNet());
  }

  ngOnInit(): void {
    this.huilerieService.getAll().subscribe((data) => {
      this.huileries = data;
      const selectedHuilerieId = Number(this.form.get('huilerieId')?.value);
      const selectedExists = this.huileries.some((h) => h.idHuilerie === selectedHuilerieId);
      if (!selectedExists && this.huileries.length > 0) {
        this.form.patchValue({ huilerieId: this.huileries[0].idHuilerie });
      }
    });

    this.lotManagementService.lots$.subscribe((data) => {
      this.lots = data;
      const selectedLotId = Number(this.form.get('lotId')?.value);
      const selectedExists = this.lots.some((lot) => lot.idLot === selectedLotId);
      if (!selectedExists && this.lots.length > 0) {
        this.form.patchValue({ lotId: this.lots[0].idLot });
      }
    });

    this.lotManagementService.weighings$.subscribe(data => {
      this.pesees = data;
    });
    this.loadPesees();
  }

  loadPesees(): void {
    this.lotManagementService.loadInitialData().subscribe();
  }

  submit(): void {
    this.formErrorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreatePeseeInput = {
      datePesee: raw.datePesee ?? new Date().toISOString(),
      poidsBrut: Number(raw.poidsBrut) || 0,
      poidsTare: Number(raw.poidsTare) || 0,
      huilerieId: Number(raw.huilerieId) || 1,
      lotMode: 'existing',
      existingLotId: Number(raw.lotId) || undefined,
      origine: '',
      varieteOlive: '',
    };

    if (this.isEditMode) {
      if (this.editingId === null) {
        this.formErrorMessage = 'Mise a jour impossible: identifiant de reception manquant.';
        return;
      }

      this.lotManagementService.updatePesee(this.editingId, payload).subscribe({
        next: () => {
          this.resetForm();
          this.toastService.success('Réception mise à jour avec succès.');
          this.loadPesees();
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage = error?.error?.message ?? 'Erreur lors de la mise à jour de la réception.';
          this.toastService.error(this.formErrorMessage);
        },
      });
    } else {
      this.lotManagementService.createPesee(payload).subscribe({
        next: (created) => {
          this.lastCreatedReference = created.reference ?? '';
          this.resetForm();
          this.toastService.show(
            'success',
            `Réception ${created.reference ?? '#' + created.idPesee} créée avec succès.`,
            5000,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage = error?.error?.message ?? 'Erreur lors de l\'ajout de la réception.';
          this.toastService.error(this.formErrorMessage);
        },
      });
    }
  }



  edit(pesee: Pesee): void {
    this.editingId = pesee.idPesee ?? null;
    this.isEditMode = true;
    this.formErrorMessage = '';
    this.successMessage = '';
    this.lastCreatedReference = '';

    if (this.editingId === null) {
      this.formErrorMessage = 'Edition impossible: identifiant de reception introuvable.';
      this.isEditMode = false;
      return;
    }

    this.form.patchValue({
      datePesee: pesee.datePesee.slice(0, 16),
      poidsBrut: pesee.poidsBrut,
      poidsTare: pesee.poidsTare,
      lotId: pesee.lotId,
      huilerieId: pesee.huilerieId ?? Number(this.form.get('huilerieId')?.value ?? 1),
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  async askDelete(pesee: Pesee): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer réception',
      message: `Êtes-vous sûr de vouloir supprimer la réception du ${new Date(pesee.datePesee).toLocaleString()} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    const peseeToDelete = pesee;
    if (peseeToDelete.idPesee == null) {
      this.formErrorMessage = 'Suppression impossible: identifiant de reception manquant.';
      this.toastService.error(this.formErrorMessage);
      return;
    }

    this.lotManagementService.deletePesee(peseeToDelete.idPesee).subscribe({
      next: () => {
        if (this.editingId === peseeToDelete.idPesee) {
          this.resetForm();
        }
        this.toastService.success('Réception supprimée avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        this.formErrorMessage = error?.error?.message ?? 'Erreur lors de la suppression.';
        this.toastService.error(this.formErrorMessage);
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.isEditMode = false;
    this.formErrorMessage = '';
    this.form.reset({
      datePesee: new Date().toISOString().slice(0, 16),
      poidsBrut: 0,
      poidsTare: 0,
      lotId: 0,
      huilerieId: 1,
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  private updatePoidsNet(): void {
    const brut = Number(this.form.get('poidsBrut')?.value ?? 0);
    const tare = Number(this.form.get('poidsTare')?.value ?? 0);
    const net = Math.max(0, brut - tare);
    return;
  }

  trackByPesee(index: number, pesee: Pesee): number {
    return pesee.idPesee ?? index;
  }
}
