import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { StockMovement } from '../../models/stock.models';
import { StockManagementService } from '../../services/stock-management.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ToastService } from '../../../../core/services/toast.service';

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
  private filterFeedbackPending = false;

  constructor(
    private stockManagementService: StockManagementService,
    private permissionService: PermissionService,
    private toastService: ToastService,
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
    this.filterFeedbackPending = true;

    if (this.isAdmin) {
      this.reloadMovements();
      return;
    }

    this.applyLotFilter();
  }

  resetFilters(): void {
    this.selectedHuilerieNom = '';
    this.lotIdFilter = '';
    this.filterFeedbackPending = false;

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
    const huilerieValue = String(this.selectedHuilerieNom ?? '').trim();

    let filtered: StockMovement[];
    if (!search) {
      filtered = this.allMovements;
    } else {
      const searchLower = search.toLowerCase();
      filtered = this.allMovements.filter((movement) => {
        const lotRef = this.lotReference(movement).toLowerCase();
        return lotRef.includes(searchLower) || String(movement.lotId).includes(searchLower);
      });
    }
    this.movements = filtered;

    if (this.filterFeedbackPending) {
      this.filterFeedbackPending = false;
      this.notifyFilterResult(huilerieValue, search, filtered.length);
    }
  }

  private notifyFilterResult(huilerieValue: string, search: string, resultCount: number): void {
    if (resultCount > 0) {
      return;
    }

    if (this.isAdmin && huilerieValue && this.allMovements.length === 0) {
      this.toastService.warning(`Aucun mouvement trouve pour l'huilerie « ${huilerieValue} ».`);
      return;
    }

    if (search) {
      this.toastService.warning(`Aucun mouvement trouve pour la reference de lot « ${search} ».`);
      return;
    }

    if (huilerieValue) {
      this.toastService.warning(`Aucun mouvement trouve pour l'huilerie « ${huilerieValue} ».`);
    }
  }

}
