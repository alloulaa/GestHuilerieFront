import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../models/stock.models';
import { StockService } from '../../services/stock.service';
import { MatCardModule } from '@angular/material/card';

@Component({
    selector: 'app-stock-overview',
    standalone: true,
    templateUrl: './stock-overview.component.html',
    styleUrls: ['./stock-overview.component.scss'],
    imports: [CommonModule, MatCardModule],
})
export class StockOverviewComponent implements OnInit {
    stocks: Stock[] = [];

    constructor(private stockService: StockService) { }

    ngOnInit(): void {
        this.stockService.getAll().subscribe({
            next: data => {
                this.stocks = data;
            },
            error: () => {
                this.stocks = [];
            },
        });
    }

    lotReference(stock: Stock): string {
        return stock.lotReference || (`LO-${stock.referenceId}`);
    }

    stockReference(stock: Stock): string {
        return stock.reference || (`ST-${stock.idStock}`);
    }
}
