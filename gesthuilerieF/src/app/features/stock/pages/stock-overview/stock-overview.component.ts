import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockMovement } from '../../models/stock.models';
import { StockManagementService } from '../../services/stock-management.service';
import { MatCardModule } from '@angular/material/card';

@Component({
    selector: 'app-stock-overview',
    standalone: true,
    templateUrl: './stock-overview.component.html',
    styleUrls: ['./stock-overview.component.scss'],
    imports: [CommonModule, MatCardModule],
})
export class StockOverviewComponent implements OnInit {
    movements: StockMovement[] = [];

    constructor(private stockManagementService: StockManagementService) { }

    ngOnInit(): void {
        this.stockManagementService.loadInitialData().subscribe(() => {
            this.stockManagementService.movements$.subscribe(data => {
                this.movements = data;
            });
        });
    }

    movementReference(movement: StockMovement): string {
        return movement.reference || (`MS-${movement.id}`);
    }

    lotReference(movement: StockMovement): string {
        return movement.lotReference || (`LO-${movement.referenceId}`);
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
}
