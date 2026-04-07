import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { NbButtonModule, NbCardModule } from '@nebular/theme';
import { ExecutionProduction, GuideProduction } from '../../models/production.models';
import { ExecutionProductionService } from '../../services/execution-production.service';
import { GuideProductionService } from '../../services/guide-production.service';

@Component({
  selector: 'app-guides-consulter',
  standalone: true,
  templateUrl: './guides-consulter.component.html',
  styleUrls: ['./production-guides.component.scss'],
  imports: [CommonModule, NbCardModule, NbButtonModule],
})
export class GuidesConsulterComponent implements OnInit {
  guides: GuideProduction[] = [];
  executions: ExecutionProduction[] = [];

  selectedGuideId: number | null = null;
  selectedExecutionId: number | null = null;

  executionMessage = '';
  executionError = '';
  creatingProduitFinal = false;

  constructor(
    @Inject(forwardRef(() => GuideProductionService))
    private guideProductionService: GuideProductionService,
    @Inject(forwardRef(() => ExecutionProductionService))
    private executionProductionService: ExecutionProductionService,
  ) {}

  ngOnInit(): void {
    this.reloadGuides();
    this.reloadExecutions();
  }

  get selectedGuide(): GuideProduction | undefined {
    return this.guides.find((guide) => guide.idGuideProduction === this.selectedGuideId);
  }

  get selectedExecution(): ExecutionProduction | undefined {
    return this.executions.find((execution) => execution.idExecutionProduction === this.selectedExecutionId);
  }

  selectGuide(guide: GuideProduction): void {
    this.selectedGuideId = guide.idGuideProduction;
  }

  closeGuideDetails(): void {
    this.selectedGuideId = null;
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

  private readHttpError(error: unknown, fallbackMessage: string): string {
    const possibleMessage = (error as { error?: { message?: string }; message?: string })?.error?.message
      ?? (error as { message?: string })?.message;

    return possibleMessage ? String(possibleMessage) : fallbackMessage;
  }
}
