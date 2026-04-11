import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Machine, Huilerie } from '../models/enterprise.models';
import { environment } from 'src/environments/environment';
import { HuilerieService } from './huilerie.service';

type MachineApiDto = {
  idMachine: number;
  nomMachine: string;
  typeMachine: string;
  etatMachine: string;
  capacite: number;
  huilerieNom: string;
};

type MachineApiPayload = {
  idMachine?: number;
  nomMachine: string;
  typeMachine: string;
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
  ) { }

  findAll(): Observable<Machine[]> {
    return forkJoin({
      machines: this.http.get<MachineApiDto[]>(this.apiUrl),
      huileries: this.huilerieService.getAll(),
    }).pipe(
      map(({ machines, huileries }) =>
        machines.map((machine) => this.fromApi(machine, huileries)),
      ),
    );
  }

  getAll(): Observable<Machine[]> {
    return this.findAll();
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
        machines.map((machine) => this.fromApi(machine, huileries)),
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
    return this.http.delete<void>(`${this.apiUrl}/${idMachine}`);
  }

  private fromApi(machine: MachineApiDto, huileries: Huilerie[]): Machine {
    const huilerie = huileries.find((h) => h.nom === machine.huilerieNom);

    return {
      idMachine: machine.idMachine,
      nomMachine: machine.nomMachine,
      typeMachine: machine.typeMachine,
      etatMachine: machine.etatMachine,
      capacite: machine.capacite,
      huilerieId: huilerie?.idHuilerie ?? 0,
    };
  }

  private toApi(payload: Omit<Machine, 'idMachine'>, huileries: Huilerie[]): MachineApiPayload {
    const huilerie = huileries.find((h) => h.idHuilerie === payload.huilerieId);

    if (!huilerie) {
      throw new Error(`Huilerie introuvable pour l'id ${payload.huilerieId}`);
    }

    return {
      nomMachine: payload.nomMachine,
      typeMachine: payload.typeMachine,
      etatMachine: payload.etatMachine,
      capacite: payload.capacite,
      huilerieNom: huilerie.nom,
    };
  }
}