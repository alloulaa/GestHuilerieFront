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
  analysisDraft = {
    acidite_huile_pourcent: 0.6,
    indice_peroxyde_meq_o2_kg: 8,
    polyphenols_mg_kg: 50,
    k232: 1.9,
    k270: 0.18,
  };

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

    let filtered = [...this.allPesees];

    if (fournisseurValue) {
      filtered = filtered.filter((pesee) => {
        const fournisseurNom = String(pesee.fournisseurNom ?? '').toLowerCase();
        const fournisseurCIN = String(pesee.fournisseurCIN ?? '').toLowerCase();
        return fournisseurNom.includes(fournisseurValue) || fournisseurCIN.includes(fournisseurValue);
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
    this.selectedPeseeForAnalysis = pesee;
    this.analysisDraft = {
      acidite_huile_pourcent: 0.6,
      indice_peroxyde_meq_o2_kg: 8,
      polyphenols_mg_kg: 50,
      k232: 1.9,
      k270: 0.18,
    };
  }

  closeAddAnalysis(): void {
    this.selectedPeseeForAnalysis = null;
    this.analysisSaveError = '';
  }

  saveAnalysis(): void {
    const lotId = Number(this.selectedPeseeForAnalysis?.lotId ?? 0);
    if (!lotId) {
      this.analysisSaveError = 'Lot introuvable.';
      return;
    }

    const acidite_huile_pourcent = Number(this.analysisDraft.acidite_huile_pourcent);
    const indice_peroxyde_meq_o2_kg = Number(this.analysisDraft.indice_peroxyde_meq_o2_kg);
    const polyphenols_mg_kg = Number(this.analysisDraft.polyphenols_mg_kg);
    const k232 = Number(this.analysisDraft.k232);
    const k270 = Number(this.analysisDraft.k270);

    const hasInvalidNumber = [acidite_huile_pourcent, indice_peroxyde_meq_o2_kg, polyphenols_mg_kg, k232, k270].some((value) => Number.isNaN(value) || value < 0);
    if (hasInvalidNumber) {
      this.analysisSaveError = 'Veuillez saisir des valeurs d\'analyse valides.';
      return;
    }

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
}
