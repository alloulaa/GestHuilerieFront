import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, of, switchMap, tap } from 'rxjs';
import { Stock, StockMovement } from '../models/stock.models';
import { StockMovementService } from './stock-movement.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

interface StockQueryParams {
  huilerieId: number;
  lotId: number;
}

export interface StockFilter {
  type?: StockMovement['typeMouvement'] | 'ALL';
  lotId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class StockManagementService {
  private readonly movementsSubject = new BehaviorSubject<StockMovement[]>([]);
  private initialized = false;

  readonly movements$ = this.movementsSubject.asObservable();

  constructor(
    private stockMovementService: StockMovementService,
    private authService: AuthService,
  ) { }

  loadInitialData(huilerieNom?: string, forceReload = false): Observable<void> {
    if (this.initialized && !forceReload) {
      return of(void 0);
    }

    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (this.authService.isCurrentUserAdmin()) {
      return this.stockMovementService.getAll(huilerieNom).pipe(
        tap(data => {
          this.movementsSubject.next(data);
          this.initialized = true;
        }),
        map(() => void 0),
      );
    }

    if (!currentHuilerieId) {
      this.movementsSubject.next([]);
      this.initialized = true;
      return of(void 0);
    }

    return this.stockMovementService.getByHuilerie(currentHuilerieId).pipe(
      tap(data => {
        this.movementsSubject.next(data);
        this.initialized = true;
      }),
      map(() => void 0),
    );
  }

  createMovement(payload: {
    huilerieId: number;
    lotId: number;
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

  getAvailableQuantity(huilerieId: number, lotId: number): number {
    return this.movementsSubject.value
      .filter(
        movement =>
          movement.huilerieId === huilerieId &&
          movement.lotId === lotId,
      )
      .reduce((total, movement) => {
        const quantity = Number(movement.quantite ?? 0);
        if (movement.typeMouvement === 'TRANSFERT') {
          return total - quantity;
        }
        return total + quantity;
      }, 0);
  }

  updateMovementType(
    id: number,
    payload: {
      huilerieId: number;
      lotId: number;
      commentaire: string;
      dateMouvement: string;
      typeMouvement: StockMovement['typeMouvement'];
    },
  ): Observable<StockMovement> {
    if (this.authService.isCurrentUserAdmin()) {
      return this.stockMovementService.updateMovement(id, payload).pipe(
        switchMap(updated =>
          this.stockMovementService.getAll().pipe(
            tap(items => {
              this.movementsSubject.next(items);
            }),
            map(() => updated),
          ),
        ),
      );
    }

    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      return this.stockMovementService.updateMovement(id, payload);
    }

    return this.stockMovementService.updateMovement(id, payload).pipe(
      switchMap(updated =>
        this.stockMovementService.getByHuilerie(currentHuilerieId).pipe(
          tap(items => {
            this.movementsSubject.next(items);
          }),
          map(() => updated),
        ),
      ),
    );
  }

  deleteMovement(id: number): Observable<void> {
    return this.stockMovementService.delete(id).pipe(
      tap(() => {
        const next = this.movementsSubject.value.filter(item => item.id !== id);
        this.movementsSubject.next(next);
      }),
    );
  }

  getFilteredMovements(filter: StockFilter): Observable<StockMovement[]> {
    return this.movements$.pipe(
      map(items =>
        items.filter(item => {
          const typeMatch = !filter.type || filter.type === 'ALL' || item.typeMouvement === filter.type;
          const refMatch = !filter.lotId || item.lotId === filter.lotId;
          return typeMatch && refMatch;
        }),
      ),);
  }
}