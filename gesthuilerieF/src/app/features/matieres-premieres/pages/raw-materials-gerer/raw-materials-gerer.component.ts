import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule } from '@nebular/theme';
import { MatierePremiere } from '../../models/raw-material.models';
import { RawMaterialService } from '../../services/raw-material.service';

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
  editingId: number | null = null;
  pendingDeletion: MatierePremiere | null = null;
  deleteErrorMessage = '';
  formErrorMessage = '';

  readonly form;

  constructor(
    private formBuilder: FormBuilder,
    private rawMaterialService: RawMaterialService,
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
      },
      error: (error: HttpErrorResponse) => {
        this.formErrorMessage = error?.error?.message ?? 'Erreur lors de la sauvegarde.';
      },
    });
  }

  edit(item: MatierePremiere): void {
    this.editingId = item.idMatierePremiere;
    this.form.patchValue({
      nom: item.nom,
      type: item.type,
      uniteMesure: item.uniteMesure,
      description: item.description,
    });
  }

  askDelete(item: MatierePremiere): void {
    this.pendingDeletion = item;
    this.deleteErrorMessage = '';
  }

  cancelDelete(): void {
    this.pendingDeletion = null;
  }

  confirmDelete(): void {
    if (!this.pendingDeletion) return;

    const itemToDelete = this.pendingDeletion;
    this.rawMaterialService.delete(itemToDelete.idMatierePremiere).subscribe({
      next: () => {
        if (this.editingId === itemToDelete.idMatierePremiere) {
          this.resetForm();
        }
        this.pendingDeletion = null;
        this.loadRawMaterials();
      },
      error: (error: HttpErrorResponse) => {
        this.deleteErrorMessage = error?.error?.message ?? 'Erreur lors de la suppression.';
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
    return item.idMatierePremiere;
  }
}
