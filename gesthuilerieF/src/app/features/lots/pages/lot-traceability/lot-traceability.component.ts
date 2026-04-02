import { Component, OnInit } from '@angular/core';
import { NbCardModule, NbInputModule, NbButtonModule } from '@nebular/theme';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LotOlives, TraceabilityEvent } from '../../models/lot.models';
import { LotManagementService } from '../../services/lot-management.service';
import { RouterModule } from '@angular/router';
import { AnalyseLaboratoireService } from '../../services/analyse-laboratoire.service';
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
    ReactiveFormsModule,
    RouterModule,
  ],
})
export class LotTraceabilityComponent implements OnInit {
  lots: LotOlives[] = [];
  lotSearch = '';
  selectedLotForAnalysis: LotOlives | null = null;
  analysisSaveError = '';
  finalProductsByLot: Record<number, TraceabilityEvent[]> = {};

  readonly analysisForm;

  constructor(
    private lotManagementService: LotManagementService,
    private analyseLaboratoireService: AnalyseLaboratoireService,
    private traceabilityService: TraceabilityService,
    private formBuilder: FormBuilder,
  ) {
    this.analysisForm = this.formBuilder.group({
      acidite: [0.6, [Validators.required, Validators.min(0), Validators.max(10)]],
      indicePeroxyde: [8.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      k232: [1.9, [Validators.required, Validators.min(0), Validators.max(10)]],
      k270: [0.18, [Validators.required, Validators.min(0), Validators.max(10)]],
    });
  }

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

  filteredLots(): LotOlives[] {
    const term = this.lotSearch.trim().toLowerCase();
    if (!term) {
      return this.lots;
    }

    return this.lots.filter(lot =>
      String(lot.idLot).includes(term) ||
      lot.varieteOlive.toLowerCase().includes(term) ||
      lot.origine.toLowerCase().includes(term),
    );
  }

  openAddAnalysis(lot: LotOlives): void {
    this.selectedLotForAnalysis = lot;
    this.analysisSaveError = '';
    this.analysisForm.reset({
      acidite: 0.6,
      indicePeroxyde: 8.0,
      k232: 1.9,
      k270: 0.18,
    });
  }

  closeAddAnalysis(): void {
    this.selectedLotForAnalysis = null;
    this.analysisSaveError = '';
  }

  saveAnalysis(): void {
    if (!this.selectedLotForAnalysis) {
      return;
    }

    if (this.analysisForm.invalid) {
      this.analysisForm.markAllAsTouched();
      return;
    }

    this.analysisSaveError = '';
    const raw = this.analysisForm.getRawValue();

    this.analyseLaboratoireService.addToStore({
      lotId: this.selectedLotForAnalysis.idLot,
      acidite: Number(raw.acidite),
      indicePeroxyde: Number(raw.indicePeroxyde),
      k232: Number(raw.k232),
      k270: Number(raw.k270),
    }).subscribe({
      next: () => {
        this.closeAddAnalysis();
      },
      error: () => {
        this.analysisSaveError = 'Impossible d\'enregistrer l\'analyse.';
      },
    });
  }

  private loadFinalProducts(lots: LotOlives[]): void {
    if (lots.length === 0) {
      this.finalProductsByLot = {};
      return;
    }

    const requests = lots.map(lot =>
      this.traceabilityService.getLotLifecycle(lot.idLot).pipe(
        map(events => events.filter(event => event.etape === 'PRODUIT_FINAL')),
        catchError(() => of([] as TraceabilityEvent[])),
      ),
    );

    forkJoin(requests).subscribe(resultByLot => {
      const byLot: Record<number, TraceabilityEvent[]> = {};
      lots.forEach((lot, index) => {
        byLot[lot.idLot] = resultByLot[index] ?? [];
      });
      this.finalProductsByLot = byLot;
    });
  }

}

