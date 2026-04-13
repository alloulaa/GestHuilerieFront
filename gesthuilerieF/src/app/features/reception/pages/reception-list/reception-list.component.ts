import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-reception-list',
  standalone: true,
  templateUrl: './reception-list.component.html',
  styleUrls: ['./reception-list.component.scss'],
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule],
})
export class ReceptionListComponent implements OnInit {
  allPesees: Pesee[] = [];
  pesees: Pesee[] = [];
  lastReception: Pesee | null = null;
  lotSearchValue = '';
  selectedHuilerieNom = '';
  filterMessage = '';

  constructor(
    private lotManagementService: LotManagementService,
    private permissionService: PermissionService,
  ) { }

  get isAdmin(): boolean {
    return this.permissionService.isAdmin();
  }

  ngOnInit(): void {
    this.reloadPesees();
    this.lotManagementService.weighings$.subscribe(data => {
      this.allPesees = data;
      this.pesees = data;
      this.lastReception = data.length > 0 ? data[0] : null;
    });
  }

  applyAdminHuilerieFilter(): void {
    this.reloadPesees();
  }

  resetAdminHuilerieFilter(): void {
    this.selectedHuilerieNom = '';
    this.reloadPesees();
  }

  filterByLot(): void {
    const searchValue = String(this.lotSearchValue ?? '').trim();
    this.filterMessage = '';

    if (!searchValue) {
      this.pesees = this.allPesees;
      return;
    }

    const lotId = Number(searchValue);
    if (Number.isNaN(lotId) || lotId <= 0) {
      this.filterMessage = 'Veuillez saisir un identifiant de lot valide.';
      this.pesees = this.allPesees;
      return;
    }

    const filtered = this.allPesees.filter((pesee) => Number(pesee.lotId) === lotId);
    this.pesees = filtered;
    this.filterMessage = filtered.length === 0 ? 'Aucune reception trouvee pour ce lot.' : '';
  }

  resetFilter(): void {
    this.lotSearchValue = '';
    this.filterMessage = '';
    this.pesees = this.allPesees;
  }

  private reloadPesees(): void {
    const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
    this.lotManagementService.loadInitialData(huilerieNom).subscribe();
  }
}
