import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NbCardModule } from '@nebular/theme';
import { LotOlives, AnalyseLaboratoire, TraceabilityEvent } from '../../models/lot.models';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService } from '../../services/lot-management.service';
import { TraceabilityService } from '../../services/traceability.service';
import { AnalyseLaboratoireService } from '../../services/analyse-laboratoire.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-lot-details',
  templateUrl: './lot-details.component.html',
  styleUrls: ['./lot-details.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, NbCardModule],
})
export class LotDetailsComponent implements OnInit {
  lot: LotOlives | null = null;
  pesees: Pesee[] = [];
  events: TraceabilityEvent[] = [];
  analyses: AnalyseLaboratoire[] = [];
  traceabilityErrorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private lotManagementService: LotManagementService,
    private traceabilityService: TraceabilityService,
    private analyseLaboratoireService: AnalyseLaboratoireService,
  ) { }

  ngOnInit(): void {
    const lotId = Number(this.route.snapshot.paramMap.get('id'));
    if (!lotId) return;

    this.lotManagementService.getLotById(lotId).subscribe(lot => {
      this.lot = lot ?? null;
    });

    this.traceabilityService.getLotTraceability(lotId).subscribe({
      next: (dto) => {
        this.traceabilityErrorMessage = '';
        this.pesees = (dto.pesees ?? []).map((pesee) => ({
          ...pesee,
          datePesee: pesee.date,
          lotId: dto.lotId,
        } as Pesee));
        this.events = [...(dto.cycleVie ?? [])]
          .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      },
      error: (error: HttpErrorResponse) => {
        this.pesees = [];
        this.events = [];

        if (error.status === 403) {
          this.traceabilityErrorMessage = 'Lot hors périmètre de votre huilerie';
          return;
        }

        if (error.status === 404) {
          this.traceabilityErrorMessage = 'Lot introuvable';
          return;
        }

        this.traceabilityErrorMessage = 'Une erreur est survenue lors du chargement de la traçabilité du lot.';
        console.error('[lot-details] traceability request failed', error);
      },
    });

    this.analyseLaboratoireService.getByLot(lotId).subscribe(data => {
      this.analyses = data;
    });
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

  lotReference(lot: LotOlives): string {
    return lot.reference || (`LO-${lot.idLot}`);
  }

  analysisReference(analysis: AnalyseLaboratoire): string {
    return analysis.reference || (`AL-${analysis.idAnalyse}`);
  }
}
