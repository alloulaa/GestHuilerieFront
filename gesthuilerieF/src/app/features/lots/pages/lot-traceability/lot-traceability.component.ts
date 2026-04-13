import { Component, OnInit } from '@angular/core';
import { NbCardModule, NbInputModule, NbButtonModule } from '@nebular/theme';
import { NgFor, NgIf } from '@angular/common';
import { LotOlives, TraceabilityEvent } from '../../models/lot.models';
import { LotManagementService } from '../../services/lot-management.service';
import { RouterModule } from '@angular/router';
import { ExecutionProductionService } from '../../../production/services/execution-production.service';
import { ExecutionProduction } from '../../../production/models/production.models';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-lot-traceability',
  templateUrl: './lot-traceability.component.html',
  styleUrls: ['./lot-traceability.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    FormsModule,
    NgFor,
    NgIf,
    RouterModule,
  ],
})
export class LotTraceabilityComponent implements OnInit {
  private readonly executionCacheKey = 'execution-productions-cache';

  lots: LotOlives[] = [];
  lotSearch = '';
  selectedHuilerieNom = '';
  lifecycleByLot: Record<number, TraceabilityEvent[]> = {};
  finalProductsByLot: Record<number, TraceabilityEvent[]> = {};

  constructor(
    private lotManagementService: LotManagementService,
    private executionProductionService: ExecutionProductionService,
    private permissionService: PermissionService,
  ) { }

  get isAdmin(): boolean {
    return this.permissionService.isAdmin();
  }

  ngOnInit(): void {
    this.lotManagementService.lots$.subscribe(data => {
      this.lots = data;
      this.loadFinalProducts(data);
    });

    this.reloadLots();
  }

  applyFilters(): void {
    if (this.isAdmin) {
      this.reloadLots();
    }
  }

  resetFilters(): void {
    this.selectedHuilerieNom = '';
    this.lotSearch = '';
    this.reloadLots();
  }

  private reloadLots(): void {
    const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
    this.lotManagementService.loadInitialData(huilerieNom).subscribe();
  }

  getFinalProducts(lotId: number): TraceabilityEvent[] {
    return this.finalProductsByLot[lotId] ?? [];
  }

  getLifecycle(lotId: number): TraceabilityEvent[] {
    return this.lifecycleByLot[lotId] ?? [];
  }

  stageLabel(stage: TraceabilityEvent['etape']): string {
    if (stage === 'LOT_OLIVES') {
      return 'Reception lot';
    }
    if (stage === 'PESEE') {
      return 'Pesee';
    }
    if (stage === 'PRODUCTION') {
      return 'Production';
    }
    if (stage === 'PRODUIT_FINAL') {
      return 'Produit final';
    }
    return 'Stock';
  }

  filteredLots(): LotOlives[] {
    const term = this.lotSearch.trim().toLowerCase();
    if (!term) {
      return this.lots;
    }

    return this.lots.filter(lot =>
      String(lot.idLot).includes(term) ||
      String(lot.reference ?? '').toLowerCase().includes(term) ||
      lot.varieteOlive.toLowerCase().includes(term) ||
      lot.origine.toLowerCase().includes(term),
    );
  }

  lotReference(lot: LotOlives): string {
    return lot.reference || (`LO-${lot.idLot}`);
  }

  private loadFinalProducts(lots: LotOlives[]): void {
    if (lots.length === 0) {
      this.finalProductsByLot = {};
      return;
    }

    const cachedExecutions = this.readCachedExecutions();
    const executions = cachedExecutions.length > 0 ? cachedExecutions : [];

    const lifecycleMap: Record<number, TraceabilityEvent[]> = {};
    const byLot: Record<number, TraceabilityEvent[]> = {};

    const finalProductsFromExecutions = (executions ?? [])
      .filter((execution) => Number(execution.lotOlivesId ?? 0) > 0)
      .filter((execution) => !!String(execution.produitFinalReference ?? execution.produitFinalCode ?? '').trim())
      .map((execution) => ({
        lotId: Number(execution.lotOlivesId),
        event: {
          date: String(execution.dateFinReelle ?? execution.dateFinPrevue ?? execution.dateDebut ?? ''),
          etape: 'PRODUIT_FINAL' as const,
          description: String(execution.produitFinalNomProduit ?? execution.observations ?? 'Produit final créé').trim(),
          reference: String(execution.produitFinalReference ?? execution.produitFinalCode ?? '').trim(),
        },
      }));

    lots.forEach((lot) => {
      const executionFinalProducts = finalProductsFromExecutions
        .filter((entry) => entry.lotId === lot.idLot)
        .map((entry) => entry.event);

      const mergedFinalProducts = [...executionFinalProducts]
        .filter((event, position, all) => {
          const key = `${event.reference}|${event.date}`;
          return all.findIndex((candidate) => `${candidate.reference}|${candidate.date}` === key) === position;
        });

      lifecycleMap[lot.idLot] = [];
      byLot[lot.idLot] = mergedFinalProducts;
    });
    this.lifecycleByLot = lifecycleMap;
    this.finalProductsByLot = byLot;
  }

  private readCachedExecutions(): ExecutionProduction[] {
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

}

