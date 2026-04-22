import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { LotTraceability, TraceabilityEvent } from '../models/lot.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TraceabilityService {
  private readonly apiUrl = `${environment.apiUrl}/traceability`;

  constructor(private http: HttpClient) { }

  getLotTraceability(lotId: number): Observable<LotTraceability> {
    return this.http.get<LotTraceability>(`${this.apiUrl}/lot/${lotId}`).pipe(
      map(dto => ({
        ...dto,
        cycleVie: (dto.cycleVie ?? []).map(event => ({
          ...event,
          etape: this.normalizeEtape(event.etape),
        })),
      })),
    );
  }

  getLotLifecycle(lotId: number): Observable<TraceabilityEvent[]> {
    return this.getLotTraceability(lotId).pipe(map(dto => dto.cycleVie ?? []));
  }

  private normalizeEtape(value: string): TraceabilityEvent['etape'] {
    const upper = String(value).toUpperCase();
    if (upper.includes('LOT')) return 'LOT_OLIVES';
    if (upper.includes('PESEE') || upper.includes('ARRIVAGE')) return 'PESEE';
    if (upper.includes('PRODUIT')) return 'PRODUIT_FINAL';
    if (upper.includes('PRODUCTION')) return 'PRODUCTION';
    return 'STOCK';
  }
}
