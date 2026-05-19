import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Huilerie } from '../../machines/models/enterprise.models';
import { AdminDashboardSummary, ApiResponseDTO } from '../models/admin-dashboard.models';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
    private readonly apiUrl = `${environment.apiUrl}/admin/dashboard`;

    constructor(private http: HttpClient) { }

    getHuileries(): Observable<Huilerie[]> {
        return this.http.get<ApiResponseDTO<Huilerie[]>>(`${this.apiUrl}/huileries`).pipe(
            map((response) => response?.data ?? [])
        );
    }

    getSummary(huilerieId?: number | null, dateFrom?: string, dateTo?: string): Observable<AdminDashboardSummary> {
        let params = new HttpParams();

        const normalizedId = huilerieId == null ? '' : String(huilerieId).trim();
        if (normalizedId) {
            params = params.set('huilerieId', normalizedId);
        }

        const normalizedFrom = String(dateFrom ?? '').trim();
        if (normalizedFrom) {
            params = params.set('dateFrom', normalizedFrom);
        }

        const normalizedTo = String(dateTo ?? '').trim();
        if (normalizedTo) {
            params = params.set('dateTo', normalizedTo);
        }

        return this.http.get<ApiResponseDTO<AdminDashboardSummary>>(`${this.apiUrl}/summary`, { params }).pipe(
            map((response) => response?.data ?? this.createEmptySummary())
        );
    }

    private createEmptySummary(): AdminDashboardSummary {
        return {
            selectedHuilerieId: null,
            selectedHuilerieNom: null,
            allHuileries: true,
            productionDashboard: null,
            userStats: null,
        };
    }
}