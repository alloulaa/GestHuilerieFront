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
import { PermissionService } from '../../../../core/services/permission.service';
import { TYPE_MACHINE_OPTIONS } from '../../../../shared/constants/domain-options';
import { MACHINE_TYPE_DATA, MachineTypeInfo } from '../../../../shared/constants/machine-type-data';

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

  editingMachineId: number | null = null;

  readonly typeMachineOptions = TYPE_MACHINE_OPTIONS;
  readonly machineTypeData = MACHINE_TYPE_DATA;

  readonly machineForm;

  get selectedTypeInfo(): MachineTypeInfo | null {
    const type = this.machineForm.get('typeMachine')?.value;
    return type ? MACHINE_TYPE_DATA[type] ?? null : null;
  }

  constructor(
    private formBuilder: FormBuilder,
    private huilerieService: HuilerieService,
    private machineService: MachineService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
    private permissionService: PermissionService,
  ) {
    this.machineForm = this.formBuilder.group({
      nomMachine: ['', [Validators.required]],
      typeMachine: this.formBuilder.control<string | null>(this.typeMachineOptions[0], [Validators.required]),
      etatMachine: ['EN_SERVICE', [Validators.required]],
      capacite: [0, [Validators.required, Validators.min(1)]],
      huilerieId: [0, [Validators.required, Validators.min(1)]],
    });
  }
  ngOnInit(): void {
    this.loadData();
  }

  get canUpdate(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canUpdate('MACHINES');
  }

  get canDelete(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canDelete('MACHINES');
  }

  async submitMachine(): Promise<void> {
    this.machineFilterMessage = '';

    if (this.machineForm.invalid) {
      this.machineForm.markAllAsTouched();
      return;
    }

    const payload = this.buildMachinePayload();

    const confirmed = await this.confirmDialogService.confirm({
      title: this.editingMachineId !== null ? 'Confirmer la mise à jour' : 'Confirmer la création',
      message: this.editingMachineId !== null
        ? 'Voulez-vous enregistrer les modifications de cette machine ?'
        : 'Voulez-vous ajouter cette machine ?',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

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

  async askToggleMachineActivation(item: Machine): Promise<void> {
    const isDesactivee = String(item?.etatMachine ?? '').toUpperCase() === 'DESACTIVEE';
    const actionLabel = isDesactivee ? 'activer' : 'désactiver';
    const confirmed = await this.confirmDialogService.confirm({
      title: isDesactivee ? 'Activer machine' : 'Désactiver machine',
      message: `Voulez-vous vraiment ${actionLabel} la machine ${item.nomMachine} ?`,
      confirmText: isDesactivee ? 'Activer' : 'Désactiver',
      cancelText: 'Annuler',
      intent: isDesactivee ? 'primary' : 'danger',
    });

    if (!confirmed) {
      return;
    }

    const request$ = isDesactivee
      ? this.machineService.activate(item.idMachine)
      : this.machineService.deactivate(item.idMachine);

    request$.subscribe({
      next: () => {
        if (this.editingMachineId === item.idMachine) {
          this.resetMachineForm();
        }
        this.loadData();
        this.toastService.success(isDesactivee
          ? 'Machine activée avec succès.'
          : 'Machine désactivée avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.error(this.getHttpErrorMessage(error,
          isDesactivee ? 'Echec d\'activation de la machine.' : 'Echec de désactivation de la machine.'));
      },
    });
  }

  resetMachineForm(): void {
    this.editingMachineId = null;
    this.machineForm.reset({
      nomMachine: '',
      typeMachine: this.typeMachineOptions[0],
      etatMachine: 'EN_SERVICE',
      capacite: 0,
      huilerieId: this.allHuileries[0]?.idHuilerie ?? 0,
    });
  }

  getHuilerieName(huilerieId: number): string {
    return this.allHuileries.find((h) => h.idHuilerie === huilerieId)?.nom ?? '-';
  }

  getMachineStatusLabel(value: string): string {
    if (value === 'EN_SERVICE') return 'En service';
    if (value === 'SURVEILLANCE') return 'Surveillance';
    if (value === 'MAINTENANCE') return 'Maintenance';
    if (value === 'DESACTIVEE') return 'Désactivée';
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