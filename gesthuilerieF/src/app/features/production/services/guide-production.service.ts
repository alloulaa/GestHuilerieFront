import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GuideProduction, GuideProductionCreateDTO } from '../models/production.models';

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

    create(payload: GuideProductionCreateDTO): Observable<GuideProduction> {
        return this.http.post<GuideProduction>(this.apiUrl, payload);
    }

    update(idGuideProduction: number, payload: GuideProductionCreateDTO): Observable<GuideProduction> {
        return this.http.put<GuideProduction>(`${this.apiUrl}/${idGuideProduction}`, payload);
    }

    delete(idGuideProduction: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${idGuideProduction}`);
    }
}