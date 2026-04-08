import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NbButtonModule, NbCardModule, NbIconModule, NbInputModule, NbSelectModule } from '@nebular/theme';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { HuilerieService } from '../../../machines/services/huilerie.service';

@Component({
  selector: 'app-huileries-management',
  templateUrl: './huileries-management.component.html',
  styleUrls: ['./huileries-management.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    NbIconModule,
    NbSelectModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class HuileriesManagementComponent implements OnInit {
  allHuileries: Huilerie[] = [];
  huileries: Huilerie[] = [];
  availableEntrepriseIds: number[] = [];
  huilerieErrorMessage = '';
  huilerieFilterMessage = '';
  huilerieSearchNom = '';

  editingHuilerieId: number | null = null;
  editingHuilerieStatus = true;

  readonly huilerieForm;

  constructor(
    private formBuilder: FormBuilder,
    private huilerieService: HuilerieService,
  ) {
    this.huilerieForm = this.formBuilder.group({
      nom: ['', [Validators.required]],
      localisation: ['', [Validators.required]],
      type: ['', [Validators.required]],
      certification: ['', [Validators.required]],
      capaciteProduction: [0, [Validators.required, Validators.min(1)]],
      entrepriseId: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  submitHuilerie(): void {
    this.huilerieErrorMessage = '';

    if (this.huilerieForm.invalid) {
      this.huilerieForm.markAllAsTouched();
      return;
    }

    if (this.editingHuilerieId !== null) {
      const payload = this.buildHuilerieUpdatePayload(this.editingHuilerieId);

      this.huilerieService.update(this.editingHuilerieId, payload).subscribe({
        next: () => {
          this.resetHuilerieForm();
          this.loadData();
        },
        error: (error: HttpErrorResponse) => {
          alert(this.getHttpErrorMessage(error, 'Echec de mise a jour de l\'huilerie.'));
        },
      });
    } else {
      const payload = this.buildHuilerieCreatePayload();

      const duplicatedName = this.allHuileries.some(
        (h) => h.nom.trim().toLowerCase() === payload.nom.trim().toLowerCase(),
      );
      if (duplicatedName) {
        this.huilerieErrorMessage = 'L\'huilerie avec ce nom existe deja.';
        return;
      }

      this.huilerieService.create(payload).subscribe({
        next: () => {
          this.resetHuilerieForm();
          this.loadData();
        },
        error: (error: HttpErrorResponse) => {
          const backendMessage = this.getHttpErrorMessage(error, 'Echec de creation de l\'huilerie.');
          if (backendMessage.toLowerCase().includes('existe')) {
            this.huilerieErrorMessage = 'L\'huilerie avec ce nom existe deja.';
            return;
          }
          alert(backendMessage);
        },
      });
    }
  }

  editHuilerie(item: Huilerie): void {
    this.editingHuilerieId = item.idHuilerie;
    this.editingHuilerieStatus = item.active;
    this.huilerieForm.patchValue({
      nom: item.nom,
      localisation: item.localisation,
      type: item.type,
      certification: item.certification,
      capaciteProduction: item.capaciteProduction,
      entrepriseId: item.entrepriseId,
    });
  }

  toggleHuilerieStatus(item: Huilerie): void {
    this.huilerieService.toggleStatus(item.idHuilerie, !item.active).subscribe({
      next: () => {
        this.loadData();
      },
      error: (error: HttpErrorResponse) => {
        alert(this.getHttpErrorMessage(error, 'Echec de changement du statut de l\'huilerie.'));
      },
    });
  }

  resetHuilerieForm(): void {
    this.editingHuilerieId = null;
    this.editingHuilerieStatus = true;
    this.huilerieErrorMessage = '';
    this.huilerieForm.reset({
      nom: '',
      localisation: '',
      type: '',
      certification: '',
      capaciteProduction: 0,
      entrepriseId: 1,
    });
  }

  searchHuilerieByNom(): void {
    const nom = this.cleanSearchTerm(this.huilerieSearchNom);

    this.huilerieFilterMessage = '';

    if (!nom) {
      this.loadData();
      return;
    }

    const filtered = this.allHuileries.filter((h) =>
      this.cleanSearchTerm(h.nom).includes(nom),
    );

    this.huileries = filtered;

    if (filtered.length === 0) {
      this.huilerieFilterMessage = 'Aucune huilerie trouvee pour ce nom.';
    }
  }

  resetHuilerieFilter(): void {
    this.huilerieSearchNom = '';
    this.huilerieFilterMessage = '';
    this.loadData();
  }

  trackByHuilerie(_: number, item: Huilerie): number {
    return item.idHuilerie;
  }

  isHuilerieFieldInvalid(fieldName: string): boolean {
    const control = this.huilerieForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  get isEditingInactiveHuilerie(): boolean {
    return this.editingHuilerieId !== null && !this.editingHuilerieStatus;
  }

  private loadData(): void {
    this.huilerieService.getAll().subscribe((huileries) => {
      this.allHuileries = huileries;
      this.huileries = huileries;
      this.availableEntrepriseIds = Array.from(
        new Set(
          this.allHuileries
            .map((h) => Number(h.entrepriseId))
            .filter((id) => !Number.isNaN(id) && id > 0),
        ),
      ).sort((a, b) => a - b);

      const selectedEntrepriseId = Number(this.huilerieForm.get('entrepriseId')?.value);
      if (!this.availableEntrepriseIds.includes(selectedEntrepriseId) && this.availableEntrepriseIds.length > 0) {
        this.huilerieForm.patchValue({ entrepriseId: this.availableEntrepriseIds[0] });
      }
      this.huilerieFilterMessage = '';
    });
  }

  private cleanSearchTerm(value: string): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private buildHuilerieCreatePayload(): Huilerie {
    const raw = this.huilerieForm.getRawValue();
    return {
      idHuilerie: 0,
      nom: (raw.nom ?? '').trim(),
      localisation: (raw.localisation ?? '').trim(),
      type: (raw.type ?? '').trim(),
      certification: (raw.certification ?? '').trim(),
      capaciteProduction: Number(raw.capaciteProduction),
      entrepriseId: Number(raw.entrepriseId),
      active: true,
    };
  }

  private buildHuilerieUpdatePayload(idHuilerie: number): Huilerie {
    const raw = this.huilerieForm.getRawValue();
    const current = this.allHuileries.find((h) => h.idHuilerie === idHuilerie);

    return {
      idHuilerie,
      nom: (raw.nom ?? '').trim(),
      localisation: (raw.localisation ?? '').trim(),
      type: (raw.type ?? '').trim(),
      certification: (raw.certification ?? '').trim(),
      capaciteProduction: Number(raw.capaciteProduction),
      entrepriseId: Number(raw.entrepriseId),
      active: current?.active ?? true,
    };
  }

  private getHttpErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
    if (error.status === 0) {
      return 'Connexion backend impossible. Verifiez que le backend tourne sur localhost:8000.';
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return `${fallbackMessage} ${error.error}`;
    }

    if (error.error?.message) {
      return `${fallbackMessage} ${error.error.message}`;
    }

    if (error.error?.error) {
      return `${fallbackMessage} ${error.error.error}`;
    }

    return `${fallbackMessage} Code HTTP: ${error.status}.`;
  }
}
