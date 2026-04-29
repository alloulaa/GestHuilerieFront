import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Machine, Huilerie } from '../models/enterprise.models';
import { environment } from 'src/environments/environment';
import { HuilerieService } from './huilerie.service';
import { AuthService } from '../../../core/auth/auth.service';

type MachineApiDto = {
  idMachine: number;
  nomMachine: string;
  typeMachine: string;
  categorieMachine?: string;
  etatMachine: string;
  capacite: number;
  huilerieNom: string;
};

type MachineApiPayload = {
  idMachine?: number;
  nomMachine: string;
  typeMachine: string;
  categorieMachine?: string;
  etatMachine: string;
  capacite: number;
  huilerieNom: string;
  huilerieId?: number;
};

@Injectable({
  providedIn: 'root',
})
export class MachineService {
  private readonly apiUrl = `${environment.apiUrl}/machines`;

  constructor(
    private http: HttpClient,
    private huilerieService: HuilerieService,
    private authService: AuthService,
  ) { }

  findAll(huilerieNom?: string, typeMachine?: string): Observable<Machine[]> {
    const params = this.buildFindAllParams(huilerieNom, typeMachine);
    return forkJoin({
      machines: this.http.get<MachineApiDto[]>(this.apiUrl, { params }),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ machines, huileries }) => {
        const mapped = machines.map((machine) => this.fromApi(machine, huileries));
        const filtered = this.filterByCurrentUserHuilerie(mapped);
        const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
        console.log('[machine-service] findAll', {
          apiMachinesCount: machines.length,
          mappedMachinesCount: mapped.length,
          filteredMachinesCount: filtered.length,
          currentHuilerieId,
          apiMachineHuileries: machines.map(m => ({ id: m.idMachine, nom: m.huilerieNom })),
          mappedMachineHuileries: mapped.map(m => ({ id: m.idMachine, huilerieId: m.huilerieId, nom: m.huilerieNom })),
        });
        return filtered;
      }),
    );
  }

  getAll(huilerieNom?: string, typeMachine?: string): Observable<Machine[]> {
    return this.findAll(huilerieNom, typeMachine);
  }

  findById(idMachine: number): Observable<Machine> {
    return forkJoin({
      machine: this.http.get<MachineApiDto>(`${this.apiUrl}/${idMachine}`),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ machine, huileries }) => this.fromApi(machine, huileries)),
    );
  }

  findByHuilerie(huilerieNom: string): Observable<Machine[]> {
    return forkJoin({
      machines: this.http.get<MachineApiDto[]>(
        `${this.apiUrl}/huilerie/${encodeURIComponent(huilerieNom)}`,
      ),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ machines, huileries }) =>
        this.filterByCurrentUserHuilerie(
          machines.map((machine) => this.fromApi(machine, huileries)),
        ),
      ),
    );
  }

  assignMatierePremiere(
    idMachine: number,
    payload: { matierePremiereId: number },
  ): Observable<Machine> {
    return forkJoin({
      machine: this.http.patch<MachineApiDto>(
        `${this.apiUrl}/${idMachine}/matiere-premiere`,
        payload,
      ),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ machine, huileries }) => this.fromApi(machine, huileries)),
    );
  }

  create(payload: Omit<Machine, 'idMachine'>): Observable<Machine> {
    return this.huilerieService.getAll().pipe(
      map((huileries) => this.toApi(payload, huileries)),
      switchMap((body) => this.http.post<MachineApiDto>(this.apiUrl, body)),
      switchMap((created) =>
        this.huilerieService.getAll().pipe(
          map((huileries) => this.fromApi(created, huileries)),
        ),
      ),
    );
  }

  update(idMachine: number, payload: Partial<Machine>): Observable<Machine> {
    return forkJoin({
      current: this.findById(idMachine),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ current, huileries }) => {
        const merged: Omit<Machine, 'idMachine'> = {
          nomMachine: payload.nomMachine ?? current.nomMachine,
          typeMachine: payload.typeMachine ?? current.typeMachine,
          categorieMachine: payload.categorieMachine ?? current.categorieMachine,
          etatMachine: payload.etatMachine ?? current.etatMachine,
          capacite: payload.capacite ?? current.capacite,
          huilerieId: payload.huilerieId ?? current.huilerieId,
        };

        return this.toApi(merged, huileries);
      }), switchMap((body) =>
        this.http.put<MachineApiDto>(`${this.apiUrl}/${idMachine}`, {
          ...body,
          idMachine,
          huilerieId: payload.huilerieId,
        }),
      ),
      switchMap((updated) =>
        this.huilerieService.getAll().pipe(
          map((huileries) => this.fromApi(updated, huileries)),
        ),
      ),
    );
  }

  delete(idMachine: number): Observable<void> {
    return this.deactivate(idMachine).pipe(map(() => void 0));
  }

  activate(idMachine: number): Observable<Machine> {
    return forkJoin({
      machine: this.http.put<MachineApiDto>(`${this.apiUrl}/${idMachine}/activer`, {}),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ machine, huileries }) => this.fromApi(machine, huileries)),
    );
  }

  deactivate(idMachine: number): Observable<Machine> {
    return forkJoin({
      machine: this.http.put<MachineApiDto>(`${this.apiUrl}/${idMachine}/desactiver`, {}),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ machine, huileries }) => this.fromApi(machine, huileries)),
    );
  }

  private fromApi(machine: MachineApiDto, huileries: Huilerie[]): Machine {
    const huilerie = huileries.find((h) => h.nom === machine.huilerieNom);

    return {
      idMachine: machine.idMachine,
      nomMachine: machine.nomMachine,
      typeMachine: machine.typeMachine,
      categorieMachine: machine.categorieMachine,
      etatMachine: machine.etatMachine,
      capacite: machine.capacite,
      huilerieId: huilerie?.idHuilerie ?? 0,
      huilerieNom: machine.huilerieNom ?? huilerie?.nom,
    };
  }

  private filterByCurrentUserHuilerie(items: Machine[]): Machine[] {
    if (this.authService.isCurrentUserAdmin()) {
      return items;
    }

    const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
    if (!currentHuilerieId) {
      return items;
    }

    return items.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId);
  }

  private toApi(payload: Omit<Machine, 'idMachine'>, huileries: Huilerie[]): MachineApiPayload {
    const huilerie = huileries.find((h) => h.idHuilerie === payload.huilerieId);

    if (!huilerie) {
      throw new Error(`Huilerie introuvable pour l'id ${payload.huilerieId}`);
    }

    return {
      nomMachine: payload.nomMachine,
      typeMachine: payload.typeMachine,
      categorieMachine: payload.categorieMachine,
      etatMachine: payload.etatMachine,
      capacite: payload.capacite,
      huilerieNom: huilerie.nom,
    };
  }

  private buildFindAllParams(huilerieNom?: string, typeMachine?: string): HttpParams | undefined {
    let params = new HttpParams();
    let hasParams = false;

    const normalizedTypeMachine = String(typeMachine ?? '').trim();
    if (normalizedTypeMachine) {
      params = params.set('typeMachine', normalizedTypeMachine);
      hasParams = true;
    }

    if (this.authService.isCurrentUserAdmin()) {
      const normalizedHuilerieNom = String(huilerieNom ?? '').trim();
      if (normalizedHuilerieNom) {
        params = params.set('huilerieNom', normalizedHuilerieNom);
        hasParams = true;
      }
    }

    return hasParams ? params : undefined;
  }
}