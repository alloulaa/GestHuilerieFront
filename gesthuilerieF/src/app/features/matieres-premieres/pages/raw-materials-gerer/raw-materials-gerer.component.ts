import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule } from '@nebular/theme';
import { MatierePremiere } from '../../models/raw-material.models';
import { RawMaterialService } from '../../services/raw-material.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-raw-materials-gerer',
  templateUrl: './raw-materials-gerer.component.html',
  styleUrls: ['./raw-materials-gerer.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    NbIconModule,
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class RawMaterialsGererComponent implements OnInit {
  rawMaterials: MatierePremiere[] = [];
  editingId: string | number | null = null;
  formErrorMessage = '';

  readonly form;

  constructor(
    private formBuilder: FormBuilder,
    private rawMaterialService: RawMaterialService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
  ) {
    this.form = this.formBuilder.group({
      nom: ['', [Validators.required]],
      type: ['', [Validators.required]],
      uniteMesure: ['', [Validators.required]],
      description: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadRawMaterials();
  }

  loadRawMaterials(): void {
    this.rawMaterialService.getAll().subscribe(data => {
      this.rawMaterials = data;
    });
  }

  submit(): void {
    this.formErrorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const formData = {
      nom: payload.nom ?? '',
      type: payload.type ?? '',
      uniteMesure: payload.uniteMesure ?? '',
      description: payload.description ?? '',
    };

    const request = this.editingId
      ? this.rawMaterialService.update(this.editingId, formData)
      : this.rawMaterialService.create(formData);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.loadRawMaterials();
        this.toastService.success(this.editingId ? 'Matière première mise à jour avec succès.' : 'Matière première créée avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        this.formErrorMessage = error?.error?.message ?? 'Erreur lors de la sauvegarde.';
        this.toastService.error(this.formErrorMessage);
      },
    });
  }

  edit(item: MatierePremiere): void {
    this.editingId = item.reference ?? item.idMatierePremiere ?? null;
    this.form.patchValue({
      nom: item.nom,
      type: item.type,
      uniteMesure: item.uniteMesure,
      description: item.description,
    });
  }

  async askDelete(item: MatierePremiere): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer matière première',
      message: `Êtes-vous sûr de vouloir supprimer ${item.nom} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    const identifier = item.reference ?? item.idMatierePremiere ?? 0;
    this.rawMaterialService.delete(identifier).subscribe({
      next: () => {
        if (this.editingId === identifier) {
          this.resetForm();
        }
        this.loadRawMaterials();
        this.toastService.success('Matière première supprimée avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        const message = error?.error?.message ?? 'Erreur lors de la suppression.';
        this.toastService.error(message);
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.formErrorMessage = '';
    this.form.reset({
      nom: '',
      type: '',
      uniteMesure: '',
      description: '',
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  trackByMaterial(index: number, item: MatierePremiere): number {
    return Number(item.idMatierePremiere ?? 0);
  }
}
