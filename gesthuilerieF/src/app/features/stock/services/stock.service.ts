import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Stock } from '../models/stock.models';

@Injectable({
    providedIn: 'root',
})
export class StockService {
    private readonly apiUrl = `${environment.apiUrl}/stocks`;
    private readonly fallbackApiUrl = `${environment.apiUrl}/stock`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<Stock[]> {
        return this.http.get<unknown>(this.apiUrl).pipe(
            map(response => this.toStocks(response)),
            catchError(() =>
                this.http.get<unknown>(this.fallbackApiUrl).pipe(
                    map(response => this.toStocks(response)),
                ),
            ),
        );
    }

    private toStocks(response: unknown): Stock[] {
        const raw = response as any;
        const list = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.content)
                    ? raw.content
                    : Array.isArray(raw?.items)
                        ? raw.items
                        : [];

        return list.map((item: any) => ({
            idStock: Number(item.idStock ?? item.id_stock ?? 0),
            reference: String(item.reference ?? item.stockReference ?? item.referenceStock ?? item.stock?.reference ?? '').trim() || undefined,
            huilerieId: Number(item.huilerieId ?? item.huilerie_id ?? 0),
            typeStock: String(item.typeStock ?? item.type_stock ?? ''),
            referenceId: Number(item.referenceId ?? item.reference_id ?? item.lot_id ?? 0),
            lotReference: String(item.lotReference ?? item.referenceLot ?? item.reference_lot ?? item.lotOlivesReference ?? item.lotOlives?.reference ?? item.lot?.reference ?? '').trim() || undefined,
            quantiteDisponible: Number(item.quantiteDisponible ?? item.quantite_disponible ?? 0),
        }));
    }
}
