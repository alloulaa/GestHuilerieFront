import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbCardModule, NbButtonModule, NbIconModule, NbInputModule } from '@nebular/theme';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService } from '../../../lots/services/lot-management.service';

@Component({
  selector: 'app-reception-consulter',
  standalone: true,
  templateUrl: './reception-consulter.component.html',
  styleUrls: ['./reception-consulter.component.scss'],
  imports: [CommonModule, FormsModule, NbCardModule, NbButtonModule, NbIconModule, NbInputModule],
})
export class ReceptionConsulterComponent implements OnInit {
  pesees: Pesee[] = [];
  filteredPesees: Pesee[] = [];
  lotSearchValue = '';
  filterMessage = '';

  constructor(private lotManagementService: LotManagementService) { }

  ngOnInit(): void {
    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.weighings$.subscribe(data => {
        this.pesees = data;
        this.filteredPesees = data;
      });
    });
  }

  filterByLot(): void {
    const searchValue = String(this.lotSearchValue ?? '').trim();
    this.filterMessage = '';

    if (!searchValue) {
      this.filteredPesees = this.pesees;
      return;
    }

    const lotId = Number(searchValue);
    if (Number.isNaN(lotId) || lotId <= 0) {
      this.filterMessage = 'Veuillez saisir un identifiant de lot valide.';
      this.filteredPesees = this.pesees;
      return;
    }

    this.filteredPesees = this.pesees.filter(p => p.lotId === lotId);

    if (this.filteredPesees.length === 0) {
      this.filterMessage = 'Aucune réception trouvée pour ce lot.';
    }
  }

  resetFilter(): void {
    this.lotSearchValue = '';
    this.filterMessage = '';
    this.filteredPesees = this.pesees;
  }

  trackByPesee(index: number, pesee: Pesee): number {
    return pesee.idPesee ?? index;
  }
}
