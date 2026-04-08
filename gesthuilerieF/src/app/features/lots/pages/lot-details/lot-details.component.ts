import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NbCardModule } from '@nebular/theme';
import { LotOlives, AnalyseLaboratoire, TraceabilityEvent } from '../../models/lot.models';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService } from '../../services/lot-management.service';
import { TraceabilityService } from '../../services/traceability.service';
import { AnalyseLaboratoireService } from '../../services/analyse-laboratoire.service';

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

    this.lotManagementService.getPeseesForLot(lotId).subscribe(data => {
      this.pesees = data;
    });

    this.traceabilityService.getLotLifecycle(lotId).subscribe(data => {
      this.events = [...data].sort((a, b) => String(a.date).localeCompare(String(b.date)));
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
}
