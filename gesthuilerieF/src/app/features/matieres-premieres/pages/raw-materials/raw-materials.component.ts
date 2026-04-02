import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule } from '@nebular/theme';
import { MatierePremiere } from '../../models/raw-material.models';
import { RawMaterialService } from '../../services/raw-material.service';

@Component({
  selector: 'app-raw-materials',
  templateUrl: './raw-materials.component.html',
  styleUrls: ['./raw-materials.component.scss'],
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
export class RawMaterialsComponent implements OnInit {
  rawMaterials: MatierePremiere[] = [];
  editingId: number | null = null;
  pendingRawMaterialDeletion: MatierePremiere | null = null;
  deleteErrorMessage = '';

  readonly rawMaterialForm;

  constructor(
    private formBuilder: FormBuilder,
    private rawMaterialService: RawMaterialService,
  ) {
    this.rawMaterialForm = this.formBuilder.group({
      nom: ['', [Validators.required]],
      type: ['', [Validators.required]],
      uniteMesure: ['', [Validators.required]],
      description: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.rawMaterialService.getAll().subscribe(data => {
      this.rawMaterials = data;
    });
  }

  submit(): void {
    if (this.rawMaterialForm.invalid) {
      this.rawMaterialForm.markAllAsTouched();
      return;
    }

    const payload = this.rawMaterialForm.getRawValue();
    if (this.editingId !== null) {
      this.rawMaterialService.update(this.editingId, {
        nom: payload.nom ?? '',
        type: payload.type ?? '',
        uniteMesure: payload.uniteMesure ?? '',
        description: payload.description ?? '',
      }).subscribe(updated => {
        this.rawMaterials = this.rawMaterials.map(item =>
          item.idMatierePremiere === updated.idMatierePremiere ? updated : item,
        );
      });
    } else {
      this.rawMaterialService.create({
        nom: payload.nom ?? '',
        type: payload.type ?? '',
        uniteMesure: payload.uniteMesure ?? '',
        description: payload.description ?? '',
      }).subscribe(created => {
        this.rawMaterials = [...this.rawMaterials, created];
      });
    }

    this.resetForm();
  }

  edit(item: MatierePremiere): void {
    this.editingId = item.idMatierePremiere;
    this.rawMaterialForm.patchValue({
      nom: item.nom,
      type: item.type,
      uniteMesure: item.uniteMesure,
      description: item.description,
    });
  }

  askRemove(item: MatierePremiere): void {
    this.pendingRawMaterialDeletion = item;
    this.deleteErrorMessage = '';
  }

  cancelRemove(): void {
    this.pendingRawMaterialDeletion = null;
    this.deleteErrorMessage = '';
  }

  confirmRemove(): void {
    if (!this.pendingRawMaterialDeletion) {
      return;
    }

    const rawMaterialToDelete = this.pendingRawMaterialDeletion;
    this.deleteErrorMessage = '';

    this.rawMaterialService.delete(rawMaterialToDelete.idMatierePremiere).subscribe({
      next: () => {
        this.rawMaterials = this.rawMaterials.filter(current => current.idMatierePremiere !== rawMaterialToDelete.idMatierePremiere);
        if (this.editingId === rawMaterialToDelete.idMatierePremiere) {
          this.resetForm();
        }
        this.pendingRawMaterialDeletion = null;
      },
      error: (error: HttpErrorResponse) => {
        this.deleteErrorMessage = this.getDeleteErrorMessage(error);
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.rawMaterialForm.reset({
      nom: '',
      type: '',
      uniteMesure: 'kg',
      description: '',
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.rawMaterialForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  private getDeleteErrorMessage(error: HttpErrorResponse): string {
    const serverMessage = this.extractServerMessage(error);
    const normalizedMessage = serverMessage.toLowerCase();

    if (
      error.status === 409
      || normalizedMessage.includes('constraint')
      || normalizedMessage.includes('foreign key')
      || normalizedMessage.includes('utilis')
      || normalizedMessage.includes('stock')
      || normalizedMessage.includes('mouvement')
      || normalizedMessage.includes('reference')
    ) {
      return 'Cette matiere premiere est utilisee dans le systeme et ne peut pas etre supprimee.';
    }

    if (error.status === 0) {
      return 'Connexion backend impossible. Verifiez que le backend est demarre.';
    }

    return serverMessage || 'Suppression impossible pour le moment. Veuillez reessayer.';
  }

  private extractServerMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error.trim();
    }

    if (error.error?.message) {
      return String(error.error.message).trim();
    }

    if (error.error?.error) {
      return String(error.error.error).trim();
    }

    return '';
  }

}

