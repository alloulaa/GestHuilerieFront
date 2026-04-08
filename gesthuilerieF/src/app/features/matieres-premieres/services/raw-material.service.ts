import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MatierePremiere } from '../models/raw-material.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RawMaterialService {
  private readonly apiUrl = `${environment.apiUrl}/matieresPremieres`;

  constructor(private http: HttpClient) { }

  findAll(): Observable<MatierePremiere[]> {
    return this.http.get<MatierePremiere[]>(this.apiUrl);
  }

  getAll(): Observable<MatierePremiere[]> {
    return this.findAll();
  }

  create(payload: Omit<MatierePremiere, 'idMatierePremiere' | 'reference'>): Observable<MatierePremiere> {
    return this.http.post<MatierePremiere>(this.apiUrl, payload);
  }

  update(reference: string | number, payload: Partial<MatierePremiere>): Observable<MatierePremiere> {
    return this.http.put<MatierePremiere>(`${this.apiUrl}/${reference}`, payload);
  }

  delete(reference: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${reference}`);
  }

  findById(reference: string | number): Observable<MatierePremiere> {
    return this.http.get<MatierePremiere>(`${this.apiUrl}/${reference}`);
  }
}