import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { LotOlives } from '../models/lot.models';
import { LotOlivesService } from './lot-olives.service';
import { Pesee, ReceptionPeseeCreatePayload } from '../../stock/models/stock.models';
import { WeighingService } from '../../stock/services/weighing.service';
import { TraceabilityService } from './traceability.service';

export interface CreatePeseeInput {
  datePesee: string;
  pesee: number;
  poidsBrut?: number;
  poidsTare?: number;
  huilerieId: number;
  origine: string;
  varieteOlive: string;
  fournisseurNom: string;
  fournisseurCIN: string;
  maturite: string;
  dateRecolte: string;
  dateReception: string;
  dureeStockageAvantBroyage: number;
  matierePremiereReference: string;
  campagneReference: string;
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

  private refreshData(huilerieNom?: string): Observable<void> {
    return forkJoin({
      lots: this.lotOlivesService.getAll(huilerieNom),
      weighings: this.weighingService.getAll(huilerieNom),
    }).pipe(
      switchMap(({ lots, weighings }) =>
        this.backfillLotsFromWeighings(lots, weighings).pipe(
          map((resolvedLots) => ({ lots: resolvedLots, weighings })),
        ),
      ),
      tap(({ lots, weighings }) => {
        this.lotsSubject.next(lots);
        this.weighingsSubject.next(weighings);
        console.log('[lot-management-service] refreshData', {
          lotsCount: lots.length,
          weighingsCount: weighings.length,
          lotIds: lots.map((lot) => lot.idLot),
          weighingLotIds: weighings.map((pesee) => pesee.lotId),
        });
      }),
      map(() => void 0),
    );
  }

  private backfillLotsFromWeighings(lots: LotOlives[], weighings: Pesee[]): Observable<LotOlives[]> {
    const existingLotIds = new Set((lots ?? []).map((lot) => Number(lot?.idLot ?? 0)).filter((id) => id > 0));
    const missingLotIds = Array.from(
      new Set(
        (weighings ?? [])
          .map((pesee) => Number(pesee?.lotId ?? 0))
          .filter((id) => id > 0 && !existingLotIds.has(id)),
      ),
    );

    if (missingLotIds.length === 0) {
      return of(lots ?? []);
    }

    console.warn('[lot-management-service] backfill lots from weighings', {
      missingLotIds,
    });

    return forkJoin(
      missingLotIds.map((idLot) =>
        this.lotOlivesService.findById(idLot).pipe(
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      map((fetchedLots) => {
        const validFetchedLots = fetchedLots.filter((item): item is LotOlives => !!item && Number(item?.idLot ?? 0) > 0);
        if (validFetchedLots.length === 0) {
          return lots ?? [];
        }

        return [...(lots ?? []), ...validFetchedLots]
          .filter((item, index, array) => array.findIndex((candidate) => candidate.idLot === item.idLot) === index);
      }),
    );
  }

  loadInitialData(huilerieNom?: string): Observable<void> {
    return this.refreshData(huilerieNom);
  }

  getLotById(lotId: number): Observable<LotOlives | undefined> {
    return this.lotOlivesService.findById(lotId).pipe(map(lot => lot ?? undefined));
  }

  getPeseesForLot(lotId: number): Observable<Pesee[]> {
    return this.traceabilityService.getLotTraceability(lotId).pipe(
      map(dto =>
        ((dto.pesees ?? dto.arrivages ?? []) as Array<{ date: string; pesee: number; idPesee?: number; idLotArrivage?: number }>).map(pesee => ({
          idPesee: pesee.idPesee ?? pesee.idLotArrivage,
          idLotArrivage: pesee.idLotArrivage,
          datePesee: pesee.date,
          pesee: Number(pesee.pesee ?? 0),
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
      datePesee: input.datePesee,
      pesee: Number(input.pesee ?? input.poidsBrut ?? 0),
      huilerieId: Number(input.huilerieId),
      origine: input.origine,
      variete: input.varieteOlive,
      varieteOlive: input.varieteOlive,
      fournisseurNom: input.fournisseurNom,
      fournisseurCIN: input.fournisseurCIN,
      maturite: input.maturite,
      dateRecolte: input.dateRecolte,
      dateReception: input.dateReception,
      dureeStockageAvantBroyage: Number(input.dureeStockageAvantBroyage),
      matierePremiereReference: String(input.matierePremiereReference ?? '').trim() || undefined,
      campagneReference: String(input.campagneReference ?? '').trim() || undefined,
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
      datePesee: input.datePesee,
      pesee: Number(input.pesee ?? input.poidsBrut ?? 0),
      huilerieId: Number(input.huilerieId),
      origine: input.origine,
      variete: input.varieteOlive,
      varieteOlive: input.varieteOlive,
      fournisseurNom: input.fournisseurNom,
      fournisseurCIN: input.fournisseurCIN,
      maturite: input.maturite,
      dateRecolte: input.dateRecolte,
      dateReception: input.dateReception,
      dureeStockageAvantBroyage: Number(input.dureeStockageAvantBroyage),
      matierePremiereReference: String(input.matierePremiereReference ?? '').trim() || undefined,
      campagneReference: String(input.campagneReference ?? '').trim() || undefined,
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
