import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Entreprise } from '../models/enterprise.models';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class EntrepriseService {
    private readonly apiUrl = `${environment.apiUrl}/entreprises`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<Entreprise[]> {
        return this.http.get<Entreprise[]>(this.apiUrl);
    }

    getById(id: number): Observable<Entreprise> {
        return this.http.get<Entreprise>(`${this.apiUrl}/${id}`);
    }
}
