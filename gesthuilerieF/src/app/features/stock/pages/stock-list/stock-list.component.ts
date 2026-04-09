import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { StockMovement } from '../../models/stock.models';
import { StockManagementService } from '../../services/stock-management.service';

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
  lotIdFilter = '';
  filterMessage = '';

  constructor(
    private stockManagementService: StockManagementService,
  ) { }

  ngOnInit(): void {
    this.stockManagementService.loadInitialData().subscribe(() => {
      this.stockManagementService.movements$.subscribe(data => {
        this.allMovements = data;
        this.applyLotFilter();
      });
    });
  }

  filterByLotId(): void {
    this.applyLotFilter();
  }

  resetLotFilter(): void {
    this.lotIdFilter = '';
    this.filterMessage = '';
    this.movements = this.allMovements;
  }

  movementLabel(type: StockMovement['typeMouvement']): string {
    if (type === 'ARRIVAL') {
      return 'Entree';
    }
    if (type === 'DEPARTURE') {
      return 'Sortie';
    }
    if (type === 'TRANSFER') {
      return 'Transfert';
    }
    return 'Ajustement';
  }

  movementClass(type: StockMovement['typeMouvement']): string {
    if (type === 'ARRIVAL') {
      return 'ok';
    }
    if (type === 'DEPARTURE') {
      return 'critical';
    }
    if (type === 'TRANSFER') {
      return 'warn';
    }
    return 'muted';
  }

  movementReference(movement: StockMovement): string {
    return movement.reference || (`MS-${movement.id}`);
  }

  lotReference(movement: StockMovement): string {
    return movement.lotReference || (`LO-${movement.referenceId}`);
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
      return lotRef.includes(searchLower) || String(movement.referenceId).includes(searchLower);
    });
    this.movements = filtered;

    if (filtered.length === 0) {
      this.filterMessage = 'Aucun mouvement trouve pour cette reference de lot.';
    }
  }

}
