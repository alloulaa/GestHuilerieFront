// ...existing code...
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ExecutionPredictionStartDTO, ExecutionProduction, ExecutionProductionCreate, ExecutionProductionDTO, Prediction } from '../models/production.models';
import { AuthService } from '../../../core/auth/auth.service';
import { GuideProductionService } from './guide-production.service';
import { MachineService } from '../../machines/services/machine.service';

@Injectable({
    providedIn: 'root',
})
export class ExecutionProductionService {
    private readonly apiUrl = `${environment.apiUrl}/execution-productions`;
    private readonly produitFinalApiUrl = `${environment.apiUrl}/produitsFinaux`;

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private guideProductionService: GuideProductionService,
        private machineService: MachineService,
    ) { }

    findAll(huilerieNom?: string): Observable<ExecutionProduction[]> {
        const params = this.buildHuilerieNomParams(huilerieNom);
        return this.http.get<ExecutionProduction[]>(this.apiUrl, { params });
    }

    getAll(huilerieNom?: string): Observable<ExecutionProduction[]> {
        if (this.authService.isCurrentUserAdmin()) {
            return this.findAll(huilerieNom);
        }

        return forkJoin({
            executions: this.findAll(huilerieNom),
            guides: this.guideProductionService.getAll(),
            machines: this.machineService.getAll(),
        }).pipe(
            map(({ executions, guides, machines }) => this.filterByCurrentUserHuilerie(executions, guides, machines)),
        );
    }

    findById(idExecutionProduction: number): Observable<ExecutionProduction> {
        return this.http.get<ExecutionProduction>(`${this.apiUrl}/${idExecutionProduction}`);
    }

    buildCodeLot(lotId: number): Observable<string> {
        return this.http.get(`${this.apiUrl}/build-code-lot/${lotId}`, { responseType: 'text' });
    }

    create(payload: ExecutionProductionCreate): Observable<ExecutionProduction> {
        return this.http.post<ExecutionProduction>(this.apiUrl, payload);
    }

    predictOnStart(idExecutionProduction: number, overrides: ExecutionPredictionStartDTO = {}): Observable<Prediction> {
        return this.http.post<Prediction>(`${this.apiUrl}/${idExecutionProduction}/predict-on-start`, overrides);
    }

    update(idExecutionProduction: number, payload: Partial<ExecutionProductionCreate>): Observable<ExecutionProduction> {
        return this.http.put<ExecutionProduction>(`${this.apiUrl}/${idExecutionProduction}`, payload);
    }

    private filterByCurrentUserHuilerie(executions: ExecutionProduction[], guides: any[], machines: any[]): ExecutionProduction[] {
        const currentHuilerieId = this.authService.getCurrentUserHuilerieId();
        if (!currentHuilerieId) {
            return executions;
        }

        const allowedGuideIds = new Set(guides.map((guide) => Number(guide?.idGuideProduction ?? 0)).filter((id) => id > 0));
        const allowedMachineIds = new Set(machines.map((machine) => Number(machine?.idMachine ?? 0)).filter((id) => id > 0));

        return executions.filter((execution) =>
            allowedGuideIds.has(Number(execution?.guideProductionId ?? 0))
            || allowedMachineIds.has(Number(execution?.machineId ?? 0))
            || Number(execution?.huilerieId ?? 0) === currentHuilerieId,
        );
    }

    private buildHuilerieNomParams(huilerieNom?: string): HttpParams | undefined {
        if (!this.authService.isCurrentUserAdmin()) {
            return undefined;
        }

        const normalized = String(huilerieNom ?? '').trim();
        if (!normalized) {
            return undefined;
        }

        return new HttpParams().set('huilerieNom', normalized);
    }

    createProduitFinal(
        execution: ExecutionProduction,
        produitFinal: { qualite: string; quantiteProduite: number | null; rendement?: number | null; dateFinReelle?: string | null },
    ): Observable<ExecutionProductionDTO> {
        const dateProduction = String(execution?.dateFinPrevue ?? '').trim() || new Date().toISOString().slice(0, 19);
        const dateFinReelle = String(produitFinal.dateFinReelle ?? '').trim() || new Date().toISOString().slice(0, 10);
        const produitNomFallback = String(execution?.lotVariete ?? '').trim();
        const payload = {
            executionProductionId: execution.idExecutionProduction,
            nomProduit: produitNomFallback ? `Huile ${produitNomFallback}` : `Huile lot ${execution.reference ?? execution.idExecutionProduction}`,
            quantiteProduite: Number(produitFinal.quantiteProduite ?? 0),
            qualite: String(produitFinal.qualite ?? '').trim(),
            rendement: Number(produitFinal.rendement ?? 0),
            dateProduction,
            dateFinReelle,
        };

        return this.http.post<ExecutionProductionDTO>(this.produitFinalApiUrl, payload);
    }

    delete(idExecutionProduction: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${idExecutionProduction}`);
    }

    saveValeursReelles(idExecutionProduction: number, valeurs: { parametreEtapeId: number; valeurReelle: number; uniteMesure?: string }[]): Observable<void> {
        const payload = valeurs.map((valeur) => ({
            parametreEtapeId: valeur.parametreEtapeId,
            valeurReelle: Number(valeur.valeurReelle),
            uniteMesure: valeur.uniteMesure,
        }));

        return this.http.post<void>(`${this.apiUrl}/${idExecutionProduction}/valeurs-reelles`, payload);
    }
}