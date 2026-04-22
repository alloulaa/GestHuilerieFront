import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { StockMovement } from '../models/stock.models';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class StockMovementService {
  private readonly apiUrl = `${environment.apiUrl}/stockMouvements`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) { }

  getAll(huilerieNom?: string): Observable<StockMovement[]> {
    const params = this.buildHuilerieNomParams(huilerieNom);
    return this.http.get<unknown>(this.apiUrl, { params }).pipe(
      map(response => this.filterByCurrentUserHuilerie(this.toMovementList(response))),
    );
  }

  getByHuilerie(huilerieId: number): Observable<StockMovement[]> {
    return this.http.get<unknown>(`${this.apiUrl}/huilerie/${huilerieId}`).pipe(
      map(response => this.toMovementList(response)),
    );
  }

  create(payload: {
    huilerieId: number;
    lotId: number;
    commentaire: string;
    dateMouvement: string;
    typeMouvement: StockMovement['typeMouvement'];
  }): Observable<StockMovement> {
    return this.http.post<unknown>(this.apiUrl, payload).pipe(
      map(response => this.toMovement(this.unwrap(response))),
    );
  }

  updateMovement(
    id: number,
    payload: {
      huilerieId: number;
      lotId: number;
      commentaire: string;
      dateMouvement: string;
      typeMouvement: StockMovement['typeMouvement'];
    },
  ): Observable<StockMovement> {
    return this.http.put<unknown>(`${this.apiUrl}/${id}`, payload).pipe(
      map(response => this.toMovement(this.unwrap(response))),
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<unknown>(`${this.apiUrl}/${id}`).pipe(
      map(() => void 0),
    );
  }

  private toMovementList(response: unknown): StockMovement[] {
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

    return list.map((item: any) => this.toMovement(item));
  }

  private toMovement(raw: any): StockMovement {
    const stock = raw?.stock ?? {};
    const lot = stock?.lotOlives ?? stock?.lot ?? {};
    return {
      id: Number(raw?.id ?? raw?.idStockMovement ?? raw?.id_stock_movement ?? 0),
      reference: String(raw?.reference ?? raw?.movementReference ?? '').trim() || undefined,
      huilerieId: Number(raw?.huilerieId ?? stock?.huilerie?.idHuilerie ?? stock?.huilerieId ?? raw?.huilerie_id ?? 0),
      huilerieNom: String(raw?.huilerieNom ?? stock?.huilerie?.nom ?? '').trim() || undefined,
      lotId: Number(raw?.lotId ?? raw?.referenceId ?? stock?.lotId ?? stock?.referenceId ?? stock?.lotOlives?.idLot ?? raw?.reference_id ?? 0),
      lotReference: String(raw?.lotReference ?? raw?.referenceLot ?? lot?.reference ?? '').trim() || undefined,
      quantite: raw?.quantite != null ? Number(raw.quantite) : undefined,
      commentaire: String(raw?.commentaire ?? raw?.comment ?? ''),
      dateMouvement: String(raw?.dateMouvement ?? raw?.date ?? ''),
      typeMouvement: this.normalizeTypeMouvement(raw?.typeMouvement ?? raw?.type),
    };
  }

  private normalizeTypeMouvement(value: unknown): StockMovement['typeMouvement'] {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'ARRIVAL' || normalized === 'ENTREE') {
      return 'ENTREE';
    }
    if (normalized === 'TRANSFER' || normalized === 'DEPARTURE' || normalized === 'TRANSFERT') {
      return 'TRANSFERT';
    }
    return 'AJUSTEMENT';
  }

  private filterByCurrentUserHuilerie(items: StockMovement[]): StockMovement[] {
    if (this.authService.isCurrentUserAdmin()) {
      return items;
    }

    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      return [];
    }

    return items.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId);
  }

  private unwrap(response: unknown): any {
    const raw = response as any;
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && typeof raw.data === 'object') {
      return raw.data;
    }
    return raw;
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