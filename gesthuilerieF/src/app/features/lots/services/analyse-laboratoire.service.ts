import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AnalyseLaboratoire } from '../models/lot.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalyseLaboratoireService {
  private readonly apiUrl = `${environment.apiUrl}/analysesLaboratoire`;

  constructor(private http: HttpClient) { }

  getByLot(lotId: number): Observable<AnalyseLaboratoire[]> {
    return this.http.get<unknown>(`${this.apiUrl}/lot/${lotId}`).pipe(
      map(response => {
        const raw = response as any;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

        return list.map((item: any) => ({
          idAnalyse: Number(item.idAnalyse ?? item.id_analyse ?? 0),
          reference: String(item.reference ?? item.analyseReference ?? '').trim() || undefined,
          acidite: Number(item.acidite ?? 0),
          indicePeroxyde: Number(item.indicePeroxyde ?? item.indice_peroxyde ?? 0),
          k232: Number(item.k232 ?? 0),
          k270: Number(item.k270 ?? 0),
          classeQualiteFinale: String(item.classeQualiteFinale ?? item.classe_qualite_finale ?? ''),
          dateAnalyse: String(item.dateAnalyse ?? item.date_analyse ?? ''),
          lotId: Number(item.lotId ?? item.lot_id ?? lotId),
        }));
      }),
    );
  }

  addToStore(payload: {
    lotId: number;
    acidite: number;
    indicePeroxyde: number;
    k232: number;
    k270: number;
    classeQualiteFinale?: string;
    dateAnalyse?: string;
  }): Observable<AnalyseLaboratoire> {
    return this.http.post<AnalyseLaboratoire>(this.apiUrl, payload);
  }
}