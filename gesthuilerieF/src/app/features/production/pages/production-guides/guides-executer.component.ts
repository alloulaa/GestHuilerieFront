import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule, NbSelectModule } from '@nebular/theme';
import { Machine } from '../../../machines/models/enterprise.models';
import { MachineService } from '../../../machines/services/machine.service';
import { LotOlives } from '../../../lots/models/lot.models';
import { LotOlivesService } from '../../../lots/services/lot-olives.service';
import { MatierePremiere } from '../../../matieres-premieres/models/raw-material.models';
import { RawMaterialService } from '../../../matieres-premieres/services/raw-material.service';
import { ExecutionProduction, ExecutionProductionCreate, GuideProduction } from '../../models/production.models';
import { ExecutionProductionService } from '../../services/execution-production.service';
import { GuideProductionService } from '../../services/guide-production.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-guides-executer',
  standalone: true,
  templateUrl: './guides-executer.component.html',
  styleUrls: ['./production-guides.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, NbCardModule, NbButtonModule, NbInputModule, NbSelectModule],
})
export class GuidesExecuterComponent implements OnInit {
  guides: GuideProduction[] = [];
  machines: Machine[] = [];
  lots: LotOlives[] = [];
  matieresPremieres: MatierePremiere[] = [];
  executions: ExecutionProduction[] = [];

  executionMessage = '';
  executionError = '';
  submittingExecution = false;
  selectedExecution: ExecutionProduction | null = null;

  readonly executionForm;

  executionValueRows: Array<{
    stepName: string;
    parameterName: string;
    uniteMesure: string;
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
      guideProductionId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      machineId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      lotOlivesId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      valeursReelles: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
  }

  get valeursReelles(): FormArray {
    return this.executionForm.get('valeursReelles') as FormArray;
  }

  get selectedGuideParameterCount(): number {
    return this.executionValueRows.length;
  }

  get selectedLotMatierePremiereNom(): string {
    const lotId = Number(this.executionForm.get('lotOlivesId')?.value ?? 0);
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
    const lot = this.lots.find((item) => item.idLot === execution.lotOlivesId);
    const lotLabel = lot?.reference || execution.codeLot || `LOT-${execution.lotOlivesId}`;
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
      return;
    }

    const guide = this.guides.find((item) => item.idGuideProduction === numericGuideId);
    if (guide) {
      this.populateExecutionValuesFromGuide(guide);
    }
  }

  submitExecution(): void {
    if (this.executionForm.invalid) {
      this.executionForm.markAllAsTouched();
      this.executionMessage = '';
      return;
    }

    const raw = this.executionForm.getRawValue();
    const selectedLotId = Number(raw.lotOlivesId ?? 0);
    const selectedLot = this.lots.find((lot) => lot.idLot === selectedLotId);
    const matierePremiereId = Number(selectedLot?.matierePremiereId ?? 0);

    if (!selectedLot || !matierePremiereId) {
      this.executionError = 'Le lot sélectionné doit être lié à une matière première valide.';
      return;
    }

    this.submittingExecution = true;
    this.executionError = '';
    this.executionMessage = '';

    const payload: ExecutionProductionCreate = {
      codeLot: selectedLot.reference ?? `LOT-${selectedLot.idLot}`,
      dateDebut: String(raw.dateDebut ?? this.today()),
      dateFinPrevue: String(raw.dateFinPrevue ?? this.tomorrow()),
      dateFinReelle: raw.dateFinReelle ? String(raw.dateFinReelle) : null,
      statut: String(raw.statut ?? 'EN_COURS'),
      rendement: Number(raw.rendement ?? 0),
      observations: String(raw.observations ?? '').trim(),
      guideProductionId: Number(raw.guideProductionId),
      machineId: Number(raw.machineId),
      lotOlivesId: Number(raw.lotOlivesId),
      matierePremiereId,
      valeursReelles: this.mapValeursReellesPayload(raw.valeursReelles ?? []),
    };

    this.executionProductionService.create(payload)
      .subscribe({
        next: () => {
          this.submittingExecution = false;
          this.executionMessage = 'Exécution de production créée avec succès.';
          this.toastService.success('Exécution de production créée avec succès.');
          this.resetExecutionForm(false);
          this.loadExecutions();
        },
        error: (error) => {
          this.submittingExecution = false;
          this.executionError = this.readHttpError(error, 'Impossible de créer l’exécution de production.');
          this.toastService.error(this.executionError);
        },
      });
  }

  selectExecution(execution: ExecutionProduction): void {
    this.selectedExecution = execution;
  }

  async finishExecution(execution: ExecutionProduction): Promise<void> {
    if (this.isExecutionTerminated(execution)) {
      this.selectedExecution = execution;
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

    this.executionProductionService.createProduitFinal(execution).subscribe({
      next: (updatedExecution) => {
        this.executionMessage = 'Produit final créé et exécution terminée.';
        this.selectedExecution = {
          ...(updatedExecution ?? execution),
          dateFinReelle: updatedExecution?.dateFinReelle ?? execution.dateFinReelle ?? dateFinReelle,
          statut: updatedExecution?.statut ?? 'TERMINEE',
        };
        this.toastService.success('Produit final créé avec succès.');
        this.loadExecutions();
      },
      error: (error) => {
        this.executionError = this.readHttpError(error, 'Impossible de terminer l’exécution.');
        this.toastService.error(this.executionError);
      },
    });
  }

  private loadReferenceData(): void {
    this.guideProductionService.getAll().subscribe((items) => (this.guides = items));
    this.machineService.getAll().subscribe((items) => (this.machines = items));
    this.lotOlivesService.getAll().subscribe((items) => (this.lots = items));
    this.rawMaterialService.getAll().subscribe((items) => (this.matieresPremieres = items));
    this.loadExecutions();
  }

  private loadExecutions(): void {
    this.executionProductionService.getAll().subscribe((items) => {
      this.executions = items ?? [];
      if (this.selectedExecution) {
        const refreshed = this.executions.find((item) => item.idExecutionProduction === this.selectedExecution?.idExecutionProduction);
        this.selectedExecution = refreshed
          ? {
            ...refreshed,
            dateFinReelle: refreshed.dateFinReelle ?? this.selectedExecution.dateFinReelle,
          }
          : this.selectedExecution;
      }
    });
  }

  private populateExecutionValuesFromGuide(guide: GuideProduction): void {
    this.executionForm.patchValue({
      guideProductionId: guide.idGuideProduction,
    });

    this.executionValueRows = [];
    this.valeursReelles.clear();

    (guide.etapes ?? []).forEach((etape) => {
      (etape.parametres ?? []).forEach((parametre) => {
        this.executionValueRows.push({
          stepName: etape.nom,
          parameterName: parametre.nom,
          uniteMesure: parametre.uniteMesure,
        });

        this.valeursReelles.push(
          this.fb.group({
            parametreEtapeId: [parametre.idParametreEtape ?? 0, [Validators.required]],
            valeurReelle: [parametre.valeur ?? '', [Validators.required]],
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
      guideProductionId,
      machineId: null,
      lotOlivesId: null,
    });

    this.valeursReelles.clear();
    this.executionValueRows = [];
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private tomorrow(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  private readHttpError(error: unknown, fallbackMessage: string): string {
    const possibleMessage = (error as { error?: { message?: string }; message?: string })?.error?.message
      ?? (error as { message?: string })?.message;

    return possibleMessage ? String(possibleMessage) : fallbackMessage;
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
