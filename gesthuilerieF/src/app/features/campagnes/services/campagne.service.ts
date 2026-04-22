import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CampagneOlives, CampagneOlivesCreate } from '../models/campagne.models';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
    providedIn: 'root',
})
export class CampagneService {
    private readonly apiUrl = `${environment.apiUrl}/campagnes`;

    constructor(
        private http: HttpClient,
        private authService: AuthService,
    ) { }

    getAll(reference?: string, huilerieNom?: string): Observable<CampagneOlives[]> {
        let params = new HttpParams();
        const normalizedReference = String(reference ?? '').trim();
        const normalizedHuilerieNom = String(huilerieNom ?? '').trim();

        if (normalizedReference) {
            params = params.set('reference', normalizedReference);
        }

        if (this.authService.isCurrentUserAdmin() && normalizedHuilerieNom) {
            params = params.set('huilerieNom', normalizedHuilerieNom);
        }

        return this.http.get<unknown>(this.apiUrl, { params }).pipe(
            map((response) => this.toCampagnes(response)),
        );
    }

    findByReference(reference: string): Observable<CampagneOlives[]> {
        const normalized = String(reference ?? '').trim();
        const params = normalized ? new HttpParams().set('reference', normalized) : undefined;

        return this.http.get<unknown>(this.apiUrl, { params }).pipe(
            map((response) => this.toCampagnes(response)),
        );
    }

    create(payload: CampagneOlivesCreate): Observable<CampagneOlives> {
        return this.http.post<unknown>(this.apiUrl, payload).pipe(
            map((response) => this.toCampagne(this.unwrap(response))),
        );
    }

    update(idCampagne: number, payload: Partial<CampagneOlivesCreate>): Observable<CampagneOlives> {
        return this.http.put<unknown>(`${this.apiUrl}/${idCampagne}`, payload).pipe(
            map((response) => this.toCampagne(this.unwrap(response))),
        );
    }

    delete(idCampagne: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${idCampagne}`);
    }

    private toCampagnes(response: unknown): CampagneOlives[] {
        const raw = response as any;
        const list = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.content)
                    ? raw.content
                    : Array.isArray(raw?.items)
                        ? raw.items
                        : [];

        return list.map((item: any) => this.toCampagne(item));
    }

    private toCampagne(item: any): CampagneOlives {
        return {
            idCampagne: Number(item?.idCampagne ?? item?.id ?? item?.campagneId ?? 0) || undefined,
            reference: String(item?.reference ?? item?.code ?? '').trim(),
            annee: String(item?.annee ?? '').trim() || undefined,
            dateDebut: String(item?.dateDebut ?? item?.debut ?? '').trim() || undefined,
            dateFin: String(item?.dateFin ?? item?.fin ?? '').trim() || undefined,
            huilerieId: item?.huilerieId != null ? Number(item.huilerieId) : undefined,
            huilerieNom: String(item?.huilerieNom ?? item?.huilerie?.nom ?? '').trim() || undefined,
        };
    }

    private unwrap(response: unknown): any {
        const raw = response as any;
        if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && typeof raw.data === 'object') {
            return raw.data;
        }
        return raw;
    }
}
