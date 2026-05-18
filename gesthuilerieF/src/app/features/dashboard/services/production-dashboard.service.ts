import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductionDashboardSummary } from '../models/production-dashboard.models';

@Injectable({ providedIn: 'root' })
export class ProductionDashboardService {
    private readonly apiUrl = `${environment.apiUrl}/dashboard/production/summary`;
    private productionAddedSubject = new Subject<{ date: string; quantite: number }>();
    productionAdded$ = this.productionAddedSubject.asObservable();

    constructor(private http: HttpClient) { }

    getSummary(dateFrom?: string, dateTo?: string): Observable<ProductionDashboardSummary> {
        let params = new HttpParams();

        const normalizedFrom = String(dateFrom ?? '').trim();
        if (normalizedFrom) {
            params = params.set('dateFrom', normalizedFrom);
        }

        const normalizedTo = String(dateTo ?? '').trim();
        if (normalizedTo) {
            params = params.set('dateTo', normalizedTo);
        }

        return this.http.get<ProductionDashboardSummary>(this.apiUrl, { params });
    }

    notifyProductionAdded(dateIso: string, quantite: number): void {
        this.productionAddedSubject.next({ date: dateIso, quantite });
    }
}
