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
          acidite_huile_pourcent: Number(item.acidite_huile_pourcent ?? item.acidite ?? item.aciditeHuilePourcent ?? 0),
          indice_peroxyde_meq_o2_kg: Number(item.indice_peroxyde_meq_o2_kg ?? item.indicePeroxyde ?? item.indice_peroxyde ?? 0),
          polyphenols_mg_kg: Number(item.polyphenols_mg_kg ?? item.polyphenolsMgKg ?? item.polyphenols ?? 0),
          k232: Number(item.k232 ?? 0),
          k270: Number(item.k270 ?? 0),
          dateAnalyse: String(item.dateAnalyse ?? item.date_analyse ?? ''),
          lotId: Number(item.lotId ?? item.lot_id ?? lotId),
        }));
      }),
    );
  }

  addToStore(payload: {
    lotId: number;
    acidite_huile_pourcent: number;
    indice_peroxyde_meq_o2_kg: number;
    polyphenols_mg_kg: number;
    k232: number;
    k270: number;
    dateAnalyse?: string;
  }): Observable<AnalyseLaboratoire> {
    return this.http.post<AnalyseLaboratoire>(this.apiUrl, payload);
  }
}