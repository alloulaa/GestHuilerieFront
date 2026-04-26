import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Stock } from '../../models/stock.models';
import { StockService } from '../../services/stock.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
    selector: 'app-stock-overview',
    standalone: true,
    templateUrl: './stock-overview.component.html',
    styleUrls: ['./stock-overview.component.scss'],
    imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule],
})
export class StockOverviewComponent implements OnInit {
    stocks: Stock[] = [];
    selectedHuilerieNom = '';

    constructor(
        private stockService: StockService,
        private permissionService: PermissionService,
    ) { }

    get isAdmin(): boolean {
        return this.permissionService.isAdmin();
    }

    ngOnInit(): void {
        this.reloadStocks();
    }

    applyAdminHuilerieFilter(): void {
        this.reloadStocks();
    }

    resetAdminHuilerieFilter(): void {
        this.selectedHuilerieNom = '';
        this.reloadStocks();
    }

    private reloadStocks(): void {
        const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
        this.stockService.getAll(huilerieNom).subscribe({
            next: data => {
                this.stocks = data;
            },
            error: () => {
                this.stocks = [];
            },
        });
    }

    private collectLotReferences(...stocks: Stock[]): string[] {
        const references = new Set<string>();

        for (const stock of stocks) {
            if (stock.lotReference) {
                references.add(stock.lotReference);
            }

            for (const reference of stock.lotReferences ?? []) {
                const normalized = String(reference ?? '').trim();
                if (normalized) {
                    references.add(normalized);
                }
            }
        }

        return Array.from(references);
    }

    lotReference(stock: Stock): string {
        return stock.lotReference || stock.lotReferences?.[0] || (`LO-${stock.referenceId}`);
    }

    stockReference(stock: Stock): string {
        return stock.reference || (`ST-${stock.idStock}`);
    }

    varieteLabel(stock: Stock): string {
        return String(stock.variete ?? '').trim().toUpperCase() || '-';
    }

    lotReferencesLabel(stock: Stock): string {
        const references = stock.lotReferences ?? [];
        if (references.length > 0) {
            return references.join(', ');
        }

        return this.lotReference(stock);
    }
}
