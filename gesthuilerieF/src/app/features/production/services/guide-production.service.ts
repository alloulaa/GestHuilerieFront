import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GuideProduction } from '../models/production.models';

@Injectable({
    providedIn: 'root',
})
export class GuideProductionService {
    private readonly apiUrl = `${environment.apiUrl}/guide-productions`;

    constructor(private http: HttpClient) { }

    findAll(): Observable<GuideProduction[]> {
        return this.http.get<GuideProduction[]>(this.apiUrl);
    }

    getAll(): Observable<GuideProduction[]> {
        return this.findAll();
    }

    findById(idGuideProduction: number): Observable<GuideProduction> {
        return this.http.get<GuideProduction>(`${this.apiUrl}/${idGuideProduction}`);
    }

    create(payload: Omit<GuideProduction, 'idGuideProduction' | 'reference'>): Observable<GuideProduction> {
        return this.http.post<GuideProduction>(this.apiUrl, payload);
    }
}