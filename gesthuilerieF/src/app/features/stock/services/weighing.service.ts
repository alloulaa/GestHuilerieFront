import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Pesee, ReceptionPeseeCreatePayload, Stock } from '../models/stock.models';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class WeighingService {
  private readonly apiUrl = `${environment.apiUrl}/pesees`;
  private missingHuilerieFallbackLogged = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) { }

  getAll(huilerieNom?: string): Observable<Pesee[]> {
    const params = this.buildHuilerieNomParams(huilerieNom);
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map((items) => {
        const normalizedItems = (items ?? []).map((item) => this.normalizePesee(item));
        if (this.authService.isCurrentUserAdmin()) {
          return normalizedItems;
        }

        return this.filterByCurrentUserHuilerie(normalizedItems);
      }),
    );
  }

  findById(idPesee: number): Observable<Pesee> {
    return this.http.get<any>(`${this.apiUrl}/${idPesee}`).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  createReception(payload: ReceptionPeseeCreatePayload): Observable<Pesee> {
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  updateReception(idPesee: number, payload: ReceptionPeseeCreatePayload): Observable<Pesee> {
    return this.http.put<any>(`${this.apiUrl}/${idPesee}`, payload).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  generateBonPeseePdf(reference: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${reference}/pdf`, {
      responseType: 'blob',
    });
  }

  delete(idPesee: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idPesee}`);
  }

  private normalizePesee(raw: any): Pesee {
    const id = Number(raw?.idPesee ?? raw?.id ?? raw?.peseeId ?? 0);
    const brut = Number(raw?.poidsBrut ?? 0);
    const tare = Number(raw?.poidsTare ?? 0);

    return {
      idPesee: id > 0 ? id : undefined,
      reference: raw?.reference ?? raw?.peseeReference,
      datePesee: String(raw?.datePesee ?? raw?.date ?? ''),
      poidsBrut: brut,
      poidsTare: tare,
      poidsNet: Number(raw?.poidsNet ?? Math.max(0, brut - tare)),
      lotId: Number(raw?.lotId ?? raw?.lotOlivesId ?? 0),
      huilerieId: raw?.huilerieId != null ? Number(raw.huilerieId) : undefined,
      huilerieNom: raw?.huilerieNom != null ? String(raw.huilerieNom) : undefined,
      bonPeseePdfPath: raw?.bonPeseePdfPath ?? undefined,
    };
  }

  private filterByCurrentUserHuilerie(items: Pesee[]): Pesee[] {
    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      // TODO: Remove this temporary fallback when current user huilerieId is always available in session.
      if (!this.missingHuilerieFallbackLogged) {
        this.missingHuilerieFallbackLogged = true;
        console.warn('[weighing-service] Temporary fallback: missing current user huilerieId, returning API payload as-is.');
      }
      return items;
    }

    const scopedItems = items.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId);
    if (scopedItems.length > 0) {
      return scopedItems;
    }

    const hasAnyHuilerieId = items.some((item) => item?.huilerieId != null);
    if (!hasAnyHuilerieId) {
      // TODO: Remove this temporary fallback when backend always returns huilerieId for each pesee.
      if (!this.missingHuilerieFallbackLogged) {
        this.missingHuilerieFallbackLogged = true;
        console.warn('[weighing-service] Temporary fallback: backend response has no huilerieId on pesees.');
      }
      return items;
    }

    const distinctHuilerieIds = new Set(
      items
        .map((item) => Number(item?.huilerieId ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    );

    // TODO: Remove this temporary fallback when backend + auth contexte huilerie is fully stable.
    if (distinctHuilerieIds.size === 1) {
      if (!this.missingHuilerieFallbackLogged) {
        this.missingHuilerieFallbackLogged = true;
        console.warn('[weighing-service] Temporary fallback: single-huilerie payload detected, returning all pesees.');
      }
      return items;
    }

    return scopedItems;
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
