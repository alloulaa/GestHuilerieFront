// ...existing code...

// ...existing code...
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule, NbSelectModule } from '@nebular/theme';
import { HttpErrorResponse } from '@angular/common/http';
import { Machine } from '../../../machines/models/enterprise.models';
import { MachineService } from '../../../machines/services/machine.service';
import { LotOlives } from '../../../lots/models/lot.models';
import { LotOlivesService } from '../../../lots/services/lot-olives.service';
import { MatierePremiere } from '../../../matieres-premieres/models/raw-material.models';
import { RawMaterialService } from '../../../matieres-premieres/services/raw-material.service';
import { ExecutionProduction, ExecutionProductionCreate, GuideProduction, Prediction } from '../../models/production.models';
import { ExecutionProductionService } from '../../services/execution-production.service';
import { GuideProductionService } from '../../services/guide-production.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { TYPE_MACHINE_OPTIONS } from '../../../../shared/constants/domain-options';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-guides-executer',
  standalone: true,
  templateUrl: './guides-executer.component.html',
  styleUrls: ['./production-guides.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, NbCardModule, NbButtonModule, NbInputModule, NbSelectModule],
})
export class GuidesExecuterComponent implements OnInit {
  private readonly executionCacheKey = 'execution-productions-cache';
  private readonly executionRealValuesCache = new Map<number, Array<{ parametreEtapeId: number; valeurReelle: string }>>();

  guides: GuideProduction[] = [];
  machines: Machine[] = [];
  lots: LotOlives[] = [];
  filteredMachines: Machine[] = [];
  filteredLots: LotOlives[] = [];
  matieresPremieres: MatierePremiere[] = [];
  executions: ExecutionProduction[] = [];

  executionMessage = '';
  executionError = '';
  submittingExecution = false;
  selectedExecution: ExecutionProduction | null = null;

  readonly typeMachineOptions = TYPE_MACHINE_OPTIONS;

  readonly executionForm;

  executionValueRows: Array<{
    parametreEtapeId: number;
    stepName: string;
    parameterName: string;
    uniteMesure: string;
    estimatedValue: string;
  }> = [];

  constructor(
    private fb: FormBuilder,
    @Inject(forwardRef(() => GuideProductionService))
    private guideProductionService: GuideProductionService,
    @Inject(forwardRef(() => ExecutionProductionService))
    private executionProductionService: ExecutionProductionService,
    @Inject(forwardRef(() => MachineService))
    private machineService: MachineService,
    @Inject(forwardRef(() => LotOlivesService))
    private lotOlivesService: LotOlivesService,
    @Inject(forwardRef(() => RawMaterialService))
    private rawMaterialService: RawMaterialService,
    private authService: AuthService,
    private confirmDialogService: ConfirmDialogService,
    private toastService: ToastService,
  ) {
    this.executionForm = this.fb.group({
      dateDebut: [this.today(), [Validators.required]],
      dateFinPrevue: [this.tomorrow(), [Validators.required]],
      dateFinReelle: this.fb.control<string | null>(null),
      statut: ['EN_COURS', [Validators.required]],
      rendement: [0, [Validators.required, Validators.min(0)]],
      observations: [''],
      controleTemperature: [false, [Validators.required]],
      guideProductionId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      typeMachine: this.fb.control<string | null>(null),
      machineId: this.fb.control<number | null>(null),
      lotId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      valeursReelles: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.restoreCachedExecutions();
    this.loadReferenceData();
    this.loadExecutions();
  }

  get valeursReelles(): FormArray {
    return this.executionForm.get('valeursReelles') as FormArray;
  }

  get selectedGuideParameterCount(): number {
    return this.executionValueRows.length;
  }

  get selectedGuideHuilerieLabel(): string {
    const guideId = Number(this.executionForm.get('guideProductionId')?.value ?? 0);
    if (!guideId) {
      return '-';
    }

    const guide = this.guides.find((item) => item.idGuideProduction === guideId);
    if (!guide) {
      return '-';
    }

    const huilerieNom = String(guide.huilerieNom ?? '').trim();
    if (huilerieNom) {
      return huilerieNom;
    }

    return guide.huilerieId ? `#${guide.huilerieId}` : '-';
  }

  get selectedLotMatierePremiereNom(): string {
    const lotId = Number(this.executionForm.get('lotId')?.value ?? 0);
    if (!lotId) {
      return '-';
    }

    const lot = this.lots.find((item) => item.idLot === lotId);
    if (!lot?.matierePremiereId) {
      return '-';
    }

    const matiere = this.matieresPremieres.find((item) => Number(item.idMatierePremiere ?? item.id ?? 0) === Number(lot.matierePremiereId));
    return String(matiere?.reference ?? '').trim() || String(matiere?.nom ?? '').trim() || `#${lot.matierePremiereId}`;
  }

  get executionCount(): number {
    return this.executions.length;
  }

  executionDisplayLabel(execution: ExecutionProduction): string {
    const lot = this.lots.find((item) => item.idLot === execution.lotId);
    const lotLabel = lot?.reference || execution.reference || `LOT-${execution.lotId}`;
    return `${lotLabel} · ${execution.guideProductionReference ?? `GP-${execution.guideProductionId}`}`;
  }

  getExecutionStatusLabel(execution: ExecutionProduction): string {
    return String(execution.statut ?? '').trim() || '-';
  }

  formatExecutionDate(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return '-';
    }

    return String(dateValue).split('T')[0] || '-';
  }

  isExecutionTerminated(execution: ExecutionProduction): boolean {
    return String(execution.statut ?? '').trim().toUpperCase() === 'TERMINEE';
  }

  hasRecordedRealValues(execution: ExecutionProduction): boolean {
    return (execution.valeursReelles ?? []).length > 0 && (execution.valeursReelles ?? []).some((v) => String(v?.valeurReelle ?? '').trim().length > 0);
  }

  getParameterLabel(parameterName: string | undefined): string {
    return String(parameterName ?? '').trim() || '-';
  }

  lotDisplayLabel(lot: LotOlives): string {
    const lotWithReference = lot as LotOlives & { reference?: string };
    return `${lotWithReference.reference ?? `LOT-${lot.idLot}`} - ${lot.varieteOlive}`;
  }

  onGuideSelectionChange(guideId: number | string | null): void {
    const numericGuideId = guideId === null ? null : Number(guideId);

    if (numericGuideId === null) {
      this.executionForm.patchValue({ guideProductionId: null });
      this.executionValueRows = [];
      this.valeursReelles.clear();
      this.filteredMachines = [];
      this.executionForm.patchValue({ machineId: null });
      this.refreshFilteredDataForSelectedGuide();
      return;
    }

    this.executionForm.patchValue({
      guideProductionId: numericGuideId,
      machineId: null,
    });
    this.filteredMachines = [];
    this.refreshFilteredDataForSelectedGuide();
  }

  onTypeMachineSelectionChange(typeMachine: string | null): void {
    const normalizedTypeMachine = String(typeMachine ?? '').trim();
    if (!normalizedTypeMachine) {
      this.machines = [];
      this.filteredMachines = [];
      this.executionForm.patchValue({ machineId: null });
      return;
    }

    this.machineService.getAll(undefined, normalizedTypeMachine).subscribe({
      next: (items) => {
        const normalizedSelectedType = this.normalizeMachineType(normalizedTypeMachine);
        this.machines = (items ?? []).filter((machine) => {
          return this.normalizeMachineType(machine?.typeMachine) === normalizedSelectedType && this.isMachineActive(machine);
        });
        this.refreshFilteredDataForSelectedGuide();
      },
      error: () => {
        this.machines = [];
        this.filteredMachines = [];
        this.executionForm.patchValue({ machineId: null });
        this.toastService.error('Impossible de charger les machines pour le type sélectionné.');
      },
    });
  }

  onMachineSelectionChange(machineId: number): void {
    this.executionForm.patchValue({ machineId: Number(machineId) });
  }

  isSelectedMachine(machineId: number): boolean {
    return Number(this.executionForm.get('machineId')?.value ?? 0) === Number(machineId);
  }

  private refreshFilteredDataForSelectedGuide(): void {
    const guideId = Number(this.executionForm.get('guideProductionId')?.value ?? 0);
    if (!guideId) {
      this.filteredLots = [];
      this.refreshFilteredMachines();
      return;
    }

    const guide = this.guides.find((item) => item.idGuideProduction === guideId);
    if (guide) {
      // Filtrage lots et machines par huilerie du guide
      this.filteredLots = this.filterLotsByGuideHuilerie(guide);
      this.refreshFilteredMachines(guide);

      // Réinitialiser le lot si non valide
      if (!this.filteredLots.some((l) => l.idLot === this.executionForm.get('lotId')?.value)) {
        this.executionForm.patchValue({ lotId: null });
      }
    }
  }

  private refreshFilteredMachines(guide?: GuideProduction): void {
    const selectedType = this.normalizeMachineType(this.executionForm.get('typeMachine')?.value);
    if (!guide) {
      this.filteredMachines = [];
      this.executionForm.patchValue({ machineId: null });
      return;
    }

    const guideMachines = this.machines.filter((machine) =>
      this.isMachineActive(machine)
      && this.isSameHuilerie(guide.huilerieId, guide.huilerieNom, machine.huilerieId, machine.huilerieNom),
    );
    this.filteredMachines = selectedType
      ? guideMachines.filter((machine) => this.normalizeMachineType(machine?.typeMachine) === selectedType)
      : guideMachines;

    console.debug('[guides-executer] refreshFilteredMachines', {
      guideHuilerieId: guide.huilerieId,
      guideHuilerieNom: guide.huilerieNom,
      selectedType,
      guideMachinesCount: guideMachines.length,
      filteredMachinesCount: this.filteredMachines.length,
      machineTypes: guideMachines.map((machine) => machine.typeMachine),
      machineHuileries: guideMachines.map((machine) => ({
        idMachine: machine.idMachine,
        huilerieId: machine.huilerieId,
        huilerieNom: machine.huilerieNom,
      })),
    });

    if (this.filteredMachines.length === 1) {
      this.executionForm.patchValue({ machineId: this.filteredMachines[0].idMachine });
      return;
    }

    if (!this.filteredMachines.some((machine) => machine.idMachine === this.executionForm.get('machineId')?.value)) {
      this.executionForm.patchValue({ machineId: null });
    }
  }

  private isMachineActive(machine: Machine): boolean {
    const normalizedStatus = String(machine?.etatMachine ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, '_');
    if (!normalizedStatus) {
      return true;
    }

    return !(
      normalizedStatus.includes('DESACT')
      || normalizedStatus.includes('INACTIVE')
      || normalizedStatus.includes('OFFLINE')
      || normalizedStatus.includes('HORS_SERVICE')
    );
  }

  private normalizeMachineType(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeHuilerieName(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  private isSameHuilerie(
    leftId: number | null | undefined,
    leftNom: string | null | undefined,
    rightId: number | null | undefined,
    rightNom: string | null | undefined,
  ): boolean {
    const normalizedLeftId = Number(leftId ?? 0);
    const normalizedRightId = Number(rightId ?? 0);
    if (normalizedLeftId > 0 && normalizedRightId > 0 && normalizedLeftId === normalizedRightId) {
      return true;
    }

    const normalizedLeftNom = this.normalizeHuilerieName(leftNom);
    const normalizedRightNom = this.normalizeHuilerieName(rightNom);
    return normalizedLeftNom.length > 0 && normalizedRightNom.length > 0 && normalizedLeftNom === normalizedRightNom;
  }

  submitExecution(): void {
    if (this.executionForm.invalid) {
      this.executionForm.markAllAsTouched();
      this.executionMessage = '';
      return;
    }

    const raw = this.executionForm.getRawValue();
    const selectedLotId = Number(raw.lotId ?? 0);
    const selectedLot = this.lots.find((lot) => lot.idLot === selectedLotId);
    const selectedGuideId = Number(raw.guideProductionId ?? 0);
    const selectedMachineId = this.resolveMachineIdForExecution(selectedGuideId, raw.machineId);

    if (!selectedLot) {
      this.executionError = 'Le lot sélectionné est invalide.';
      return;
    }

    if (!selectedMachineId) {
      this.executionError = 'Aucune machine exploitable trouvée pour ce guide. Vérifiez les machines configurées sur le guide.';
      return;
    }

    this.submittingExecution = true;
    this.executionError = '';
    this.executionMessage = '';

    const executionReference = this.buildExecutionReference(
      selectedLot,
      Number(raw.guideProductionId ?? 0),
      selectedMachineId,
    );

    const payload: ExecutionProductionCreate = {
      reference: executionReference,
      dateDebut: String(raw.dateDebut ?? this.today()),
      dateFinPrevue: String(raw.dateFinPrevue ?? this.tomorrow()),
      dateFinReelle: raw.dateFinReelle ? String(raw.dateFinReelle) : null,
      statut: String(raw.statut ?? 'EN_COURS'),
      rendement: Number(raw.rendement ?? 0),
      observations: String(raw.observations ?? '').trim(),
      controleTemperature: raw.controleTemperature === true,
      guideProductionId: Number(raw.guideProductionId),
      machineId: selectedMachineId,
      lotId: Number(raw.lotId),
    };
    this.executionProductionService.create(payload)
      .subscribe({
        next: (createdExecution) => {
          this.submittingExecution = false;
          this.executionMessage = 'Exécution de production créée avec succès.';
          this.toastService.success('Exécution de production créée avec succès.');
          this.executions = [createdExecution, ...this.executions];
          this.saveExecutionCache(this.executions);
          this.selectedExecution = createdExecution;
          this.lotOlivesService.getAll().subscribe((items) => {
            this.refreshAvailableLots(items);
            this.refreshFilteredLotsForSelectedGuide();
          });
          this.resetExecutionForm(false);

          this.executionProductionService.predictOnStart(createdExecution.idExecutionProduction).subscribe({
            next: (prediction) => {
              this.attachPredictionToExecution(createdExecution.idExecutionProduction, prediction);
              void this.showPredictionPopup(prediction);
            },
            error: (error) => {
              const predictionError = this.readHttpError(
                error,
                'Exécution créée, mais la prédiction IA n\'a pas pu être calculée.',
              );
              this.toastService.error(predictionError);
            },
          });
        },
        error: (error) => {
          this.submittingExecution = false;
          this.executionError = this.readHttpError(error, 'Impossible de créer l’exécution de production.');
          this.toastService.error(this.executionError);
        },
      });
  }

  private resolveMachineIdForExecution(guideId: number, formMachineId: unknown): number {
    const explicitMachineId = Number(formMachineId ?? 0);
    if (explicitMachineId > 0) {
      return explicitMachineId;
    }

    const guide = this.guides.find((item) => item.idGuideProduction === guideId);
    if (!guide) {
      return 0;
    }

    const stepMachineIds = [...(guide.etapes ?? [])]
      .sort((a, b) => Number(a?.ordre ?? 0) - Number(b?.ordre ?? 0))
      .map((step) => Number(step.machineId ?? 0))
      .filter((id) => id > 0);
    if (stepMachineIds.length > 0) {
      // La machine est déjà fixée au niveau du guide: on fait confiance à la configuration du guide.
      return stepMachineIds[0];
    }

    if (this.filteredMachines.length > 0) {
      return Number(this.filteredMachines[0].idMachine ?? 0);
    }

    const sameHuilerieMachine = this.machines.find((machine) =>
      this.isMachineActive(machine)
      && this.isSameHuilerie(guide.huilerieId, guide.huilerieNom, machine.huilerieId, machine.huilerieNom),
    );
    if (sameHuilerieMachine) {
      return Number(sameHuilerieMachine.idMachine ?? 0);
    }

    return 0;
  }

  selectExecution(execution: ExecutionProduction): void {
    this.selectedExecution = execution;
    this.populateExecutionValuesFromGuideOrExecution(execution);
  }

  saveValeursReelles(): void {
    if (!this.selectedExecution || this.valeursReelles.invalid || this.valeursReelles.length === 0) {
      this.valeursReelles.markAllAsTouched();
      this.toastService.error('Veuillez remplir toutes les valeurs réelles.');
      return;
    }
    const valeursPayload = this.mapValeursReellesPayload(this.executionForm.get('valeursReelles')?.value || []);
    this.executionProductionService.saveValeursReelles(this.selectedExecution.idExecutionProduction, valeursPayload)
      .subscribe({
        next: () => {
          this.executionRealValuesCache.set(this.selectedExecution!.idExecutionProduction, valeursPayload);
          this.selectedExecution = {
            ...this.selectedExecution!,
            valeursReelles: valeursPayload,
          };
          this.toastService.success('Valeurs réelles enregistrées avec succès.');
        },
        error: () => {
          this.toastService.error('Erreur lors de l\'enregistrement des valeurs réelles.');
        }
      });
  }

  async finishExecution(execution: ExecutionProduction): Promise<void> {
    if (this.isExecutionTerminated(execution)) {
      this.selectedExecution = execution;
      this.populateExecutionValuesFromGuideOrExecution(execution);
      return;
    }

    const isCurrentSelection = this.selectedExecution?.idExecutionProduction === execution.idExecutionProduction;
    if (!isCurrentSelection) {
      this.selectedExecution = execution;
      this.populateExecutionValuesFromGuideOrExecution(execution);
    }

    if (this.executionValueRows.length > 0 && (this.valeursReelles.invalid || this.valeursReelles.length === 0)) {
      this.valeursReelles.markAllAsTouched();
      this.toastService.error('Veuillez corriger les valeurs réelles avant de terminer l\'exécution.');
      return;
    }

    const dateFinReelle = this.today();

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Terminer l\'exécution',
      message: 'Cette action va créer le produit final, afficher sa référence et passer le statut à TERMINEE.',
      confirmText: 'Terminer',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

    const executionToFinalize: ExecutionProduction = {
      ...execution,
      dateFinReelle,
      statut: 'TERMINEE',
    };

    const valeursPayload = this.mapValeursReellesPayload(this.executionForm.get('valeursReelles')?.value || []);
    this.executionRealValuesCache.set(execution.idExecutionProduction, valeursPayload);
    const saveValeursReelles$ = this.executionValueRows.length > 0
      ? this.executionProductionService.saveValeursReelles(execution.idExecutionProduction, valeursPayload)
      : of(void 0);

    saveValeursReelles$.pipe(
      switchMap(() => this.executionProductionService.createProduitFinal(executionToFinalize)),
    ).subscribe({
      next: (executionWithProduct) => {
        const mergedExecution: ExecutionProduction = {
          ...executionToFinalize,
          ...(executionWithProduct ?? {}),
          dateFinReelle: executionWithProduct?.dateFinReelle ?? executionToFinalize.dateFinReelle,
          statut: executionWithProduct?.statut ?? executionToFinalize.statut,
          valeursReelles: (executionWithProduct?.valeursReelles && executionWithProduct.valeursReelles.length > 0)
            ? executionWithProduct.valeursReelles
            : valeursPayload,
        };

        this.executionMessage = 'Valeurs réelles enregistrées, produit final créé et exécution terminée.';
        this.selectedExecution = mergedExecution;
        this.populateExecutionValuesFromGuideOrExecution(mergedExecution);
        this.executions = this.executions.map((item) =>
          item.idExecutionProduction === mergedExecution.idExecutionProduction ? mergedExecution : item,
        );
        this.saveExecutionCache(this.executions);
        this.toastService.success('Exécution terminée avec succès.');
      },
      error: (error) => {
        this.executionError = this.readHttpError(error, 'Impossible de terminer l’exécution.');
        this.toastService.error(this.executionError);
      },
    });
  }

  private loadReferenceData(): void {
    this.guideProductionService.getAll().subscribe((items) => (this.guides = items));
    this.machines = [];
    this.filteredMachines = [];
    this.lotOlivesService.getAll().subscribe((items) => {
      this.refreshAvailableLots(items);
      this.refreshFilteredLotsForSelectedGuide();
    });
    this.rawMaterialService.getAll().subscribe((items) => (this.matieresPremieres = items));
  }

  private loadExecutions(): void {
    this.executionProductionService.getAll().subscribe((items) => {
      this.executions = this.filterExecutionsByCurrentHuilerie(items ?? []);
      this.saveExecutionCache(this.executions);
      this.refreshAvailableLots(this.lots);
      this.refreshFilteredLotsForSelectedGuide();
      if (this.selectedExecution) {
        const refreshed = this.executions.find((item) => item.idExecutionProduction === this.selectedExecution?.idExecutionProduction);
        this.selectedExecution = refreshed
          ? {
            ...refreshed,
            dateFinReelle: refreshed.dateFinReelle ?? this.selectedExecution.dateFinReelle,
            valeursReelles: (refreshed.valeursReelles && refreshed.valeursReelles.length > 0)
              ? refreshed.valeursReelles
              : this.selectedExecution.valeursReelles,
          }
          : this.selectedExecution;
      }
    }, (error: HttpErrorResponse) => {
      const cachedExecutions = this.readExecutionCache();
      if (cachedExecutions.length > 0) {
        this.executions = this.filterExecutionsByCurrentHuilerie(cachedExecutions);
        this.executionError = '';
        return;
      }

      this.executionError = this.readHttpError(error, 'Impossible de charger les exécutions enregistrées.');
    });
  }

  private saveExecutionCache(executions: ExecutionProduction[]): void {
    try {
      localStorage.setItem(this.executionCacheKey, JSON.stringify(executions ?? []));
    } catch {
      // Ignore localStorage write errors.
    }
  }

  private readExecutionCache(): ExecutionProduction[] {
    try {
      const raw = localStorage.getItem(this.executionCacheKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as ExecutionProduction[] : [];
    } catch {
      return [];
    }
  }

  private restoreCachedExecutions(): void {
    this.executions = this.filterExecutionsByCurrentHuilerie(this.readExecutionCache());
  }

  private refreshAvailableLots(items: LotOlives[]): void {
    const usedLotIds = new Set(
      this.executions
        .map((execution) => Number(execution?.lotId ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    );

    this.lots = (items ?? []).filter((lot) => !usedLotIds.has(Number(lot?.idLot ?? 0)));
  }

  private filterLotsByGuideHuilerie(guide: GuideProduction): LotOlives[] {
    return this.lots.filter((lot) =>
      this.isSameHuilerie(guide.huilerieId, guide.huilerieNom, lot.huilerieId, lot.huilerieNom),
    );
  }

  private refreshFilteredLotsForSelectedGuide(): void {
    const guideId = Number(this.executionForm.get('guideProductionId')?.value ?? 0);
    if (!guideId) {
      this.filteredLots = [];
      return;
    }

    const guide = this.guides.find((item) => item.idGuideProduction === guideId);
    this.filteredLots = guide ? this.filterLotsByGuideHuilerie(guide) : [];

    const selectedLotId = Number(this.executionForm.get('lotId')?.value ?? 0);
    if (selectedLotId && !this.filteredLots.some((lot) => Number(lot?.idLot ?? 0) === selectedLotId)) {
      this.executionForm.patchValue({ lotId: null });
    }
  }

  private filterExecutionsByCurrentHuilerie(executions: ExecutionProduction[]): ExecutionProduction[] {
    if (this.authService.isCurrentUserAdmin()) {
      return executions;
    }

    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      return executions;
    }

    return executions.filter((execution) => Number(execution?.huilerieId ?? 0) === currentHuilerieId);
  }

  private populateExecutionValuesFromGuide(guide: GuideProduction): void {
    this.executionForm.patchValue({ guideProductionId: guide.idGuideProduction });
  }

  private populateExecutionValuesFromGuideOrExecution(
    execution: ExecutionProduction,
    guideOverride?: GuideProduction,
  ): void {
    const guide = guideOverride ?? this.guides.find((item) => item.idGuideProduction === execution.guideProductionId);
    if (!guide) {
      return;
    }

    this.executionValueRows = [];
    this.valeursReelles.clear();

    const realValuesByParamId = new Map<number, string>();
    const cachedValues = this.executionRealValuesCache.get(execution.idExecutionProduction) ?? [];
    const sourceValues = (execution.valeursReelles && execution.valeursReelles.length > 0)
      ? execution.valeursReelles
      : cachedValues;

    sourceValues.forEach((value) => {
      realValuesByParamId.set(Number(value.parametreEtapeId), String(value.valeurReelle ?? '').trim());
    });
    const executionParamIds = new Set(Array.from(realValuesByParamId.keys()).filter((id) => id > 0));

    (guide.etapes ?? []).forEach((etape) => {
      const uniqueParamsByKey = new Map<string, any>();

      (etape.parametres ?? []).forEach((parametre: any) => {
        const parametreEtapeId = Number(parametre?.idParametreEtape ?? 0);
        const paramExecutionId = Number(
          parametre?.executionProduction?.idExecutionProduction
          ?? parametre?.executionProductionId
          ?? 0,
        );

        // Sans historique: garder seulement les paramètres de base (executionProduction null)
        // et, pour une exécution existante, les paramètres de cette exécution.
        const isBaseParam = paramExecutionId <= 0;
        const isCurrentExecutionParam = executionParamIds.has(parametreEtapeId);
        if (!isBaseParam && !isCurrentExecutionParam) {
          return;
        }

        const key = [
          String(etape?.nom ?? '').trim().toLowerCase(),
          String(parametre?.nom ?? '').trim().toLowerCase(),
          String(parametre?.uniteMesure ?? '').trim().toLowerCase(),
          String(parametre?.valeur ?? '').trim(),
        ].join('|');

        const existing = uniqueParamsByKey.get(key);
        if (!existing) {
          uniqueParamsByKey.set(key, parametre);
          return;
        }

        const existingId = Number(existing?.idParametreEtape ?? 0);
        const currentIsExecutionParam = executionParamIds.has(parametreEtapeId);
        const existingIsExecutionParam = executionParamIds.has(existingId);

        // Priorité à l'instance du paramètre liée à l'exécution courante.
        if (currentIsExecutionParam && !existingIsExecutionParam) {
          uniqueParamsByKey.set(key, parametre);
        }
      });

      Array.from(uniqueParamsByKey.values()).forEach((parametre: any) => {
        const parametreEtapeId = Number(parametre.idParametreEtape ?? 0);
        const estimatedValue = String(parametre.valeur ?? '').trim();
        const realValue = realValuesByParamId.get(parametreEtapeId) ?? String(parametre.valeurReelle ?? '').trim();

        this.executionValueRows.push({
          parametreEtapeId,
          stepName: etape.nom,
          parameterName: parametre.nom,
          uniteMesure: parametre.uniteMesure,
          estimatedValue,
        });

        this.valeursReelles.push(
          this.fb.group({
            parametreEtapeId: [parametreEtapeId, [Validators.required]],
            valeurReelle: [realValue, [Validators.required]],
          }),
        );
      });
    });
  }

  private mapValeursReellesPayload(valeursReelles: unknown[]): Array<{ parametreEtapeId: number; valeurReelle: string }> {
    return (valeursReelles as Array<Record<string, unknown>>).map((valeur) => ({
      parametreEtapeId: Number(valeur['parametreEtapeId'] ?? 0),
      valeurReelle: String(valeur['valeurReelle'] ?? '').trim(),
    }));
  }

  private resetExecutionForm(keepGuideSelection: boolean): void {
    const guideProductionId = keepGuideSelection ? this.executionForm.get('guideProductionId')?.value : null;

    this.executionForm.reset({
      dateDebut: this.today(),
      dateFinPrevue: this.tomorrow(),
      dateFinReelle: null,
      statut: 'EN_COURS',
      rendement: 0,
      observations: '',
      controleTemperature: false,
      guideProductionId,
      typeMachine: null,
      machineId: null,
      lotId: null,
    });

    this.valeursReelles.clear();
    this.executionValueRows = [];
  }

  private attachPredictionToExecution(executionId: number, prediction: Prediction): void {
    this.executions = this.executions.map((execution) => {
      if (execution.idExecutionProduction !== executionId) {
        return execution;
      }

      const updatedPredictions = [prediction, ...(execution.predictions ?? [])];
      return {
        ...execution,
        predictions: updatedPredictions,
      };
    });
    this.saveExecutionCache(this.executions);
  }

  private async showPredictionPopup(prediction: Prediction): Promise<void> {
    const lines = [
      `Mode de prédiction: ${String(prediction.modePrediction ?? '-').toUpperCase()}`,
      `Qualité prédite: ${String(prediction.qualitePredite ?? '-')}`,
      `Probabilité de qualité: ${prediction.probabiliteQualite != null ? Number(prediction.probabiliteQualite).toFixed(4) : '-'}`,
      `Rendement prédit (%): ${prediction.rendementPreditPourcent != null ? Number(prediction.rendementPreditPourcent).toFixed(2) : '-'}`,
      `Quantité d'huile recalculée (L): ${prediction.quantiteHuileRecalculeeLitres != null ? Number(prediction.quantiteHuileRecalculeeLitres).toFixed(2) : '-'}`,
    ];

    await this.confirmDialogService.confirm({
      title: 'Prédiction IA',
      message: lines.join('\n'),
      confirmText: 'Fermer',
      cancelText: '',
      intent: 'info',
    });
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private tomorrow(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  private buildExecutionReference(lot: LotOlives, guideId: number, machineId: number): string {
    const lotRef = String(lot.reference ?? `LOT-${lot.idLot}`)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `EXE-${lotRef || `LOT-${lot.idLot}`}-G${guideId || 0}-M${machineId || 0}-${yyyy}${mm}${dd}${hh}${min}${ss}${ms}`;
  }

  private readHttpError(error: unknown, fallbackMessage: string): string {
    const possibleMessage = (error as { error?: { message?: string; errors?: string[] }; message?: string })?.error?.message
      ?? (error as { message?: string })?.message;

    const firstApiError = (error as { error?: { errors?: string[] } })?.error?.errors?.[0];
    const backendMessage = String(firstApiError ?? possibleMessage ?? '').trim();

    if (backendMessage.includes('No row with the given identifier exists for entity [Models.GuideProduction')) {
      return 'Le guide sélectionné est introuvable côté serveur. Veuillez choisir un autre guide.';
    }

    if (backendMessage.includes('Une contrainte d\'unicite a ete violee')) {
      return 'Conflit de données détecté. Vérifiez le code lot puis réessayez.';
    }

    return backendMessage || fallbackMessage;
  }

  isExecutionFieldInvalid(controlName: string): boolean {
    const control = this.executionForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  isValeurReelleInvalid(index: number): boolean {
    const control = this.valeursReelles.at(index)?.get('valeurReelle');
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}
