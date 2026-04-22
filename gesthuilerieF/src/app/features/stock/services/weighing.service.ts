import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Pesee, ReceptionPeseeCreatePayload } from '../models/stock.models';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class WeighingService {
  private readonly apiUrl = `${environment.apiUrl}/lots/arrivages`;
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

  findById(idLotArrivage: number): Observable<Pesee> {
    return this.http.get<any>(`${this.apiUrl}/${idLotArrivage}`).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  createReception(payload: ReceptionPeseeCreatePayload): Observable<Pesee> {
    const sanitizedPayload: ReceptionPeseeCreatePayload = {
      ...payload,
      matierePremiereReference: this.sanitizeReference(payload?.matierePremiereReference),
      campagneReference: this.sanitizeReference(payload?.campagneReference),
    };

    return this.http.post<any>(this.apiUrl, sanitizedPayload).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  updateReception(idLotArrivage: number, payload: ReceptionPeseeCreatePayload): Observable<Pesee> {
    const sanitizedPayload: ReceptionPeseeCreatePayload = {
      ...payload,
      matierePremiereReference: this.sanitizeReference(payload?.matierePremiereReference),
      campagneReference: this.sanitizeReference(payload?.campagneReference),
    };

    return this.http.put<any>(`${environment.apiUrl}/lots/${idLotArrivage}`, sanitizedPayload).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  generateBonPeseePdf(idLot: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/lots/${idLot}/bon-pesee/pdf`, {
      responseType: 'blob',
    });
  }

  uploadBonPeseePdf(idLot: number, file: File): Observable<Pesee> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(`${environment.apiUrl}/lots/${idLot}/bon-pesee/pdf/upload`, formData).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  delete(idLotArrivage: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/lots/${idLotArrivage}`);
  }

  private normalizePesee(raw: any): Pesee {
    const id = Number(raw?.idLotArrivage ?? raw?.idPesee ?? raw?.id ?? raw?.peseeId ?? raw?.idLot ?? 0);
    const pesee = Number(raw?.pesee ?? raw?.poidsBrut ?? raw?.quantiteInitiale ?? 0);

    return {
      idPesee: id > 0 ? id : undefined,
      idLotArrivage: id > 0 ? id : undefined,
      reference: raw?.reference ?? raw?.peseeReference,
      datePesee: String(raw?.datePesee ?? raw?.date ?? raw?.dateReception ?? ''),
      pesee,
      lotId: Number(raw?.lotId ?? raw?.lotOlivesId ?? raw?.idLot ?? 0),
      matierePremiereReference: raw?.matierePremiereReference != null ? String(raw.matierePremiereReference).trim() : undefined,
      campagneReference: raw?.campagneReference != null ? String(raw.campagneReference).trim() : undefined,
      huilerieId: raw?.huilerieId != null ? Number(raw.huilerieId) : undefined,
      huilerieNom: raw?.huilerieNom != null ? String(raw.huilerieNom) : undefined,
      bonPeseePdfPath: raw?.bonPeseePdfPath ?? undefined,
      fournisseurNom: raw?.fournisseurNom != null ? String(raw.fournisseurNom) : undefined,
      fournisseurCIN: raw?.fournisseurCIN != null ? String(raw.fournisseurCIN) : undefined,
    };
  }

  private sanitizeReference(value?: string): string | undefined {
    const normalized = String(value ?? '')
      .trim()
      .replace(/[\s,;:]+$/g, '')
      .toUpperCase();

    return normalized || undefined;
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
