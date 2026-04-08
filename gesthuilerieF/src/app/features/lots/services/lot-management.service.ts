import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { LotOlives } from '../models/lot.models';
import { LotOlivesService } from './lot-olives.service';
import { Pesee, ReceptionPeseeCreatePayload, StockMovement } from '../../stock/models/stock.models';
import { WeighingService } from '../../stock/services/weighing.service';
import { StockMovementService } from '../../stock/services/stock-movement.service';
import { TraceabilityService } from './traceability.service';

export interface CreatePeseeInput {
  datePesee: string;
  poidsBrut: number;
  poidsTare: number;
  huilerieId: number;
  lotMode: 'existing' | 'new';
  existingLotId?: number;
  origine: string;
  varieteOlive: string;
  newLotDetails?: {
    maturite: string;
    dateRecolte: string;
    dateReception: string;
    dureeStockageAvantBroyage: number;
    matierePremiereId: number;
    campagneId: number;
  };
}


@Injectable({
  providedIn: 'root',
})
export class LotManagementService {
  private readonly lotsSubject = new BehaviorSubject<LotOlives[]>([]);
  private readonly weighingsSubject = new BehaviorSubject<Pesee[]>([]);

  readonly lots$ = this.lotsSubject.asObservable();
  readonly weighings$ = this.weighingsSubject.asObservable();

  constructor(
    private lotOlivesService: LotOlivesService,
    private weighingService: WeighingService,
    private traceabilityService: TraceabilityService,
  ) { }

  private refreshData(): Observable<void> {
    return forkJoin({
      lots: this.lotOlivesService.getAll(),
      weighings: this.weighingService.getAll(),
    }).pipe(
      tap(({ lots, weighings }) => {
        this.lotsSubject.next(lots);
        this.weighingsSubject.next(weighings);
      }),
      map(() => void 0),
    );
  }

  loadInitialData(): Observable<void> {
    return this.refreshData();
  }

  getLotById(lotId: number): Observable<LotOlives | undefined> {
    return this.lotOlivesService.findById(lotId).pipe(map(lot => lot ?? undefined));
  }

  getPeseesForLot(lotId: number): Observable<Pesee[]> {
    return this.traceabilityService.getLotTraceability(lotId).pipe(
      map(dto =>
        (dto.pesees ?? []).map(pesee => ({
          ...pesee,
          datePesee: pesee.date,
          lotId: dto.lotId,
        } as Pesee)),
      ),
    );
  }

  calculatePoidsNet(poidsBrut: number, poidsTare: number): number {
    return Math.max(0, Number(poidsBrut) - Number(poidsTare));
  }

  createPesee(input: CreatePeseeInput): Observable<Pesee> {
    const payload: ReceptionPeseeCreatePayload = {
      lotId: input.lotMode === 'existing' ? Number(input.existingLotId) : null,
      datePesee: input.datePesee,
      poidsBrut: Number(input.poidsBrut),
      poidsTare: Number(input.poidsTare),
      huilerieId: Number(input.huilerieId),
      origine: input.origine,
      varieteOlive: input.varieteOlive,
      maturite: input.lotMode === 'new' ? input.newLotDetails?.maturite : undefined,
      dateRecolte: input.lotMode === 'new' ? input.newLotDetails?.dateRecolte : undefined,
      dateReception: input.lotMode === 'new' ? input.newLotDetails?.dateReception : undefined,
      dureeStockageAvantBroyage: input.lotMode === 'new' ? Number(input.newLotDetails?.dureeStockageAvantBroyage) : undefined,
      matierePremiereId: input.lotMode === 'new' ? Number(input.newLotDetails?.matierePremiereId) : undefined,
      campagneAnnee: input.lotMode === 'new'
        ? String(input.newLotDetails?.campagneId)
        : undefined,
    };

    return this.weighingService.createReception(payload).pipe(
      switchMap(created =>
        this.refreshData().pipe(
          map(() => created),
        ),
      ),
    );
  }

  updatePesee(idPesee: number, input: CreatePeseeInput): Observable<Pesee> {
    const payload: ReceptionPeseeCreatePayload = {
      lotId: input.lotMode === 'existing' ? Number(input.existingLotId) : null,
      datePesee: input.datePesee,
      poidsBrut: Number(input.poidsBrut),
      poidsTare: Number(input.poidsTare),
      huilerieId: Number(input.huilerieId),
      origine: input.origine,
      varieteOlive: input.varieteOlive,
      maturite: input.lotMode === 'new' ? input.newLotDetails?.maturite : undefined,
      dateRecolte: input.lotMode === 'new' ? input.newLotDetails?.dateRecolte : undefined,
      dateReception: input.lotMode === 'new' ? input.newLotDetails?.dateReception : undefined,
      dureeStockageAvantBroyage: input.lotMode === 'new' ? Number(input.newLotDetails?.dureeStockageAvantBroyage) : undefined,
      matierePremiereId: input.lotMode === 'new' ? Number(input.newLotDetails?.matierePremiereId) : undefined,
      campagneAnnee: input.lotMode === 'new'
        ? String(input.newLotDetails?.campagneId)
        : undefined,
    };

    return this.weighingService.updateReception(idPesee, payload).pipe(
      switchMap(updated =>
        this.refreshData().pipe(
          map(() => updated),
        ),
      ),
    );
  }

  deletePesee(idPesee: number): Observable<void> {
    return this.weighingService.delete(idPesee).pipe(
      switchMap(result =>
        this.refreshData().pipe(
          map(() => result),
        ),
      ),
    );
  }
}
