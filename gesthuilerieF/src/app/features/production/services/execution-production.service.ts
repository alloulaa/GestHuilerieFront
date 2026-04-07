import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ExecutionProduction, ExecutionProductionCreate } from '../models/production.models';

@Injectable({
    providedIn: 'root',
})
export class ExecutionProductionService {
    private readonly apiUrl = `${environment.apiUrl}/execution-productions`;

    constructor(private http: HttpClient) { }

    findAll(): Observable<ExecutionProduction[]> {
        return this.http.get<ExecutionProduction[]>(this.apiUrl);
    }

    getAll(): Observable<ExecutionProduction[]> {
        return this.findAll();
    }

    findById(idExecutionProduction: number): Observable<ExecutionProduction> {
        return this.http.get<ExecutionProduction>(`${this.apiUrl}/${idExecutionProduction}`);
    }

    create(payload: ExecutionProductionCreate): Observable<ExecutionProduction> {
        return this.http.post<ExecutionProduction>(this.apiUrl, payload);
    }

    update(idExecutionProduction: number, payload: Partial<ExecutionProductionCreate>): Observable<ExecutionProduction> {
        return this.http.put<ExecutionProduction>(`${this.apiUrl}/${idExecutionProduction}`, payload);
    }

    createProduitFinal(idExecutionProduction: number): Observable<ExecutionProduction> {
        return this.http.post<ExecutionProduction>(`${this.apiUrl}/${idExecutionProduction}/produit-final`, {});
    }

    delete(idExecutionProduction: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${idExecutionProduction}`);
    }
}