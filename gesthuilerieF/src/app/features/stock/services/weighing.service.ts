import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Pesee, ReceptionPeseeCreatePayload, Stock } from '../models/stock.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WeighingService {
  private readonly apiUrl = `${environment.apiUrl}/pesees`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Pesee[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((items) => (items ?? []).map((item) => this.normalizePesee(item))),
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

  updateReception(idPesee: number, payload: Partial<ReceptionPeseeCreatePayload>): Observable<Pesee> {
    return this.http.put<any>(`${this.apiUrl}/${idPesee}`, payload).pipe(
      map((item) => this.normalizePesee(item)),
    );
  }

  generateBonPeseePdf(reference: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${encodeURIComponent(reference)}/pdf`, { responseType: 'blob' });
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
    };
  }
}
