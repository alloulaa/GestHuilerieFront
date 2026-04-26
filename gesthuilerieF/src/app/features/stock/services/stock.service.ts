import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Stock } from '../models/stock.models';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
    providedIn: 'root',
})
export class StockService {
    private readonly apiUrl = `${environment.apiUrl}/stocks`;
    private readonly fallbackApiUrl = `${environment.apiUrl}/stock`;

    constructor(
        private http: HttpClient,
        private authService: AuthService,
    ) { }

    getAll(huilerieNom?: string): Observable<Stock[]> {
        const currentHuilerieId = this.authService.getCurrentUserHuilerieId();

        if (!this.authService.isCurrentUserAdmin() && currentHuilerieId) {
            return this.http.get<unknown>(`${this.apiUrl}/huilerie/${currentHuilerieId}`).pipe(
                map(response => this.filterByCurrentUserHuilerie(this.toStocks(response))),
            );
        }

        const params = this.buildHuilerieNomParams(huilerieNom);

        return this.http.get<unknown>(this.apiUrl, { params }).pipe(
            map(response => this.filterByCurrentUserHuilerie(this.toStocks(response))),
            catchError(() =>
                this.http.get<unknown>(this.fallbackApiUrl, { params }).pipe(
                    map(response => this.filterByCurrentUserHuilerie(this.toStocks(response))),
                ),
            ),
        );
    }

    findById(idStock: number): Observable<Stock> {
        return this.http.get<unknown>(`${this.apiUrl}/${idStock}`).pipe(
            map(response => this.toStocks(response)[0] ?? {
                idStock,
                huilerieId: 0,
                typeStock: '',
                referenceId: 0,
                quantiteDisponible: 0,
            }),
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
            huilerieNom: String(item.huilerieNom ?? item.huilerie?.nom ?? '').trim() || undefined,
            typeStock: String(item.typeStock ?? item.type_stock ?? ''),
            variete: String(item.variete ?? item.varieteOlive ?? '').trim() || undefined,
            referenceId: Number(item.referenceId ?? item.reference_id ?? item.lot_id ?? 0),
            lotReference: String(item.lotReference ?? item.referenceLot ?? item.reference_lot ?? item.lotOlivesReference ?? item.lotOlives?.reference ?? item.lot?.reference ?? '').trim() || undefined,
            lotReferences: Array.isArray(item.lotReferences)
                ? item.lotReferences.map((value: unknown) => String(value ?? '').trim()).filter((value: string) => !!value)
                : (String(item.lotReference ?? item.referenceLot ?? item.reference_lot ?? '').trim() || undefined)
                    ? [String(item.lotReference ?? item.referenceLot ?? item.reference_lot ?? '').trim()]
                    : undefined,
            matierePremiereId: item.matierePremiereId != null ? Number(item.matierePremiereId) : undefined,
            quantiteDisponible: Number(item.quantiteDisponible ?? item.quantite_disponible ?? 0),
        }));
    }

    private filterByCurrentUserHuilerie(items: Stock[]): Stock[] {
        if (this.authService.isCurrentUserAdmin()) {
            return items;
        }

        const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
        if (!currentHuilerieId) {
            return [];
        }

        return items.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId);
    }

    private buildHuilerieNomParams(huilerieNom?: string): HttpParams | undefined {
        if (!this.authService.isCurrentUserAdmin()) {
            return undefined;
        }

        const normalized = String(huilerieNom ?? '').trim();
        if (!normalized) {
            return undefined;
        }

        return new HttpParams().set('huilerieNom', normalized);
    }
}
