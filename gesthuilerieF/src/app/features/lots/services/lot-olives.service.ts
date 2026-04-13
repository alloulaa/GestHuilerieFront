import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { LotOlives } from '../models/lot.models';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { StockService } from '../../stock/services/stock.service';

@Injectable({
  providedIn: 'root',
})
export class LotOlivesService {
  private readonly apiUrl = `${environment.apiUrl}/lots`;
  private missingHuilerieContextLogged = false;
  private missingLotHuilerieFallbackLogged = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private stockService: StockService,
  ) { }

  getAll(huilerieNom?: string): Observable<LotOlives[]> {
    const params = this.buildHuilerieNomParams(huilerieNom);

    if (this.authService.isCurrentUserAdmin()) {
      return this.http.get<Array<LotOlives & { huilerieId?: number; huilerieNom?: string }>>(this.apiUrl, { params }).pipe(
        map((items) => (items ?? []).map((item) => this.normalizeLot(item))),
      );
    }

    return forkJoin({
      lots: this.http.get<Array<LotOlives & { huilerieId?: number; huilerieNom?: string }>>(this.apiUrl, { params }),
      stocks: this.stockService.getAll().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ lots, stocks }) => {
        const normalizedLots = (lots ?? []).map((item) => this.normalizeLot(item));
        const scopedLots = this.filterByCurrentUserHuilerie(normalizedLots, stocks ?? []);

        console.log('[lot-olives-service] getAll diagnostics', {
          lotsCount: normalizedLots.length,
          stocksCount: (stocks ?? []).length,
          scopedLotsCount: scopedLots.length,
          currentUserHuilerieId: this.authService.getCurrentUserHuilerieId(),
          firstLot: normalizedLots[0] ?? null,
          firstStock: (stocks ?? [])[0] ?? null,
        });

        return scopedLots;
      }),
    );
  }

  findById(idLot: number): Observable<LotOlives> {
    return this.http.get<LotOlives & { huilerieId?: number }>(`${this.apiUrl}/${idLot}`).pipe(
      map((item) => this.normalizeLot(item)),
    );
  }

  private normalizeLot(item: LotOlives & { huilerieId?: number; huilerieNom?: string }): LotOlives {
    return {
      ...item,
      huilerieId: item?.huilerieId,
      huilerieNom: item?.huilerieNom,
    };
  }

  private filterByCurrentUserHuilerie(items: LotOlives[], stocks: Array<{ referenceId?: number; lotReference?: string }>): LotOlives[] {
    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      if (!this.missingHuilerieContextLogged) {
        this.missingHuilerieContextLogged = true;
        console.warn('[lot-olives-service] Missing current user huilerieId; returning empty lot list for safety.');
      }
      return [];
    }

    const lotsWithHuilerie = items.filter((item) => item?.huilerieId != null);
    const directScopedLots = lotsWithHuilerie.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId);

    // TODO: Remove this fallback when backend always returns huilerieId in /lots payload.
    const lotIdsFromStocks = new Set(
      stocks
        .map((stock) => Number(stock?.referenceId ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    );

    const lotRefsFromStocks = new Set(
      stocks
        .map((stock) => this.normalizeReference(stock?.lotReference))
        .filter((value) => !!value),
    );

    const lotIdsFromStockRefs = new Set(
      stocks
        .map((stock) => this.extractLotIdFromReference(stock?.lotReference))
        .filter((id): id is number => id != null && Number.isFinite(id) && id > 0),
    );

    const byStockScope = items.filter((item) => {
      const itemLotId = Number(item?.idLot ?? 0);
      if (itemLotId > 0 && (lotIdsFromStocks.has(itemLotId) || lotIdsFromStockRefs.has(itemLotId))) {
        return true;
      }

      const itemReference = this.normalizeReference(item?.reference ?? null);
      return !!itemReference && lotRefsFromStocks.has(itemReference);
    });

    const scopedByStocksAndHuilerie = byStockScope.filter((item) =>
      Number(item?.huilerieId ?? currentHuilerieId) === currentHuilerieId,
    );

    if (byStockScope.length > 0 && !this.missingLotHuilerieFallbackLogged) {
      this.missingLotHuilerieFallbackLogged = true;
      console.warn('[lot-olives-service] Temporary fallback: /lots response has no huilerieId, scoped by stock payload.');
    }

    if (directScopedLots.length === 0 && byStockScope.length > 0) {
      console.warn('[lot-olives-service] lots huilerieId conflicts with stock scope', {
        currentUserHuilerieId: currentHuilerieId,
        directScopedLotIds: directScopedLots.map((lot) => lot.idLot),
        stockScopedLotIds: scopedByStocksAndHuilerie.map((lot) => lot.idLot),
        lotHuilerieIds: items.map((lot) => ({ idLot: lot.idLot, huilerieId: lot.huilerieId })),
        stockLotIds: Array.from(lotIdsFromStocks),
        stockLotRefs: Array.from(lotRefsFromStocks),
      });
      return scopedByStocksAndHuilerie.length > 0 ? scopedByStocksAndHuilerie : byStockScope;
    }

    if (byStockScope.length === 0) {
      console.warn('[lot-olives-service] fallback produced 0 lots', {
        lotIdsFromStocks: Array.from(lotIdsFromStocks),
        lotIdsFromStockRefs: Array.from(lotIdsFromStockRefs),
        lotRefsFromStocks: Array.from(lotRefsFromStocks),
        lotIdsFromApi: items.map((item) => Number(item?.idLot ?? 0)).filter((id) => id > 0),
        lotRefsFromApi: items.map((item) => this.normalizeReference(item?.reference ?? null)).filter((value) => !!value),
      });
    }

    return directScopedLots.length > 0 ? directScopedLots : byStockScope;
  }

  private extractLotIdFromReference(value: unknown): number | null {
    const normalized = this.normalizeReference(value);
    if (!normalized) {
      return null;
    }

    const match = normalized.match(/(\d+)/);
    if (!match) {
      return null;
    }

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private normalizeReference(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
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