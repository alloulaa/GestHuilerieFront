import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  NbButtonModule,
  NbCardModule,
  NbIconModule,
  NbInputModule,
  NbSelectModule,
} from '@nebular/theme';
import { Huilerie, Machine } from '../../../machines/models/enterprise.models';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { MachineService } from '../../../machines/services/machine.service';
import { LotOlives } from '../../../lots/models/lot.models';
import { LotOlivesService } from '../../../lots/services/lot-olives.service';
import { MatierePremiere } from '../../../matieres-premieres/models/raw-material.models';
import { RawMaterialService } from '../../../matieres-premieres/services/raw-material.service';
import {
  EtapeProduction,
  ExecutionProductionCreate,
  ExecutionProduction,
  GuideProduction,
  ParametreEtape,
} from '../../models/production.models';
import { ExecutionProductionService } from '../../services/execution-production.service';
import { GuideProductionService } from '../../services/guide-production.service';

@Component({
  selector: 'app-production-guides',
  templateUrl: './production-guides.component.html',
  styleUrls: ['./production-guides.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule,
    NbInputModule,
    NbSelectModule,
  ],
})
export class ProductionGuidesComponent implements OnInit {
  guides: GuideProduction[] = [];
  executions: ExecutionProduction[] = [];
  huileries: Huilerie[] = [];
  machines: Machine[] = [];
  lots: LotOlives[] = [];
  matieresPremieres: MatierePremiere[] = [];

  selectedGuideId: number | null = null;
  selectedExecutionId: number | null = null;

  guideMessage = '';
  executionMessage = '';
  guideError = '';
  executionError = '';

  submittingGuide = false;
  submittingExecution = false;
  creatingProduitFinal = false;

  readonly guideForm;
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
    @Inject(forwardRef(() => HuilerieService))
    private huilerieService: HuilerieService,
    @Inject(forwardRef(() => MachineService))
    private machineService: MachineService,
    @Inject(forwardRef(() => LotOlivesService))
    private lotOlivesService: LotOlivesService,
    @Inject(forwardRef(() => RawMaterialService))
    private rawMaterialService: RawMaterialService,
  ) {
    this.guideForm = this.fb.group({
      nom: ['', [Validators.required]],
      description: ['', [Validators.required]],
      dateCreation: [this.today(), [Validators.required]],
      huilerieId: [null, [Validators.required]],
      etapes: this.fb.array([
        this.createEtapeGroup(1),
        this.createEtapeGroup(2),
      ]),
    });

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
    this.reloadGuides();
    this.reloadExecutions();
  }

  get etapes(): FormArray {
    return this.guideForm.get('etapes') as FormArray;
  }

  get valeursReelles(): FormArray {
    return this.executionForm.get('valeursReelles') as FormArray;
  }

  get selectedGuide(): GuideProduction | undefined {
    return this.guides.find((guide) => guide.idGuideProduction === this.selectedGuideId);
  }

  get selectedExecution(): ExecutionProduction | undefined {
    return this.executions.find((execution) => execution.idExecutionProduction === this.selectedExecutionId);
  }

  get guideCount(): number {
    return this.guides.length;
  }

  get executionCount(): number {
    return this.executions.length;
  }

  get etapeCount(): number {
    return this.guides.reduce((total, guide) => total + (guide.etapes?.length ?? 0), 0);
  }

  get parameterCount(): number {
    return this.guides.reduce((total, guide) => {
      return total + (guide.etapes ?? []).reduce((stepTotal, etape) => stepTotal + (etape.parametres?.length ?? 0), 0);
    }, 0);
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

    const matiere = this.matieresPremieres.find((item) => item.idMatierePremiere === lot.matierePremiereId);
    return matiere?.nom ?? `#${lot.matierePremiereId}`;
  }

  lotDisplayLabel(lot: LotOlives): string {
    const lotWithReference = lot as LotOlives & { reference?: string };
    return `${lotWithReference.reference ?? `LOT-${lot.idLot}`} - ${lot.varieteOlive}`;
  }

  addEtape(): void {
    this.etapes.push(this.createEtapeGroup(this.etapes.length + 1));
  }

  removeEtape(index: number): void {
    if (this.etapes.length <= 1) {
      return;
    }

    this.etapes.removeAt(index);
    this.reorderEtapes();
  }

  addParametre(etapeIndex: number): void {
    this.getParametres(etapeIndex).push(this.createParametreGroup());
  }

  removeParametre(etapeIndex: number, parametreIndex: number): void {
    const parametres = this.getParametres(etapeIndex);
    if (parametres.length <= 1) {
      return;
    }

    parametres.removeAt(parametreIndex);
  }

  selectGuide(guide: GuideProduction): void {
    this.selectedGuideId = guide.idGuideProduction;
    this.executionForm.patchValue({ guideProductionId: guide.idGuideProduction });
    this.populateExecutionValuesFromGuide(guide);
  }

  closeGuideDetails(): void {
    this.selectedGuideId = null;
  }

  onGuideSelectionChange(guideId: number | string | null): void {
    const numericGuideId = guideId === null ? null : Number(guideId);
    this.selectedGuideId = numericGuideId;

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

  selectExecution(execution: ExecutionProduction): void {
    this.selectedExecutionId = execution.idExecutionProduction;
  }

  closeExecutionDetails(): void {
    this.selectedExecutionId = null;
  }

  createProduitFinal(execution: ExecutionProduction): void {
    this.creatingProduitFinal = true;
    this.executionError = '';
    this.executionMessage = '';

    this.executionProductionService.createProduitFinal(execution.idExecutionProduction).subscribe({
      next: (updated) => {
        this.creatingProduitFinal = false;
        this.executionMessage = 'Produit final généré avec succès.';
        this.reloadExecutions(updated.idExecutionProduction);
      },
      error: (error) => {
        this.creatingProduitFinal = false;
        this.executionError = this.readHttpError(error, 'Impossible de générer le produit final.');
      },
    });
  }

  submitGuide(): void {
    if (this.guideForm.invalid) {
      this.guideForm.markAllAsTouched();
      return;
    }

    this.submittingGuide = true;
    this.guideError = '';
    this.guideMessage = '';

    const raw = this.guideForm.getRawValue();
    const payload = {
      nom: String(raw.nom ?? '').trim(),
      description: String(raw.description ?? '').trim(),
      dateCreation: String(raw.dateCreation ?? this.today()),
      huilerieId: Number(raw.huilerieId),
      etapes: this.mapEtapesPayload(raw.etapes ?? []),
    };

    this.guideProductionService.create(payload).subscribe({
      next: (created) => {
        this.submittingGuide = false;
        this.guideMessage = 'Guide de production créé avec succès.';
        this.resetGuideForm();
        this.reloadGuides(created.idGuideProduction);
      },
      error: (error) => {
        this.submittingGuide = false;
        this.guideError = this.readHttpError(error, 'Impossible de créer le guide de production.');
      },
    });
  }

  submitExecution(): void {
    if (this.executionForm.invalid) {
      this.executionForm.markAllAsTouched();
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

    this.executionProductionService.create(payload).subscribe({
      next: (created) => {
        this.submittingExecution = false;
        this.executionMessage = 'Exécution de production créée avec succès.';
        this.resetExecutionForm(false);
        this.reloadExecutions(created.idExecutionProduction);
      },
      error: (error) => {
        this.submittingExecution = false;
        this.executionError = this.readHttpError(error, 'Impossible de créer l’exécution de production.');
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'EN_COURS':
        return 'En cours';
      case 'TERMINEE':
        return 'Terminée';
      case 'ANNULEE':
        return 'Annulée';
      case 'PLANIFIEE':
        return 'Planifiée';
      default:
        return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'EN_COURS':
        return 'status-warn';
      case 'TERMINEE':
        return 'status-success';
      case 'ANNULEE':
        return 'status-danger';
      case 'PLANIFIEE':
        return 'status-neutral';
      default:
        return 'status-neutral';
    }
  }

  stepSummary(guide: GuideProduction): string {
    const steps = guide.etapes?.length ?? 0;
    const params = (guide.etapes ?? []).reduce((total, etape) => total + (etape.parametres?.length ?? 0), 0);
    return `${steps} étape${steps > 1 ? 's' : ''} · ${params} paramètre${params > 1 ? 's' : ''}`;
  }

  getParametres(etapeIndex: number): FormArray {
    return this.etapes.at(etapeIndex).get('parametres') as FormArray;
  }

  private loadReferenceData(): void {
    this.huilerieService.getAll().subscribe((items) => (this.huileries = items));
    this.machineService.getAll().subscribe((items) => (this.machines = items));
    this.lotOlivesService.getAll().subscribe((items) => (this.lots = items));
    this.rawMaterialService.getAll().subscribe((items) => (this.matieresPremieres = items));
  }

  private reloadGuides(selectGuideId?: number): void {
    this.guideProductionService.getAll().subscribe((items) => {
      this.guides = items;

      if (selectGuideId) {
        const createdGuide = this.guides.find((guide) => guide.idGuideProduction === selectGuideId);
        if (createdGuide) {
          this.selectGuide(createdGuide);
        }
      }
    });
  }

  private reloadExecutions(selectExecutionId?: number): void {
    this.executionProductionService.getAll().subscribe((items) => {
      this.executions = items;

      if (selectExecutionId) {
        this.selectedExecutionId = selectExecutionId;
      }
    });
  }

  private createEtapeGroup(ordre: number): ReturnType<FormBuilder['group']> {
    return this.fb.group({
      nom: ['', [Validators.required]],
      ordre: [ordre, [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required]],
      parametres: this.fb.array([this.createParametreGroup()]),
    });
  }

  private createParametreGroup(): ReturnType<FormBuilder['group']> {
    return this.fb.group({
      nom: ['', [Validators.required]],
      uniteMesure: ['', [Validators.required]],
      description: ['', [Validators.required]],
      valeur: ['', [Validators.required]],
    });
  }

  private reorderEtapes(): void {
    this.etapes.controls.forEach((control, index) => {
      control.get('ordre')?.setValue(index + 1);
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

  private mapEtapesPayload(etapes: unknown[]): EtapeProduction[] {
    return (etapes as Array<Record<string, unknown>>).map((etape) => ({
      nom: String(etape['nom'] ?? '').trim(),
      ordre: Number(etape['ordre'] ?? 1),
      description: String(etape['description'] ?? '').trim(),
      parametres: this.mapParametresPayload((etape['parametres'] as unknown[]) ?? []),
    }));
  }

  private mapParametresPayload(parametres: unknown[]): ParametreEtape[] {
    return (parametres as Array<Record<string, unknown>>).map((parametre) => ({
      nom: String(parametre['nom'] ?? '').trim(),
      uniteMesure: String(parametre['uniteMesure'] ?? '').trim(),
      description: String(parametre['description'] ?? '').trim(),
      valeur: String(parametre['valeur'] ?? '').trim(),
    }));
  }

  private mapValeursReellesPayload(valeursReelles: unknown[]): Array<{ parametreEtapeId: number; valeurReelle: string }> {
    return (valeursReelles as Array<Record<string, unknown>>).map((valeur) => ({
      parametreEtapeId: Number(valeur['parametreEtapeId'] ?? 0),
      valeurReelle: String(valeur['valeurReelle'] ?? '').trim(),
    }));
  }

  private resetGuideForm(): void {
    this.guideForm.reset({
      nom: '',
      description: '',
      dateCreation: this.today(),
      huilerieId: null,
    });

    this.etapes.clear();
    this.etapes.push(this.createEtapeGroup(1));
    this.etapes.push(this.createEtapeGroup(2));
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
}