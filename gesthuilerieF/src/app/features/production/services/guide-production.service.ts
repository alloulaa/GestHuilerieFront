import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GuideProduction, GuideProductionCreateDTO } from '../models/production.models';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
    providedIn: 'root',
})
export class GuideProductionService {
    private readonly apiUrl = `${environment.apiUrl}/guide-productions`;
    private readonly fallbackUpdateUrl = `${environment.apiUrl}/guide-production`;

    constructor(
        private http: HttpClient,
        private authService: AuthService,
    ) { }

    findAll(): Observable<GuideProduction[]> {
        return this.http.get<GuideProduction[]>(this.apiUrl).pipe(
            map((items) => this.filterByCurrentUserHuilerie(items ?? [])),
        );
    }

    getAll(): Observable<GuideProduction[]> {
        return this.findAll();
    }

    findById(idGuideProduction: number): Observable<GuideProduction> {
        return this.http.get<GuideProduction>(`${this.apiUrl}/${idGuideProduction}`);
    }

    create(payload: GuideProductionCreateDTO): Observable<GuideProduction> {
        return this.http.post<GuideProduction>(this.apiUrl, payload);
    }

    update(idGuideProduction: number, payload: GuideProductionCreateDTO): Observable<GuideProduction> {
        const body = {
            ...payload,
            idGuideProduction,
        } as any;

        return this.http.put<GuideProduction>(`${this.apiUrl}/${idGuideProduction}`, body).pipe(
            catchError((error) => {
                if (error?.status !== 409) {
                    return throwError(() => error);
                }

                return this.http.put<GuideProduction>(`${this.fallbackUpdateUrl}/${idGuideProduction}`, body);
            }),
        );
    }

    delete(idGuideProduction: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${idGuideProduction}`);
    }

    private filterByCurrentUserHuilerie(items: GuideProduction[]): GuideProduction[] {
        const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
        if (!currentHuilerieId) {
            return items;
        }

        return items.filter((item) => Number(item?.huilerieId ?? 0) === currentHuilerieId);
    }
}