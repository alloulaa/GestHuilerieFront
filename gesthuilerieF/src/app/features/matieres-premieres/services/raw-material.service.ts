import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MatierePremiere } from '../models/raw-material.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RawMaterialService {
  private readonly apiUrl = `${environment.apiUrl}/matieresPremieres`;

  constructor(private http: HttpClient) { }

  private normalizeMatierePremiere(item: MatierePremiere & { id?: number }): MatierePremiere {
    const resolvedId = Number(item?.idMatierePremiere ?? item?.id ?? 0);
    return {
      ...item,
      id: resolvedId > 0 ? resolvedId : item?.id,
      idMatierePremiere: resolvedId > 0 ? resolvedId : item?.idMatierePremiere,
    };
  }

  findAll(): Observable<MatierePremiere[]> {
    return this.http
      .get<Array<MatierePremiere & { id?: number }>>(this.apiUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeMatierePremiere(item))));
  }

  getAll(): Observable<MatierePremiere[]> {
    return this.findAll();
  }

  create(payload: Omit<MatierePremiere, 'idMatierePremiere' | 'reference'>): Observable<MatierePremiere> {
    return this.http
      .post<MatierePremiere & { id?: number }>(this.apiUrl, payload)
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
}