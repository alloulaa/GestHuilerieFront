import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbIconModule, NbInputModule, NbSelectModule } from '@nebular/theme';
import { HttpErrorResponse } from '@angular/common/http';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { EtapeProduction, ExecutionProduction, GuideProduction, ParametreEtape } from '../../models/production.models';
import { GuideProductionService } from '../../services/guide-production.service';
import { ExecutionProductionService } from '../../services/execution-production.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-guides-gerer',
  standalone: true,
  templateUrl: './guides-gerer.component.html',
  styleUrls: ['./guides-gerer.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbSelectModule,
    NbIconModule,
  ],
})
export class GuidesGererComponent implements OnInit {
  huileries: Huilerie[] = [];
  guides: GuideProduction[] = [];
  executions: ExecutionProduction[] = [];

  guideEditingId: number | null = null;
  executionEditingId: number | null = null;
  pendingExecutionDeletion: ExecutionProduction | null = null;

  executionMessage = '';
  executionError = '';

  readonly fixedParametreOptions: Array<{ code: string; unite: string; description: string; valeur: string }> = [
    {
      code: 'temperature_malaxage_c',
      unite: 'C',
      description: 'Temperature de malaxage',
      valeur: '27',
    },
    {
      code: 'duree_malaxage_min',
      unite: 'min',
      description: 'Duree de malaxage',
      valeur: '40',
    },
    {
      code: 'vitesse_decanteur_tr_min',
      unite: 'tr/min',
      description: 'Vitesse du decanteur',
      valeur: '3200',
    },
    {
      code: 'pression_extraction_bar',
      unite: 'bar',
      description: 'Pression d extraction',
      valeur: '2.5',
    },
  ];
  readonly customParametreCode = 'autre';

  readonly guideForm;
  readonly executionForm;

  constructor(
    private fb: FormBuilder,
    private guideProductionService: GuideProductionService,
    private executionProductionService: ExecutionProductionService,
    private huilerieService: HuilerieService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
    private permissionService: PermissionService,
    private authService: AuthService,
  ) {
    this.guideForm = this.fb.group({
      nom: ['', [Validators.required]],
      description: ['', [Validators.required]],
      dateCreation: [this.today(), [Validators.required]],
      huilerieId: [0, [Validators.required, Validators.min(1)]],
      etapes: this.fb.array([
        this.createEtapeGroup(1),

      ]),
    });

    this.executionForm = this.fb.group({
      reference: ['', [Validators.required]],
      guideProductionId: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
  }

  get canUpdate(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canUpdate('GUIDE_PRODUCTION');
  }

  get canDelete(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canDelete('GUIDE_PRODUCTION');
  }

  get etapes(): FormArray {
    return this.guideForm.get('etapes') as FormArray;
  }

  loadReferenceData(): void {
    this.huilerieService.getAll().subscribe(h => {
      this.huileries = h;
      if (this.huileries.length > 0) {
        this.guideForm.patchValue({ huilerieId: this.huileries[0]?.idHuilerie ?? 0 });
      }
    });
    this.loadGuides();
    this.loadExecutions();
  }

  loadGuides(): void {
    this.guideProductionService.getAll().subscribe(data => {
      this.guides = data;
    });
  }

  loadExecutions(): void {
    this.executionProductionService.getAll().subscribe(data => {
      this.executions = this.filterExecutionsByCurrentHuilerie(data ?? []);
    }, (error: HttpErrorResponse) => {
      const cachedExecutions = this.filterExecutionsByCurrentHuilerie(this.readExecutionCache());
      if (cachedExecutions.length > 0) {
        this.executions = cachedExecutions;
        return;
      }

      this.toastService.error(this.readHttpError(error, 'Impossible de charger les exécutions enregistrées.'));
    });
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

  private readExecutionCache(): ExecutionProduction[] {
    try {
      const raw = localStorage.getItem('execution-productions-cache');
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as ExecutionProduction[] : [];
    } catch {
      return [];
    }
  }

  private readHttpError(error: unknown, fallbackMessage: string): string {
    const possibleMessage = (error as { error?: { message?: string; errors?: string[] }; message?: string })?.error?.message
      ?? (error as { message?: string })?.message;

    const firstApiError = (error as { error?: { errors?: string[] } })?.error?.errors?.[0];
    return String(firstApiError ?? possibleMessage ?? '').trim() || fallbackMessage;
  }

  createEtapeGroup(ordre: number) {
    return this.fb.group({
      idEtapeProduction: [null as number | null],
      nom: ['', [Validators.required]],
      ordre: [ordre, [Validators.required]],
      description: ['', [Validators.required]],
      parametres: this.fb.array([this.createParametreGroup()]),
    });
  }

  createParametreGroup() {
    return this.fb.group({
      idParametreEtape: [null as number | null],
      codeParametre: ['', [Validators.required]],
      nom: [''],
      nomPersonnalise: [''],
      uniteMesure: ['', [Validators.required]],
      valeur: ['', [Validators.required]],
      description: ['', [Validators.required]],
    });
  }

  addEtape(): void {
    this.etapes.push(this.createEtapeGroup(this.etapes.length + 1));
  }

  removeEtape(index: number): void {
    if (this.etapes.length <= 1) return;
    this.etapes.removeAt(index);
  }

  addParametre(etapeIndex: number): void {
    this.getParametres(etapeIndex).push(this.createParametreGroup());
  }

  removeParametre(etapeIndex: number, parametreIndex: number): void {
    const parametres = this.getParametres(etapeIndex);
    if (parametres.length <= 1) return;
    parametres.removeAt(parametreIndex);
  }

  onParametreCodeChange(etapeIndex: number, parametreIndex: number): void {
    const group = this.getParametres(etapeIndex).at(parametreIndex);
    const selectedCode = String(group.get('codeParametre')?.value ?? '').trim();
    const customNameControl = group.get('nomPersonnalise');

    if (!customNameControl) {
      return;
    }

    if (selectedCode === this.customParametreCode) {
      group.patchValue({ nom: '' });
      customNameControl.setValidators([Validators.required]);
      customNameControl.updateValueAndValidity();
      return;
    }

    customNameControl.clearValidators();
    customNameControl.setValue('');
    customNameControl.updateValueAndValidity();

    const selectedOption = this.fixedParametreOptions.find((option) => option.code === selectedCode);
    if (!selectedOption) {
      return;
    }

    group.patchValue({
      nom: selectedOption.code,
      uniteMesure: selectedOption.unite,
      description: selectedOption.description,
      valeur: selectedOption.valeur,
    });
  }

  isCustomParamSelected(etapeIndex: number, parametreIndex: number): boolean {
    const selectedCode = this.getParametres(etapeIndex).at(parametreIndex).get('codeParametre')?.value;
    return String(selectedCode ?? '') === this.customParametreCode;
  }

  getParametres(etapeIndex: number): FormArray {
    return this.etapes.at(etapeIndex).get('parametres') as FormArray;
  }

  submitGuide(): void {
    if (this.guideForm.invalid) {
      this.guideForm.markAllAsTouched();
      return;
    }

    const raw = this.guideForm.getRawValue();
    const payload = {
      nom: String(raw.nom ?? '').trim(),
      description: String(raw.description ?? '').trim(),
      dateCreation: String(raw.dateCreation ?? this.today()),
      huilerieId: Number(raw.huilerieId),
      etapes: (raw.etapes ?? []).map((e: any) => ({
        ...(e.idEtapeProduction ? { idEtapeProduction: Number(e.idEtapeProduction) } : {}),
        nom: String(e.nom ?? '').trim(),
        ordre: Number(e.ordre),
        description: String(e.description ?? '').trim(),
        parametres: (e.parametres ?? []).map((p: any) => ({
          ...(p.idParametreEtape ? { idParametreEtape: Number(p.idParametreEtape) } : {}),
          codeParametre: String(p.codeParametre ?? '').trim(),
          nom: this.resolveParametreNom(p),
          uniteMesure: String(p.uniteMesure ?? '').trim(),
          description: String(p.description ?? '').trim(),
          valeur: String(p.valeur ?? '').trim(),
        })),
      })),
    };

    if (this.guideEditingId) {
      const existingGuide = this.guides.find((g) => g.idGuideProduction === this.guideEditingId);
      const selectedHuilerie = this.huileries.find((h) => h.idHuilerie === payload.huilerieId);
      const normalizedEtapes = payload.etapes.map((etape: any) => ({
        ...etape,
        ...(etape.idEtapeProduction ? { idEtapeProduction: Number(etape.idEtapeProduction), idEtape: Number(etape.idEtapeProduction), etapeProductionId: Number(etape.idEtapeProduction) } : {}),
        parametres: (etape.parametres ?? []).map((parametre: any) => ({
          ...parametre,
          ...(parametre.idParametreEtape ? { idParametreEtape: Number(parametre.idParametreEtape), idParametre: Number(parametre.idParametreEtape), parametreEtapeId: Number(parametre.idParametreEtape) } : {}),
        })),
      }));

      const updatePayload = {
        ...payload,
        etapes: normalizedEtapes,
        idGuideProduction: this.guideEditingId,
        id: this.guideEditingId,
        guideProductionId: this.guideEditingId,
        reference: existingGuide?.reference,
        huilerieNom: selectedHuilerie?.nom,
      };

      this.guideProductionService.update(this.guideEditingId, updatePayload as any).subscribe({
        next: () => {
          this.resetGuideForm();
          this.loadGuides();
          this.toastService.success('Guide mis à jour avec succès.');
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error(error?.error?.message ?? 'Erreur lors de la mise à jour du guide.');
        },
      });
    } else {
      this.guideProductionService.create(payload).subscribe({
        next: () => {
          this.resetGuideForm();
          this.loadGuides();
          this.toastService.success('Guide créé avec succès.');
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error(error?.error?.message ?? 'Erreur lors de la sauvegarde du guide.');
        },
      });
    }
  }

  editGuide(guide: GuideProduction): void {
    const etapesArray = this.guideForm.get('etapes') as FormArray;
    while (etapesArray.length > 0) {
      etapesArray.removeAt(0);
    }

    const sourceEtapes = Array.isArray(guide.etapes) ? guide.etapes : [];
    if (sourceEtapes.length === 0) {
      etapesArray.push(this.createEtapeGroup(1));
    } else {
      sourceEtapes.forEach((etape, index) => {
        etapesArray.push(this.createEtapeGroupFromGuide(etape, index + 1));
      });
    }

    this.guideEditingId = guide.idGuideProduction;
    this.guideForm.patchValue({
      nom: guide.nom,
      description: guide.description,
      dateCreation: guide.dateCreation.slice(0, 10),
      huilerieId: guide.huilerieId,
    });
  }

  private createEtapeGroupFromGuide(etape: EtapeProduction, ordreFallback: number) {
    const parametres = Array.isArray(etape.parametres) && etape.parametres.length > 0
      ? etape.parametres.map(param => this.createParametreGroupFromGuide(param))
      : [this.createParametreGroup()];

    return this.fb.group({
      idEtapeProduction: [etape.idEtapeProduction ?? null],
      nom: [String(etape.nom ?? '').trim(), [Validators.required]],
      ordre: [Number(etape.ordre ?? ordreFallback), [Validators.required]],
      description: [String(etape.description ?? '').trim(), [Validators.required]],
      parametres: this.fb.array(parametres),
    });
  }

  private createParametreGroupFromGuide(parametre: ParametreEtape) {
    const isFixedParam = this.isFixedParametreCode(parametre.codeParametre, parametre.nom);
    const codeParametre = isFixedParam
      ? String(parametre.codeParametre ?? parametre.nom ?? '').trim()
      : this.customParametreCode;

    const group = this.fb.group({
      idParametreEtape: [parametre.idParametreEtape ?? null],
      codeParametre: [codeParametre, [Validators.required]],
      nom: [isFixedParam ? String(parametre.nom ?? '').trim() : ''],
      nomPersonnalise: [isFixedParam ? '' : String(parametre.nom ?? '').trim()],
      uniteMesure: [String(parametre.uniteMesure ?? '').trim(), [Validators.required]],
      valeur: [String(parametre.valeur ?? '').trim(), [Validators.required]],
      description: [String(parametre.description ?? '').trim(), [Validators.required]],
    });

    if (!isFixedParam) {
      group.get('nomPersonnalise')?.setValidators([Validators.required]);
      group.get('nomPersonnalise')?.updateValueAndValidity({ emitEvent: false });
    }

    return group;
  }

  private resolveParametreNom(parametre: Record<string, unknown>): string {
    const codeParametre = String(parametre['codeParametre'] ?? '').trim();
    if (codeParametre === this.customParametreCode) {
      return String(parametre['nomPersonnalise'] ?? '').trim();
    }
    return String(parametre['nom'] ?? '').trim();
  }

  private isFixedParametreCode(codeParametre: unknown, nom: unknown): boolean {
    const normalizedCode = String(codeParametre ?? '').trim();
    const normalizedNom = String(nom ?? '').trim();
    return this.fixedParametreOptions.some((option) => option.code === normalizedCode || option.code === normalizedNom);
  }

  async askDeleteGuide(guide: GuideProduction): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer guide',
      message: `Êtes-vous sûr de vouloir supprimer le guide ${guide.nom} et toutes ses étapes ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    const guideToDelete = guide;
    this.guideProductionService.delete(guideToDelete.idGuideProduction).subscribe({
      next: () => {
        if (this.guideEditingId === guideToDelete.idGuideProduction) {
          this.resetGuideForm();
        }
        this.loadGuides();
        this.toastService.success('Guide supprimé avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.error(error?.error?.message ?? 'Erreur lors de la suppression.');
      },
    });
  }

  resetGuideForm(): void {
    this.guideEditingId = null;
    this.guideForm.reset({
      nom: '',
      description: '',
      dateCreation: this.today(),
      huilerieId: this.huileries[0]?.idHuilerie ?? 0,
    });
    const etapesArray = this.guideForm.get('etapes') as FormArray;
    while (etapesArray.length > 0) {
      etapesArray.removeAt(0);
    }
    etapesArray.push(this.createEtapeGroup(1));

  }

  submitExecution(): void {
    if (this.executionForm.invalid) {
      this.executionForm.markAllAsTouched();
      return;
    }

    this.executionError = '';
    const raw = this.executionForm.getRawValue();
    const payload = {
      reference: String(raw.reference ?? '').trim(),
      guideProductionId: Number(raw.guideProductionId),
    };

    if (this.executionEditingId) {
      this.executionProductionService.update(this.executionEditingId, payload as any).subscribe({
        next: () => {
          this.resetExecutionForm();
          this.executionMessage = 'Exécution mise à jour avec succès.';
          this.loadExecutions();
        },
        error: (error: HttpErrorResponse) => {
          this.executionError = error?.error?.message ?? 'Erreur lors de la mise à jour de l\'exécution.';
        },
      });
    } else {
      this.executionProductionService.create(payload as any).subscribe({
        next: () => {
          this.resetExecutionForm();
          this.executionMessage = 'Exécution créée avec succès.';
          this.loadExecutions();
        },
        error: (error: HttpErrorResponse) => {
          this.executionError = error?.error?.message ?? 'Erreur lors de la création de l\'exécution.';
        },
      });
    }
  }

  editExecution(execution: ExecutionProduction): void {
    this.executionEditingId = execution.idExecutionProduction;
    this.executionForm.patchValue({
      reference: execution.reference,
      guideProductionId: execution.guideProductionId,
    });
  }

  askDeleteExecution(execution: ExecutionProduction): void {
    this.pendingExecutionDeletion = execution;
  }

  cancelDeleteExecution(): void {
    this.pendingExecutionDeletion = null;
  }

  confirmDeleteExecution(): void {
    if (!this.pendingExecutionDeletion) return;

    const executionToDelete = this.pendingExecutionDeletion;
    this.executionProductionService.delete(executionToDelete.idExecutionProduction).subscribe({
      next: () => {
        if (this.executionEditingId === executionToDelete.idExecutionProduction) {
          this.resetExecutionForm();
        }
        this.pendingExecutionDeletion = null;
        this.loadExecutions();
      },
      error: (error: HttpErrorResponse) => {
        this.executionError = error?.error?.message ?? 'Erreur lors de la suppression.';
      },
    });
  }

  resetExecutionForm(): void {
    this.executionEditingId = null;
    this.executionMessage = '';
    this.executionError = '';
    this.executionForm.reset({
      reference: '',
      guideProductionId: 0,
    });
  }

  isGuideFieldInvalid(fieldName: string): boolean {
    const control = this.guideForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  isExecutionFieldInvalid(fieldName: string): boolean {
    const control = this.executionForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  trackByGuide(index: number, guide: GuideProduction): number {
    return guide.idGuideProduction;
  }

  trackByExecution(index: number, execution: ExecutionProduction): number {
    return execution.idExecutionProduction;
  }
}
