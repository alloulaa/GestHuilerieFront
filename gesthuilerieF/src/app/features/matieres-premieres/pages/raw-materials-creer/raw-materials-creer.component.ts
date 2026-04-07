import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule } from '@nebular/theme';
import { MatierePremiere } from '../../models/raw-material.models';
import { RawMaterialService } from '../../services/raw-material.service';

@Component({
  selector: 'app-raw-materials-creer',
  templateUrl: './raw-materials-creer.component.html',
  styleUrls: ['./raw-materials-creer.component.scss'],
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
export class RawMaterialsCreerComponent {
  editingId: number | null = null;

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
      }).subscribe(() => {
        this.resetForm();
      });
    } else {
      this.rawMaterialService.create({
        nom: payload.nom ?? '',
        type: payload.type ?? '',
        uniteMesure: payload.uniteMesure ?? '',
        description: payload.description ?? '',
      }).subscribe(() => {
        this.resetForm();
      });
    }
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
}
