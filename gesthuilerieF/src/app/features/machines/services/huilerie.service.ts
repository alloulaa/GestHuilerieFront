import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Huilerie } from '../models/enterprise.models';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root',
})
export class HuilerieService {
  private readonly apiUrl = `${environment.apiUrl}/huileries`;

  constructor(private http: HttpClient) { }

  findAll(): Observable<Huilerie[]> {
    return this.http.get<Huilerie[]>(this.apiUrl);
  }

  getAll(): Observable<Huilerie[]> {
    return this.findAll();
  }

  create(payload: Huilerie): Observable<Huilerie> {
    return this.http.post<Huilerie>(this.apiUrl, payload);
  }
  update(idHuilerie: number, payload: Huilerie): Observable<Huilerie> {
    return this.http.put<Huilerie>(`${this.apiUrl}/${idHuilerie}`, payload);
  }

  findById(idHuilerie: number): Observable<Huilerie> {
    return this.http.get<Huilerie>(`${this.apiUrl}/${idHuilerie}`);
  }

  findByNom(nom: string): Observable<Huilerie> {
    return this.http.get<Huilerie>(`${this.apiUrl}/nom/${encodeURIComponent(nom)}`);
  }

  activate(idHuilerie: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${idHuilerie}/activate`, {});
  }

  deactivate(idHuilerie: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${idHuilerie}/deactivate`, {});
  }

  toggleStatus(idHuilerie: number, active: boolean): Observable<void> {
    return active ? this.activate(idHuilerie) : this.deactivate(idHuilerie);
  }
}