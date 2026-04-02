import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule, NbSelectModule } from '@nebular/theme';
import { Huilerie, Machine } from '../../models/enterprise.models';
import { HuilerieService } from '../../services/huilerie.service';
import { MachineService } from '../../services/machine.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-oil-mills-management',
  templateUrl: './oil-mills-management.component.html',
  styleUrls: ['./oil-mills-management.component.scss'],
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
export class OilMillsManagementComponent implements OnInit {
  allHuileries: Huilerie[] = [];
  allMachines: Machine[] = [];
  huileries: Huilerie[] = [];
  machines: Machine[] = [];
  huilerieErrorMessage = '';
  huilerieFilterMessage = '';
  machineFilterMessage = '';
  huilerieSearchNom = '';
  machineSearchHuilerieNom = '';

  editingHuilerieId: number | null = null;
  editingHuilerieStatus: boolean = true;
  editingMachineId: number | null = null;
  pendingMachineDeletion: Machine | null = null;

  readonly huilerieForm;
  readonly machineForm;

  constructor(
    private formBuilder: FormBuilder,
    private huilerieService: HuilerieService,
    private machineService: MachineService,
  ) {
    this.huilerieForm = this.formBuilder.group({
      nom: ['', [Validators.required]],
      localisation: ['', [Validators.required]],
      type: ['', [Validators.required]],
      certification: ['', [Validators.required]],
      capaciteProduction: [0, [Validators.required, Validators.min(1)]],
      entrepriseId: [1, [Validators.required, Validators.min(1)]],
    });

    this.machineForm = this.formBuilder.group({
      nomMachine: ['', [Validators.required]],
      typeMachine: ['', [Validators.required]],
      etatMachine: ['EN_SERVICE', [Validators.required]],
      capacite: [0, [Validators.required, Validators.min(1)]],
      huilerieId: [0, [Validators.required, Validators.min(1)]],
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

  submitMachine(): void {
    this.machineFilterMessage = '';

    if (this.machineForm.invalid) {
      this.machineForm.markAllAsTouched();
      return;
    }

    const payload = this.buildMachinePayload();

    if (this.editingMachineId !== null) {
      this.machineService.update(this.editingMachineId, payload).subscribe({
        next: () => {
          this.resetMachineForm();
          this.loadData();
        },
        error: (error: HttpErrorResponse) => {
          alert(this.getHttpErrorMessage(error, 'Echec de mise a jour de la machine.'));
        },
      });
    } else {
      this.machineService.create(payload).subscribe({
        next: () => {
          this.resetMachineForm();
          this.loadData();
        },
        error: (error: HttpErrorResponse) => {
          alert(this.getHttpErrorMessage(error, 'Echec de creation de la machine.'));
        },
      });
    }
  }

  editMachine(item: Machine): void {
    this.editingMachineId = item.idMachine;
    this.machineForm.patchValue({
      nomMachine: item.nomMachine,
      typeMachine: item.typeMachine,
      etatMachine: item.etatMachine,
      capacite: item.capacite,
      huilerieId: item.huilerieId,
    });
  }

  askDeleteMachine(item: Machine): void {
    this.pendingMachineDeletion = item;
  }

  cancelMachineDeletion(): void {
    this.pendingMachineDeletion = null;
  }

  confirmMachineDeletion(): void {
    if (!this.pendingMachineDeletion) {
      return;
    }

    const machineToDelete = this.pendingMachineDeletion;

    this.machineService.delete(machineToDelete.idMachine).subscribe({
      next: () => {
        if (this.editingMachineId === machineToDelete.idMachine) {
          this.resetMachineForm();
        }
        this.pendingMachineDeletion = null;
        this.loadData();
      },
      error: (error: HttpErrorResponse) => {
        this.pendingMachineDeletion = null;
        alert(this.getHttpErrorMessage(error, 'Echec de suppression de la machine.'));
      },
    });
  }

  resetMachineForm(): void {
    this.editingMachineId = null;
    this.machineForm.reset({
      nomMachine: '',
      typeMachine: '',
      etatMachine: 'EN_SERVICE',
      capacite: 0,
      huilerieId: this.allHuileries[0]?.idHuilerie ?? 0,
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

  searchMachinesByHuilerie(): void {
    const huilerieNom = this.cleanSearchTerm(this.machineSearchHuilerieNom);

    this.machineFilterMessage = '';

    if (!huilerieNom) {
      this.loadData();
      return;
    }

    const matchingHuilerieIds = this.allHuileries
      .filter((h) => this.cleanSearchTerm(h.nom).includes(huilerieNom))
      .map((h) => h.idHuilerie);

    const filtered = this.allMachines.filter((machine) =>
      matchingHuilerieIds.includes(machine.huilerieId),
    );

    this.machines = filtered;

    if (filtered.length === 0) {
      this.machineFilterMessage = 'Aucune machine trouvee pour cette huilerie.';
    }
  }

  resetMachineFilter(): void {
    this.machineSearchHuilerieNom = '';
    this.machineFilterMessage = '';
    this.loadData();
  }

  getHuilerieName(huilerieId: number): string {
    return this.allHuileries.find((h) => h.idHuilerie === huilerieId)?.nom ?? '-';
  }

  getMachineStatusLabel(value: string): string {
    if (value === 'EN_SERVICE') return 'En service';
    if (value === 'SURVEILLANCE') return 'Surveillance';
    if (value === 'MAINTENANCE') return 'Maintenance';
    return value;
  }

  trackByHuilerie(_: number, item: Huilerie): number {
    return item.idHuilerie;
  }

  trackByMachine(_: number, item: Machine): number {
    return item.idMachine;
  }

  isHuilerieFieldInvalid(fieldName: string): boolean {
    const control = this.huilerieForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  isMachineFieldInvalid(fieldName: string): boolean {
    const control = this.machineForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  get isEditingInactiveHuilerie(): boolean {
    return this.editingHuilerieId !== null && !this.editingHuilerieStatus;
  }

  private loadData(): void {
    forkJoin({
      huileries: this.huilerieService.getAll().pipe(catchError(() => of([] as Huilerie[]))),
      machines: this.machineService.getAll().pipe(catchError(() => of([] as Machine[]))),
    }).subscribe(({ huileries, machines }) => {
      this.allHuileries = huileries;
      this.allMachines = machines;
      this.huileries = huileries;
      this.machines = machines;
      this.huilerieFilterMessage = '';
      this.machineFilterMessage = '';
      const firstHuilerieId = this.huileries[0]?.idHuilerie;
      if (firstHuilerieId && !this.editingMachineId && Number(this.machineForm.value.huilerieId) <= 0) {
        this.machineForm.patchValue({ huilerieId: firstHuilerieId });
      }
    });
  }

  private cleanSearchTerm(value: string): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizeSearchTerm(value: string): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[ - ]/g, '');
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

  private buildMachinePayload(): Omit<Machine, 'idMachine'> {
    const raw = this.machineForm.getRawValue();
    return {
      nomMachine: (raw.nomMachine ?? '').trim(),
      typeMachine: (raw.typeMachine ?? '').trim(),
      etatMachine: raw.etatMachine ?? 'EN_SERVICE',
      capacite: Number(raw.capacite),
      huilerieId: Number(raw.huilerieId),
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