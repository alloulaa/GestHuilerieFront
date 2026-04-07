import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule } from '@nebular/theme';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService, CreatePeseeInput } from '../../../lots/services/lot-management.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-reception-gerer',
  standalone: true,
  templateUrl: './reception-gerer.component.html',
  styleUrls: ['./reception-gerer.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, NbCardModule, NbInputModule, NbButtonModule, NbIconModule],
})
export class ReceptionGererComponent implements OnInit {
  pesees: Pesee[] = [];
  formErrorMessage = '';

  editingId: number | null = null;
  pendingDeletion: Pesee | null = null;
  successMessage = '';

  readonly form;

  constructor(
    private fb: FormBuilder,
    private lotManagementService: LotManagementService,
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
    this.loadPesees();
  }

  loadPesees(): void {
    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.weighings$.subscribe(data => {
        this.pesees = data;
      });
    });
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

    if (this.editingId) {
      this.lotManagementService.updatePesee(this.editingId, payload).subscribe({
        next: () => {
          this.resetForm();
          this.successMessage = 'Réception mise à jour avec succès.';
          this.loadPesees();
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage = error?.error?.message ?? 'Erreur lors de la mise à jour de la réception.';
        },
      });
    } else {
      this.lotManagementService.createPesee(payload).subscribe({
        next: () => {
          this.resetForm();
          this.successMessage = 'Réception créée avec succès.';
          this.loadPesees();
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage = error?.error?.message ?? 'Erreur lors de l\'ajout de la réception.';
        },
      });
    }
  }



  edit(pesee: Pesee): void {
    this.editingId = pesee.idPesee;
    this.form.patchValue({
      datePesee: pesee.datePesee.slice(0, 16),
      poidsBrut: pesee.poidsBrut,
      poidsTare: pesee.poidsTare,
      lotId: pesee.lotId,
    });
  }

  askDelete(pesee: Pesee): void {
    this.pendingDeletion = pesee;
  }

  cancelDelete(): void {
    this.pendingDeletion = null;
  }

  confirmDelete(): void {
    if (!this.pendingDeletion) return;

    const peseeToDelete = this.pendingDeletion;
    this.lotManagementService.deletePesee(peseeToDelete.idPesee).subscribe({
      next: () => {
        if (this.editingId === peseeToDelete.idPesee) {
          this.resetForm();
        }
        this.pendingDeletion = null;
        this.loadPesees();
      },
      error: (error: HttpErrorResponse) => {
        this.formErrorMessage = error?.error?.message ?? 'Erreur lors de la suppression.';
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.formErrorMessage = '';
    this.successMessage = '';
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
    return pesee.idPesee;
  }
}
