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
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

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
  machines: Machine[] = [];
  machineFilterMessage = '';
  machineSearchHuilerieNom = '';

  editingMachineId: number | null = null;

  readonly machineForm;

  constructor(
    private formBuilder: FormBuilder,
    private huilerieService: HuilerieService,
    private machineService: MachineService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
  ) {
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
          this.toastService.success('Machine mise à jour avec succès.');
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error(this.getHttpErrorMessage(error, 'Echec de mise a jour de la machine.'));
        },
      });
    } else {
      this.machineService.create(payload).subscribe({
        next: () => {
          this.resetMachineForm();
          this.loadData();
          this.toastService.success('Machine créée avec succès.');
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error(this.getHttpErrorMessage(error, 'Echec de creation de la machine.'));
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

  async askDeleteMachine(item: Machine): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer machine',
      message: `Voulez-vous vraiment supprimer la machine ${item.nomMachine} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.machineService.delete(item.idMachine).subscribe({
      next: () => {
        if (this.editingMachineId === item.idMachine) {
          this.resetMachineForm();
        }
        this.loadData();
        this.toastService.success('Machine supprimée avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.error(this.getHttpErrorMessage(error, 'Echec de suppression de la machine.'));
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

  trackByMachine(_: number, item: Machine): number {
    return item.idMachine;
  }

  isMachineFieldInvalid(fieldName: string): boolean {
    const control = this.machineForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  private loadData(): void {
    forkJoin({
      huileries: this.huilerieService.getAll().pipe(catchError(() => of([] as Huilerie[]))),
      machines: this.machineService.getAll().pipe(catchError(() => of([] as Machine[]))),
    }).subscribe(({ huileries, machines }) => {
      this.allHuileries = huileries;
      this.allMachines = machines;
      this.machines = machines;
      this.machineFilterMessage = '';
      const firstHuilerieId = this.allHuileries[0]?.idHuilerie;
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