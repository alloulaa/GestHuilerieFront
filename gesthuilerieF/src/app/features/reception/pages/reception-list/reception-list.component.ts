import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService } from '../../../lots/services/lot-management.service';
import { LotOlives } from '../../../lots/models/lot.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { AnalyseLaboratoireService } from '../../../lots/services/analyse-laboratoire.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NbButtonModule, NbIconModule } from '@nebular/theme';
import { LAB_ANALYSIS_STANDARDS } from '../../../../shared/constants/lab-analysis-standards';

type AnalysisFieldKey = 'acidite_huile_pourcent' | 'indice_peroxyde_meq_o2_kg' | 'polyphenols_mg_kg' | 'k232' | 'k270';

const ANALYSIS_FIELDS: AnalysisFieldKey[] = [
  'acidite_huile_pourcent',
  'indice_peroxyde_meq_o2_kg',
  'polyphenols_mg_kg',
  'k232',
  'k270',
];

interface AnalysisDraft {
  acidite_huile_pourcent: number | null;
  indice_peroxyde_meq_o2_kg: number | null;
  polyphenols_mg_kg: number | null;
  k232: number | null;
  k270: number | null;
}

@Component({
  selector: 'app-reception-list',
  standalone: true,
  templateUrl: './reception-list.component.html',
  styleUrls: ['./reception-list.component.scss'],
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, NbButtonModule, NbIconModule],
})
export class ReceptionListComponent implements OnInit {
  @Input() showFilters = true;
  @Output() editPesee = new EventEmitter<Pesee>();
  @Output() deletePesee = new EventEmitter<Pesee>();

  allPesees: Pesee[] = [];
  pesees: Pesee[] = [];
  private lotsById = new Map<number, LotOlives>();
  lotSearchValue = '';
  fournisseurSearchValue = '';
  selectedHuilerieNom = '';
  filterMessage = '';
  selectedPeseeForAnalysis: Pesee | null = null;
  analysisSaveError = '';
  analysisDraft: AnalysisDraft = this.createDefaultAnalysisDraft();
  analysisErrors: Partial<Record<AnalysisFieldKey, string>> = {};
  private analysisToastState: Partial<Record<AnalysisFieldKey, string>> = {};

  // Lab analysis standards for Tunisia
  labStandards = LAB_ANALYSIS_STANDARDS;

  constructor(
    private lotManagementService: LotManagementService,
    private permissionService: PermissionService,
    private analyseLaboratoireService: AnalyseLaboratoireService,
    private toastService: ToastService,
  ) { }

  get isAdmin(): boolean {
    return this.permissionService.isAdmin();
  }

  ngOnInit(): void {
    this.reloadPesees();
    this.lotManagementService.lots$.subscribe((lots) => {
      this.lotsById = new Map(
        (lots ?? []).map((lot) => [Number(lot.idLot), lot] as [number, LotOlives]),
      );
    });

    this.lotManagementService.weighings$.subscribe(data => {
      this.allPesees = data;
      this.applyCombinedFilter();
    });
  }

  getLotValue(pesee: Pesee, key: 'region' | 'methodeRecolte' | 'typeSol' | 'tempsDepuisRecolteHeures'): string {
    const lot = this.lotsById.get(Number(pesee?.lotId ?? 0));
    if (!lot) {
      return '-';
    }

    const value = lot[key];
    if (value == null || String(value).trim() === '') {
      return '-';
    }

    return String(value);
  }

  applyFilters(): void {
    this.reloadPesees();
  }

  resetFilters(): void {
    this.selectedHuilerieNom = '';
    this.lotSearchValue = '';
    this.fournisseurSearchValue = '';
    this.filterMessage = '';
    this.reloadPesees();
  }

  onFilterInputChange(): void {
    this.applyCombinedFilter();
  }

  private applyCombinedFilter(): void {
    const searchValue = String(this.lotSearchValue ?? '').trim();
    const fournisseurValue = String(this.fournisseurSearchValue ?? '').trim().toLowerCase();
    this.filterMessage = '';

let filtered = [...this.allPesees].reverse();

    if (fournisseurValue) {
      filtered = filtered.filter((pesee) => {
        const fournisseurId = String(pesee.fournisseurId ?? '').toLowerCase();
        const fournisseurNom = String(pesee.fournisseurNom ?? '').toLowerCase();
        const fournisseurCIN = String(pesee.fournisseurCIN ?? '').toLowerCase();
        return fournisseurId.includes(fournisseurValue)
          || fournisseurNom.includes(fournisseurValue)
          || fournisseurCIN.includes(fournisseurValue);
      });
    }

    if (searchValue) {
      const lotId = Number(searchValue);
      if (Number.isNaN(lotId) || lotId <= 0) {
        this.filterMessage = 'Veuillez saisir un identifiant de lot valide.';
      } else {
        filtered = filtered.filter((pesee) => Number(pesee.lotId) === lotId);
      }
    }

    this.pesees = filtered;

    if (filtered.length === 0 && (searchValue || fournisseurValue)) {
      this.filterMessage = 'Aucune reception trouvee pour les filtres saisis.';
    }
  }

  private reloadPesees(): void {
    const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
    this.lotManagementService.loadInitialData(huilerieNom).subscribe();
  }

  openAddAnalysis(pesee: Pesee): void {
    if (!pesee?.lotId) {
      this.toastService.error('Lot introuvable pour cette reception.');
      return;
    }

    this.analysisSaveError = '';
    this.analysisErrors = {};
    this.analysisToastState = {};
    this.selectedPeseeForAnalysis = pesee;
    this.analysisDraft = this.createDefaultAnalysisDraft();
  }

  closeAddAnalysis(): void {
    this.selectedPeseeForAnalysis = null;
    this.analysisSaveError = '';
    this.analysisErrors = {};
    this.analysisToastState = {};
  }

  onAnalysisFieldChange(field: AnalysisFieldKey, value: number | string | null): void {
    this.analysisDraft = {
      ...this.analysisDraft,
      [field]: value,
    };
    this.analysisSaveError = '';
    this.validateAnalysisField(field, true);
  }

  saveAnalysis(): void {
    const lotId = Number(this.selectedPeseeForAnalysis?.lotId ?? 0);
    if (!lotId) {
      this.analysisSaveError = 'Lot introuvable.';
      return;
    }

    const validationErrors = this.validateAllAnalysisFields(true);
    if (validationErrors.length > 0) {
      this.analysisSaveError = validationErrors[0] ?? 'Corrigez les champs en rouge avant l\'enregistrement.';
      return;
    }

    const acidite_huile_pourcent = Number(this.analysisDraft.acidite_huile_pourcent);
    const indice_peroxyde_meq_o2_kg = Number(this.analysisDraft.indice_peroxyde_meq_o2_kg);
    const polyphenols_mg_kg = Number(this.analysisDraft.polyphenols_mg_kg);
    const k232 = Number(this.analysisDraft.k232);
    const k270 = Number(this.analysisDraft.k270);

    this.analysisSaveError = '';
    this.analyseLaboratoireService.addToStore({
      lotId,
      acidite_huile_pourcent,
      indice_peroxyde_meq_o2_kg,
      polyphenols_mg_kg,
      k232,
      k270,
      dateAnalyse: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => {
        this.toastService.success('Analyse laboratoire enregistree avec succes.');
        this.closeAddAnalysis();
      },
      error: () => {
        this.analysisSaveError = 'Impossible d\'enregistrer l\'analyse.';
        this.toastService.error(this.analysisSaveError);
      },
    });
  }

  triggerEdit(pesee: Pesee): void {
    this.editPesee.emit(pesee);
  }

  triggerDelete(pesee: Pesee): void {
    this.deletePesee.emit(pesee);
  }

  getAnalysisError(field: AnalysisFieldKey): string | null {
    return this.analysisErrors[field] ?? null;
  }

  isAnalysisFieldInvalid(field: AnalysisFieldKey): boolean {
    return Boolean(this.analysisErrors[field]);
  }

  private validateAllAnalysisFields(announceToast: boolean): string[] {
    const errors: string[] = [];

    ANALYSIS_FIELDS.forEach((field) => {
      const error = this.validateAnalysisField(field, announceToast && errors.length === 0);
      if (error) {
        errors.push(error);
      }
    });

    return errors;
  }

  private validateAnalysisField(field: AnalysisFieldKey, announceToast: boolean): string | null {
    const standard = this.labStandards.find((item) => item.code === field);
    const rawValue = this.analysisDraft[field];

    if (!standard || rawValue === null || rawValue === undefined) {
      delete this.analysisErrors[field];
      delete this.analysisToastState[field];
      return null;
    }

    const value = Number(rawValue);
    if (Number.isNaN(value)) {
      const message = `${standard.label} invalide : veuillez saisir une valeur numérique. Intervalle attendu: ${this.formatAnalysisInterval(standard)}.`;
      this.analysisErrors[field] = message;
      this.raiseToastIfNeeded(field, message, announceToast);
      return message;
    }

    if (value < standard.min || value > standard.max) {
      const message = `${standard.label} invalide : la valeur doit être comprise entre ${this.formatAnalysisInterval(standard)}.`;
      this.analysisErrors[field] = message;
      this.raiseToastIfNeeded(field, message, announceToast);
      return message;
    }

    delete this.analysisErrors[field];
    delete this.analysisToastState[field];
    return null;
  }

  private raiseToastIfNeeded(field: AnalysisFieldKey, message: string, announceToast: boolean): void {
    if (!announceToast || this.analysisToastState[field] === message) {
      return;
    }

    this.analysisToastState[field] = message;
    this.toastService.error(message);
  }

  private createDefaultAnalysisDraft(): AnalysisDraft {
    return {
      acidite_huile_pourcent: 0.6,
      indice_peroxyde_meq_o2_kg: 8,
      polyphenols_mg_kg: 250,
      k232: 2.1,
      k270: 0.18,
    };
  }

  private formatAnalysisInterval(standard: { min: number; max: number; unit: string }): string {
    return standard.unit ? `${standard.min} et ${standard.max} ${standard.unit}` : `${standard.min} et ${standard.max}`;
  }
}
