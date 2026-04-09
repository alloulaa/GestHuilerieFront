import { Component, OnInit } from '@angular/core';
import { NbCardModule, NbInputModule, NbButtonModule } from '@nebular/theme';
import { NgFor, NgIf } from '@angular/common';
import { LotOlives, TraceabilityEvent } from '../../models/lot.models';
import { LotManagementService } from '../../services/lot-management.service';
import { RouterModule } from '@angular/router';
import { TraceabilityService } from '../../services/traceability.service';
import { catchError } from 'rxjs/operators';
import { forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'app-lot-traceability',
  templateUrl: './lot-traceability.component.html',
  styleUrls: ['./lot-traceability.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    NgFor,
    NgIf,
    RouterModule,
  ],
})
export class LotTraceabilityComponent implements OnInit {
  lots: LotOlives[] = [];
  lotSearch = '';
  lifecycleByLot: Record<number, TraceabilityEvent[]> = {};
  finalProductsByLot: Record<number, TraceabilityEvent[]> = {};

  constructor(
    private lotManagementService: LotManagementService,
    private traceabilityService: TraceabilityService,
  ) { }

  ngOnInit(): void {
    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.lots$.subscribe(data => {
        this.lots = data;
        this.loadFinalProducts(data);
      });
    });
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

    const requests = lots.map(lot =>
      this.traceabilityService.getLotLifecycle(lot.idLot).pipe(
        map(events => [...events].sort((a, b) => String(a.date).localeCompare(String(b.date)))),
        catchError(() => of([] as TraceabilityEvent[])),
      ),
    );

    forkJoin(requests).subscribe(resultByLot => {
      const lifecycleMap: Record<number, TraceabilityEvent[]> = {};
      const byLot: Record<number, TraceabilityEvent[]> = {};
      lots.forEach((lot, index) => {
        const lifecycle = resultByLot[index] ?? [];
        lifecycleMap[lot.idLot] = lifecycle;
        byLot[lot.idLot] = lifecycle.filter(event => event.etape === 'PRODUIT_FINAL');
      });
      this.lifecycleByLot = lifecycleMap;
      this.finalProductsByLot = byLot;
    });
  }

}

