import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, of, tap } from 'rxjs';
import { Stock, StockMovement } from '../models/stock.models';
import { StockMovementService } from './stock-movement.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

interface StockQueryParams {
  huilerieId: number;
  referenceId: number;
}

export interface StockFilter {
  type?: StockMovement['typeMouvement'] | 'ALL';
  referenceId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class StockManagementService {
  private readonly movementsSubject = new BehaviorSubject<StockMovement[]>([]);
  private initialized = false;

  readonly movements$ = this.movementsSubject.asObservable();

  constructor(private stockMovementService: StockMovementService) { }

  loadInitialData(): Observable<void> {
    if (this.initialized) {
      return of(void 0);
    }

    return this.stockMovementService.getAll().pipe(
      tap(data => {
        this.movementsSubject.next(data);
        this.initialized = true;
      }),
      map(() => void 0),
    );
  }

  createMovement(payload: {
    huilerieId: number;
    referenceId: number;
    quantite: number;
    commentaire: string;
    dateMouvement: string;
    typeMouvement: StockMovement['typeMouvement'];
  }): Observable<StockMovement> {
    return this.stockMovementService.create(payload).pipe(
      tap(created => {
        this.movementsSubject.next([created, ...this.movementsSubject.value]);
      }),
    );
  }

  getAvailableQuantity(huilerieId: number, referenceId: number): number {
    return this.movementsSubject.value
      .filter(
        movement =>
          movement.huilerieId === huilerieId &&
          movement.referenceId === referenceId,
      )
      .reduce((total, movement) => {
        if (movement.typeMouvement === 'DEPARTURE') {
          return total - movement.quantite;
        }
        return total + movement.quantite;
      }, 0);
  }

  updateMovementType(id: number, typeMouvement: StockMovement['typeMouvement'], quantite: number): Observable<StockMovement> {
    return this.stockMovementService.updateTypeMouvement(id, typeMouvement, quantite).pipe(
      tap(updated => {
        const next = this.movementsSubject.value.map(item =>
          item.id === id ? updated : item,
        );
        this.movementsSubject.next(next);
      }),
    );
  }

  getFilteredMovements(filter: StockFilter): Observable<StockMovement[]> {
    return this.movements$.pipe(
      map(items =>
        items.filter(item => {
          const typeMatch = !filter.type || filter.type === 'ALL' || item.typeMouvement === filter.type;
          const refMatch = !filter.referenceId || item.referenceId === filter.referenceId;
          return typeMatch && refMatch;
        }),
      ),);
  }
}