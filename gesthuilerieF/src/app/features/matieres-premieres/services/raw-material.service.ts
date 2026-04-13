import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { MatierePremiere } from '../models/raw-material.models';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RawMaterialService {
  private readonly apiUrl = `${environment.apiUrl}/matieresPremieres`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) { }

  private normalizeMatierePremiere(item: MatierePremiere & { id?: number; huilerie?: { nom?: string } }): MatierePremiere {
    const resolvedId = Number(item?.idMatierePremiere ?? item?.id ?? 0);
    return {
      ...item,
      id: resolvedId > 0 ? resolvedId : item?.id,
      idMatierePremiere: resolvedId > 0 ? resolvedId : item?.idMatierePremiere,
      huilerieNom: String(item?.huilerieNom ?? item?.huilerie?.nom ?? '').trim() || undefined,
    };
  }

  findAll(huilerieNom?: string): Observable<MatierePremiere[]> {
    const params = this.buildHuilerieNomParams(huilerieNom);

    return this.http
      .get<Array<MatierePremiere & { id?: number }>>(this.apiUrl, { params })
      .pipe(map((items) => this.filterByCurrentUserHuilerie((items ?? []).map((item) => this.normalizeMatierePremiere(item)))));
  }

  getAll(huilerieNom?: string): Observable<MatierePremiere[]> {
    return this.findAll(huilerieNom);
  }

  create(payload: Omit<MatierePremiere, 'idMatierePremiere' | 'reference'>): Observable<MatierePremiere> {
    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    const resolvedHuilerieId = Number(payload?.huilerieId ?? currentHuilerieId ?? 0);

    if (resolvedHuilerieId <= 0) {
      return throwError(() => new Error('Impossible de creer la matiere premiere: huilerieId introuvable dans la session.'));
    }

    const createPayload = {
      nom: payload?.nom ?? '',
      type: payload?.type ?? '',
      uniteMesure: payload?.uniteMesure ?? '',
      description: payload?.description ?? '',
      huilerieId: resolvedHuilerieId,
    };

    return this.http
      .post<MatierePremiere & { id?: number }>(this.apiUrl, createPayload)
      .pipe(map((item) => this.normalizeMatierePremiere(item)));
  }

  update(reference: string | number, payload: Partial<MatierePremiere>): Observable<MatierePremiere> {
    return this.http
      .put<MatierePremiere & { id?: number }>(`${this.apiUrl}/${reference}`, payload)
      .pipe(map((item) => this.normalizeMatierePremiere(item)));
  }

  delete(reference: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${reference}`);
  }

  findById(reference: string | number): Observable<MatierePremiere> {
    return this.http
      .get<MatierePremiere & { id?: number }>(`${this.apiUrl}/${reference}`)
      .pipe(map((item) => this.normalizeMatierePremiere(item)));
  }

  private filterByCurrentUserHuilerie(items: MatierePremiere[]): MatierePremiere[] {
    if (this.authService.isCurrentUserAdmin()) {
      return items;
    }

    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      return items;
    }

    return items.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId || item?.huilerieId == null);
  }

  private buildHuilerieNomParams(huilerieNom?: string): HttpParams | undefined {
    const normalized = String(huilerieNom ?? '').trim();
    if (!normalized) {
      return undefined;
    }

    return new HttpParams().set('huilerieNom', normalized);
  }
}