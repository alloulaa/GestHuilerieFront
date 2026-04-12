import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { LotOlives } from '../models/lot.models';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class LotOlivesService {
  private readonly apiUrl = `${environment.apiUrl}/lots`;
  private missingHuilerieContextLogged = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) { }

  getAll(): Observable<LotOlives[]> {
    return this.http.get<Array<LotOlives & { huilerieId?: number }>>(this.apiUrl).pipe(
      map((items) => this.filterByCurrentUserHuilerie((items ?? []).map((item) => this.normalizeLot(item)))),
    );
  }

  findById(idLot: number): Observable<LotOlives> {
    return this.http.get<LotOlives & { huilerieId?: number }>(`${this.apiUrl}/${idLot}`).pipe(
      map((item) => this.normalizeLot(item)),
    );
  }

  private normalizeLot(item: LotOlives & { huilerieId?: number }): LotOlives {
    return {
      ...item,
      huilerieId: item?.huilerieId,
    };
  }

  private filterByCurrentUserHuilerie(items: LotOlives[]): LotOlives[] {
    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      if (!this.missingHuilerieContextLogged) {
        this.missingHuilerieContextLogged = true;
        console.warn('[lot-olives-service] Missing current user huilerieId; returning empty lot list for safety.');
      }
      return [];
    }

    return items.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId);
  }
}