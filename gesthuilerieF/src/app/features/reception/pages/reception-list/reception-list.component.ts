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
  lotSearchValue = '';
  fournisseurSearchValue = '';
  selectedHuilerieNom = '';
  filterMessage = '';
  selectedPeseeForAnalysis: Pesee | null = null;
  analysisSaveError = '';
  analysisDraft = {
    acidite: 0.6,
    indicePeroxyde: 8,
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
    this.lotManagementService.weighings$.subscribe(data => {
      this.allPesees = data;
      this.applyCombinedFilter();
    });
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
      acidite: 0.6,
      indicePeroxyde: 8,
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

    const acidite = Number(this.analysisDraft.acidite);
    const indicePeroxyde = Number(this.analysisDraft.indicePeroxyde);
    const k232 = Number(this.analysisDraft.k232);
    const k270 = Number(this.analysisDraft.k270);

    const hasInvalidNumber = [acidite, indicePeroxyde, k232, k270].some((value) => Number.isNaN(value) || value < 0);
    if (hasInvalidNumber) {
      this.analysisSaveError = 'Veuillez saisir des valeurs d\'analyse valides.';
      return;
    }

    this.analysisSaveError = '';
    this.analyseLaboratoireService.addToStore({
      lotId,
      acidite,
      indicePeroxyde,
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
