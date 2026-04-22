import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { StockMovement } from '../../models/stock.models';
import { StockManagementService } from '../../services/stock-management.service';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  templateUrl: './stock-list.component.html',
  styleUrls: ['./stock-list.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
  ],
})
export class StockListComponent implements OnInit {
  allMovements: StockMovement[] = [];
  movements: StockMovement[] = [];
  selectedHuilerieNom = '';
  lotIdFilter = '';
  filterMessage = '';

  constructor(
    private stockManagementService: StockManagementService,
    private permissionService: PermissionService,
  ) { }

  get isAdmin(): boolean {
    return this.permissionService.isAdmin();
  }

  ngOnInit(): void {
    this.reloadMovements();
    this.stockManagementService.movements$.subscribe(data => {
      this.allMovements = data;
      this.applyLotFilter();
    });
  }

  applyFilters(): void {
    if (this.isAdmin) {
      this.reloadMovements();
      return;
    }

    this.applyLotFilter();
  }

  resetFilters(): void {
    this.selectedHuilerieNom = '';
    this.lotIdFilter = '';
    this.filterMessage = '';

    if (this.isAdmin) {
      this.reloadMovements();
      return;
    }

    this.movements = this.allMovements;
  }

  private reloadMovements(): void {
    const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
    this.stockManagementService.loadInitialData(huilerieNom, true).subscribe();
  }

  movementLabel(type: StockMovement['typeMouvement']): string {
    if (type === 'ENTREE') {
      return 'Entree';
    }
    if (type === 'TRANSFERT') {
      return 'Transfert';
    }
    return 'Ajustement';
  }

  movementClass(type: StockMovement['typeMouvement']): string {
    if (type === 'ENTREE') {
      return 'ok';
    }
    if (type === 'TRANSFERT') {
      return 'warn';
    }
    return 'muted';
  }

  movementReference(movement: StockMovement): string {
    return movement.reference || (`MS-${movement.id}`);
  }

  lotReference(movement: StockMovement): string {
    return movement.lotReference || (`LO-${movement.lotId}`);
  }

  private applyLotFilter(): void {
    const search = String(this.lotIdFilter ?? '').trim();
    this.filterMessage = '';

    if (!search) {
      this.movements = this.allMovements;
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = this.allMovements.filter((movement) => {
      const lotRef = this.lotReference(movement).toLowerCase();
      return lotRef.includes(searchLower) || String(movement.lotId).includes(searchLower);
    });
    this.movements = filtered;

    if (filtered.length === 0) {
      this.filterMessage = 'Aucun mouvement trouve pour cette reference de lot.';
    }
  }

}
