import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ExecutionProduction, ExecutionProductionCreate, ExecutionProductionDTO } from '../models/production.models';

@Injectable({
    providedIn: 'root',
})
export class ExecutionProductionService {
    private readonly apiUrl = `${environment.apiUrl}/execution-productions`;
    private readonly produitFinalApiUrl = `${environment.apiUrl}/produitsFinaux`;

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

    createProduitFinal(execution: ExecutionProduction): Observable<ExecutionProductionDTO> {
        const dateProduction = String(execution?.dateFinReelle ?? '').trim() || new Date().toISOString().slice(0, 19);
        const payload = {
            executionProductionId: execution.idExecutionProduction,
            dateProduction,
        };

        return this.http.post<ExecutionProductionDTO>(this.produitFinalApiUrl, payload);
    }

    delete(idExecutionProduction: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${idExecutionProduction}`);
    }
}