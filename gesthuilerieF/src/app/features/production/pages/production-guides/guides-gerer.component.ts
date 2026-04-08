import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbIconModule, NbInputModule, NbSelectModule } from '@nebular/theme';
import { HttpErrorResponse } from '@angular/common/http';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { GuideProduction, ExecutionProduction } from '../../models/production.models';
import { GuideProductionService } from '../../services/guide-production.service';
import { ExecutionProductionService } from '../../services/execution-production.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

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

  readonly guideForm;
  readonly executionForm;

  constructor(
    private fb: FormBuilder,
    private guideProductionService: GuideProductionService,
    private executionProductionService: ExecutionProductionService,
    private huilerieService: HuilerieService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
  ) {
    this.guideForm = this.fb.group({
      nom: ['', [Validators.required]],
      description: ['', [Validators.required]],
      dateCreation: [this.today(), [Validators.required]],
      huilerieId: [0, [Validators.required, Validators.min(1)]],
      etapes: this.fb.array([
        this.createEtapeGroup(1),
        this.createEtapeGroup(2),
      ]),
    });

    this.executionForm = this.fb.group({
      codeLot: ['', [Validators.required]],
      guideProductionId: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
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
      this.executions = data;
    });
  }

  createEtapeGroup(ordre: number) {
    return this.fb.group({
      nom: ['', [Validators.required]],
      ordre: [ordre, [Validators.required]],
      description: ['', [Validators.required]],
      parametres: this.fb.array([this.createParametreGroup()]),
    });
  }

  createParametreGroup() {
    return this.fb.group({
      nom: ['', [Validators.required]],
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
        nom: String(e.nom ?? '').trim(),
        ordre: Number(e.ordre),
        description: String(e.description ?? '').trim(),
        parametres: (e.parametres ?? []).map((p: any) => ({
          nom: String(p.nom ?? '').trim(),
          uniteMesure: String(p.uniteMesure ?? '').trim(),
          description: String(p.description ?? '').trim(),
          valeur: String(p.valeur ?? '').trim(),
        })),
      })),
    };

    if (this.guideEditingId) {
      this.guideProductionService.update(this.guideEditingId, payload).subscribe({
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
    this.guideEditingId = guide.idGuideProduction;
    this.guideForm.patchValue({
      nom: guide.nom,
      description: guide.description,
      dateCreation: guide.dateCreation.slice(0, 10),
      huilerieId: guide.huilerieId,
    });
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
    etapesArray.push(this.createEtapeGroup(2));
  }

  submitExecution(): void {
    if (this.executionForm.invalid) {
      this.executionForm.markAllAsTouched();
      return;
    }

    this.executionError = '';
    const raw = this.executionForm.getRawValue();
    const payload = {
      codeLot: String(raw.codeLot ?? '').trim(),
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
      codeLot: execution.codeLot,
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
      codeLot: '',
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
