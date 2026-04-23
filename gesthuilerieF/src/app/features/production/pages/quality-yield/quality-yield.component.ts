import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbCardModule, NbInputModule, NbButtonModule, NbSelectModule, NbIconModule } from '@nebular/theme';
import { LotOlives, AnalyseLaboratoire } from '../../../lots/models/lot.models';
import { LotOlivesService } from '../../../lots/services/lot-olives.service';
import { AnalyseLaboratoireService } from '../../../lots/services/analyse-laboratoire.service';

@Component({
  selector: 'app-quality-yield',
  templateUrl: './quality-yield.component.html',
  styleUrls: ['./quality-yield.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    NbSelectModule,
    NbIconModule,
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class QualityYieldComponent implements OnInit {
  lots: LotOlives[] = [];
  analyses: AnalyseLaboratoire[] = [];

  editingLotId: number | null = null;
  editingAnalysisId: number | null = null;
  selectedLotId: number | null = null;

  readonly lotForm;
  readonly analysisForm;

  constructor(
    private formBuilder: FormBuilder,
    private lotOlivesService: LotOlivesService,
    private analysisService: AnalyseLaboratoireService,
  ) {
    this.lotForm = this.formBuilder.group({
      varieteOlive: ['', [Validators.required]],
      maturite: ['', [Validators.required]],
      origine: ['', [Validators.required]],
      dateRecolte: ['', [Validators.required]],
      dateReception: ['', [Validators.required]],
      dureeStockageAvantBroyage: [0, [Validators.required, Validators.min(0)]],
      quantiteInitiale: [0, [Validators.required, Validators.min(1)]],
      quantiteRestante: [0, [Validators.required, Validators.min(0)]],
      matierePremiereId: [1, [Validators.required]],
      campagneId: [2026, [Validators.required]],
    });

    this.analysisForm = this.formBuilder.group({
      acidite_huile_pourcent: [0.6, [Validators.required, Validators.min(0), Validators.max(10)]],
      indice_peroxyde_meq_o2_kg: [8.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      polyphenols_mg_kg: [50.0, [Validators.required, Validators.min(0), Validators.max(10000)]],
      k232: [1.9, [Validators.required, Validators.min(0), Validators.max(10)]],
      k270: [0.18, [Validators.required, Validators.min(0), Validators.max(10)]],
      lotId: [31, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.lotOlivesService.getAll().subscribe((data: LotOlives[]) => {
      this.lots = data;
      if (this.lots.length > 0 && !this.selectedLotId) {
        this.selectedLotId = this.lots[0].idLot;
        if (this.selectedLotId !== null) {
          this.loadAnalysesForLot(this.selectedLotId);
        }
      }
    });
  }

  submitLot(): void {
    if (this.lotForm.invalid) {
      this.lotForm.markAllAsTouched();
      return;
    }

    const payload = this.lotForm.getRawValue();
    if (this.editingLotId !== null) {
      this.lots = this.lots.map(l =>
        l.idLot === this.editingLotId
          ? {
            ...l,
            varieteOlive: payload.varieteOlive ?? l.varieteOlive,
            maturite: payload.maturite ?? l.maturite,
            origine: payload.origine ?? l.origine,
            dateRecolte: payload.dateRecolte ?? l.dateRecolte,
            dateReception: payload.dateReception ?? l.dateReception,
            dureeStockageAvantBroyage: Number(payload.dureeStockageAvantBroyage),
            quantiteInitiale: Number(payload.quantiteInitiale),
            quantiteRestante: Number(payload.quantiteRestante),
            matierePremiereId: Number(payload.matierePremiereId),
            campagneId: Number(payload.campagneId),
          }
          : l,
      );
    } else {
      const newId = Math.max(...this.lots.map(l => l.idLot), 0) + 1;
      this.lots = [
        ...this.lots,
        {
          idLot: newId,
          varieteOlive: payload.varieteOlive ?? '',
          maturite: payload.maturite ?? '',
          origine: payload.origine ?? '',
          dateRecolte: payload.dateRecolte ?? '',
          dateReception: payload.dateReception ?? '',
          dureeStockageAvantBroyage: Number(payload.dureeStockageAvantBroyage),
          quantiteInitiale: Number(payload.quantiteInitiale),
          quantiteRestante: Number(payload.quantiteRestante),
          matierePremiereId: Number(payload.matierePremiereId),
          campagneId: Number(payload.campagneId),
        },
      ];
    }

    this.resetLotForm();
  }

  editLot(lot: LotOlives): void {
    this.editingLotId = lot.idLot;
    this.selectedLotId = lot.idLot;
    this.lotForm.patchValue({
      varieteOlive: lot.varieteOlive,
      maturite: lot.maturite,
      origine: lot.origine,
      dateRecolte: lot.dateRecolte,
      dateReception: lot.dateReception,
      dureeStockageAvantBroyage: lot.dureeStockageAvantBroyage,
      quantiteInitiale: lot.quantiteInitiale,
      quantiteRestante: lot.quantiteRestante,
      matierePremiereId: lot.matierePremiereId,
      campagneId: lot.campagneId,
    });
    this.loadAnalysesForLot(lot.idLot);
  }

  deleteLot(lot: LotOlives): void {
    this.lots = this.lots.filter(l => l.idLot !== lot.idLot);
    this.analyses = this.analyses.filter(a => a.lotId !== lot.idLot);
    if (this.editingLotId === lot.idLot) {
      this.resetLotForm();
    }
    if (this.selectedLotId === lot.idLot && this.lots.length > 0) {
      this.selectedLotId = this.lots[0].idLot;
      if (this.selectedLotId !== null) {
        this.loadAnalysesForLot(this.selectedLotId);
      }
    }
  }

  resetLotForm(): void {
    this.editingLotId = null;
    this.lotForm.reset({
      varieteOlive: '',
      maturite: '',
      origine: '',
      dateRecolte: '',
      dateReception: '',
      dureeStockageAvantBroyage: 0,
      quantiteInitiale: 0,
      quantiteRestante: 0,
      matierePremiereId: 1,
      campagneId: 2026,
    });
  }

  loadAnalysesForLot(lotId: number): void {
    this.selectedLotId = lotId;
    this.analysisForm.patchValue({ lotId });
  }

  submitAnalysis(): void {
    if (this.analysisForm.invalid) {
      this.analysisForm.markAllAsTouched();
      return;
    }

    const payload = this.analysisForm.getRawValue();

    if (this.editingAnalysisId !== null) {
      this.analyses = this.analyses.map(a =>
        a.idAnalyse === this.editingAnalysisId
          ? {
            ...a,
            acidite_huile_pourcent: Number(payload.acidite_huile_pourcent ?? 0),
            indice_peroxyde_meq_o2_kg: Number(payload.indice_peroxyde_meq_o2_kg ?? 0),
            polyphenols_mg_kg: Number(payload.polyphenols_mg_kg ?? 0),
            k232: Number(payload.k232 ?? 0),
            k270: Number(payload.k270 ?? 0),
            dateAnalyse: new Date().toISOString().split('T')[0],
          }
          : a,
      );
    } else {
      const newId = Math.max(...this.analyses.map(a => a.idAnalyse), 0) + 1;
      this.analyses = [
        ...this.analyses,
        {
          idAnalyse: newId,
          acidite_huile_pourcent: Number(payload.acidite_huile_pourcent ?? 0),
          indice_peroxyde_meq_o2_kg: Number(payload.indice_peroxyde_meq_o2_kg ?? 0),
          polyphenols_mg_kg: Number(payload.polyphenols_mg_kg ?? 0),
          k232: Number(payload.k232 ?? 0),
          k270: Number(payload.k270 ?? 0),
          dateAnalyse: new Date().toISOString().split('T')[0],
          lotId: Number(payload.lotId ?? 31),
        },
      ];
    }

    this.resetAnalysisForm();
  }

  editAnalysis(analysis: AnalyseLaboratoire): void {
    this.editingAnalysisId = analysis.idAnalyse;
    this.analysisForm.patchValue({
      acidite_huile_pourcent: analysis.acidite_huile_pourcent,
      indice_peroxyde_meq_o2_kg: analysis.indice_peroxyde_meq_o2_kg,
      polyphenols_mg_kg: analysis.polyphenols_mg_kg,
      k232: analysis.k232,
      k270: analysis.k270,
      lotId: analysis.lotId,
    });
  }

  deleteAnalysis(analysis: AnalyseLaboratoire): void {
    this.analyses = this.analyses.filter(a => a.idAnalyse !== analysis.idAnalyse);
    if (this.editingAnalysisId === analysis.idAnalyse) {
      this.resetAnalysisForm();
    }
  }

  resetAnalysisForm(): void {
    this.editingAnalysisId = null;
    const lotId = this.selectedLotId ?? 31;
    this.analysisForm.reset({
      acidite_huile_pourcent: 0.6,
      indice_peroxyde_meq_o2_kg: 8.0,
      polyphenols_mg_kg: 50.0,
      k232: 1.9,
      k270: 0.18,
      lotId,
    });
  }

  getAnalysesForLot(lotId: number): AnalyseLaboratoire[] {
    return this.analyses.filter(a => a.lotId === lotId);
  }
}
