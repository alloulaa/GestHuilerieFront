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
import { MACHINE_CATEGORY_OPTIONS, MACHINE_SUBTYPE_OPTIONS } from '../../../../shared/constants/machine-category-options';
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

  readonly machineCategoryOptions = MACHINE_CATEGORY_OPTIONS;
  readonly machineSubtypeOptions = MACHINE_SUBTYPE_OPTIONS;
  readonly machineTypeData = MACHINE_TYPE_DATA;

  readonly machineForm;

  get selectedTypeInfo(): MachineTypeInfo | null {
    const type = this.machineForm.get('typeMachine')?.value;
    return type ? MACHINE_TYPE_DATA[type] ?? null : null;
  }

  get currentTypeMachineOptions(): string[] {
    const category = String(this.machineForm.get('categorieMachine')?.value ?? '').trim().toLowerCase();
    return this.machineSubtypeOptions[category] ?? [];
  }

  get requiresCustomTypeMachine(): boolean {
    return String(this.machineForm.get('categorieMachine')?.value ?? '').trim().toLowerCase() === 'autre';
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
      categorieMachine: this.formBuilder.control<string | null>(this.machineCategoryOptions[0], [Validators.required]),
      typeMachine: this.formBuilder.control<string | null>((this.machineSubtypeOptions[this.machineCategoryOptions[0]] ?? [])[0] ?? null),
      typeMachineCustom: [''],
      etatMachine: ['EN_SERVICE', [Validators.required]],
      capacite: [0, [Validators.required, Validators.min(1)]],
      huilerieId: [0, [Validators.required, Validators.min(1)]],
    });

    this.machineForm.get('categorieMachine')?.valueChanges.subscribe((rawCategory) => {
      const category = String(rawCategory ?? '').trim().toLowerCase();
      const typeMachineControl = this.machineForm.get('typeMachine');
      const customTypeMachineControl = this.machineForm.get('typeMachineCustom');

      if (!typeMachineControl || !customTypeMachineControl) {
        return;
      }

      if (category === 'autre') {
        typeMachineControl.clearValidators();
        typeMachineControl.setValue(null);
        customTypeMachineControl.setValidators([Validators.required]);
        customTypeMachineControl.updateValueAndValidity({ emitEvent: false });
        typeMachineControl.updateValueAndValidity({ emitEvent: false });
        return;
      }

      const options = this.machineSubtypeOptions[category] ?? [];
      typeMachineControl.setValidators([Validators.required]);
      typeMachineControl.setValue(options[0] ?? null);
      customTypeMachineControl.clearValidators();
      customTypeMachineControl.setValue('');
      customTypeMachineControl.updateValueAndValidity({ emitEvent: false });
      typeMachineControl.updateValueAndValidity({ emitEvent: false });
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
      categorieMachine: item.categorieMachine ?? this.machineCategoryOptions[0],
      typeMachine: item.typeMachine,
      typeMachineCustom: '',
      etatMachine: item.etatMachine,
      capacite: item.capacite,
      huilerieId: item.huilerieId,
    });

    const category = String(item.categorieMachine ?? '').trim().toLowerCase();
    if (category === 'autre') {
      this.machineForm.patchValue({
        typeMachine: null,
        typeMachineCustom: item.typeMachine ?? '',
      });
    }
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
      categorieMachine: this.machineCategoryOptions[0],
      typeMachine: (this.machineSubtypeOptions[this.machineCategoryOptions[0]] ?? [])[0] ?? null,
      typeMachineCustom: '',
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
      categorieMachine: (raw.categorieMachine ?? '').trim(),
      typeMachine: this.requiresCustomTypeMachine
        ? (raw.typeMachineCustom ?? '').trim()
        : (raw.typeMachine ?? '').trim(),
      etatMachine: raw.etatMachine ?? 'EN_SERVICE',
      capacite: Number(raw.capacite),
      huilerieId: Number(raw.huilerieId),
    };
  }

  private getHttpErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
    if (error.status === 0) {
      return 'Connexion backend impossible. Verifiez que le backend tourne sur localhost:8000.';
    }

    const validationDetails = this.extractBackendErrors(error);
    if (validationDetails) {
      return `${fallbackMessage} ${validationDetails}`;
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

  private extractBackendErrors(error: HttpErrorResponse): string {
    const details = error.error?.details;
    if (Array.isArray(details) && details.length > 0) {
      return details.join(' | ');
    }

    if (Array.isArray(error.error?.errors) && error.error.errors.length > 0) {
      return error.error.errors.join(' | ');
    }

    return '';
  }
}