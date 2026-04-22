import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const API_URL = '';

interface ApiResponseDTO<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface Profil {
  id?: number;
  nom: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  id?: number;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExecuted: boolean;
}

export interface User {
  id?: number;
  email: string;
  fullName: string;
  companyName?: string;
  profilId?: number;
  profil?: Profil;
  entrepriseId?: number | null;
  huilerieId?: number | null;
  actif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) { }

  private normalizeUtilisateurPayload(payload: any): any {
    const profilId = payload?.profilId ?? payload?.idProfil ?? payload?.profil?.idProfil ?? null;
    const entrepriseId =
      payload?.entrepriseId ?? payload?.idEntreprise ?? payload?.entreprise?.idEntreprise ?? this.authService.getCurrentUserEntrepriseId() ?? null;
    const huilerieId =
      payload?.huilerieId ?? payload?.huilierieId ?? payload?.idHuilerie ?? payload?.huilerie?.idHuilerie ?? null;

    return {
      ...payload,
      profilId,
      idProfil: profilId,
      entrepriseId,
      idEntreprise: entrepriseId,
      huilerieId,
      idHuilerie: huilerieId,
    };
  }

  private logAndThrow(action: string, url: string, payload?: unknown) {
    return (error: any) => {
      console.error(`[AdminService] ${action} failed`, {
        url,
        payload,
        status: error?.status,
        message: error?.message,
        backendError: error?.error,
      });
      return throwError(() => error);
    };
  }

  // Modules endpoints (used by permissions editor)
  getModules(): Observable<{ data: any[] }> {
    const url = `${API_URL}/api/admin/modules`;
    return this.http
      .get<ApiResponseDTO<any[]>>(url)
      .pipe(
        map((response) => ({ data: response?.data ?? [] })),
        catchError(this.logAndThrow('getModules', url))
      );
  }

  getPermissionsByProfil(profilId: number): Observable<{ data: any[]; profilNom?: string }> {
    const url = `${API_URL}/api/admin/permissions/profil/${profilId}`;
    return this.http
      .get<ApiResponseDTO<any>>(url)
      .pipe(
        map((response) => {
          const payload = response?.data;
          if (Array.isArray(payload)) {
            return { data: payload };
          }

          return {
            data: payload?.permissions ?? payload?.data ?? [],
            profilNom: payload?.profilNom,
          };
        }),
        catchError(this.logAndThrow('getPermissionsByProfil', url, { profilId }))
      );
  }

  bulkSavePermissions(payload: {
    profilId: number;
    permissions: Array<{
      moduleId: number;
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
      canExecuted: boolean;
    }>;
  }): Observable<any> {
    const url = `${API_URL}/api/admin/permissions/bulk`;
    return this.http
      .post<ApiResponseDTO<any>>(url, payload)
      .pipe(
        map((response) => response?.data),
        catchError(this.logAndThrow('bulkSavePermissions', url, payload))
      );
  }

  // Profils endpoints
  getProfils(huilerieNom?: string): Observable<{ data: Profil[] }> {
    const normalized = String(huilerieNom ?? '').trim();
    const url = normalized ? `${API_URL}/api/admin/profils?huilerieNom=${encodeURIComponent(normalized)}` : `${API_URL}/api/admin/profils`;
    return this.http
      .get<ApiResponseDTO<Profil[]>>(url)
      .pipe(
        map((response) => ({ data: response?.data ?? [] })),
        catchError(this.logAndThrow('getProfils', url, { huilerieNom: normalized }))
      );
  }

  getProfilById(id: number): Observable<Profil> {
    const url = `${API_URL}/api/admin/profils/${id}`;
    return this.http
      .get<ApiResponseDTO<Profil>>(url)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('getProfilById', url, { id }))
      );
  }

  createProfil(profil: Profil): Observable<Profil> {
    const url = `${API_URL}/api/admin/profils`;
    return this.http
      .post<ApiResponseDTO<Profil>>(url, profil)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('createProfil', url, profil))
      );
  }

  updateProfil(id: number, profil: Profil): Observable<Profil> {
    const url = `${API_URL}/api/admin/profils/${id}`;
    return this.http
      .put<ApiResponseDTO<Profil>>(url, profil)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('updateProfil', url, { id, profil }))
      );
  }

  deleteProfil(id: number): Observable<void> {
    const url = `${API_URL}/api/admin/profils/${id}`;
    return this.http
      .delete<ApiResponseDTO<unknown>>(url)
      .pipe(
        map(() => void 0),
        catchError(this.logAndThrow('deleteProfil', url, { id }))
      );
  }

  // Permissions endpoints
  getPermissions(profilId: number): Observable<Permission[]> {
    const url = `${API_URL}/api/admin/permissions/profil/${profilId}`;
    return this.http
      .get<ApiResponseDTO<Permission[]>>(url)
      .pipe(
        map((response) => response?.data ?? []),
        catchError(this.logAndThrow('getPermissions', url, { profilId }))
      );
  }

  updatePermissions(profilId: number, permissions: Permission[]): Observable<Permission[]> {
    const url = `${API_URL}/api/admin/permissions/bulk`;
    const payload = {
      profilId,
      permissions,
    };
    return this.http
      .post<ApiResponseDTO<Permission[]>>(url, payload)
      .pipe(
        map((response) => response?.data ?? []),
        catchError(this.logAndThrow('updatePermissions', url, payload))
      );
  }

  // Users endpoints
  getUsers(page?: number, limit?: number): Observable<{ data: User[]; total: number }> {
    let url = `${API_URL}/api/admin/utilisateurs`;
    if (page && limit) {
      url += `?page=${page}&limit=${limit}`;
    }
    return this.http
      .get<ApiResponseDTO<{ data: User[]; total: number }>>(url)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('getUsers', url, { page, limit }))
      );
  }

  getUserById(id: number): Observable<User> {
    const url = `${API_URL}/api/admin/utilisateurs/${id}`;
    return this.http
      .get<ApiResponseDTO<User>>(url)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('getUserById', url, { id }))
      );
  }

  createUser(user: User): Observable<User> {
    const url = `${API_URL}/api/admin/utilisateurs`;
    return this.http
      .post<ApiResponseDTO<User>>(url, user)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('createUser', url, user))
      );
  }

  updateUser(id: number, user: User): Observable<User> {
    const url = `${API_URL}/api/admin/utilisateurs/${id}`;
    return this.http
      .put<ApiResponseDTO<User>>(url, user)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('updateUser', url, { id, user }))
      );
  }

  deleteUser(id: number): Observable<void> {
    const url = `${API_URL}/api/admin/utilisateurs/${id}`;
    return this.http
      .delete<ApiResponseDTO<unknown>>(url)
      .pipe(
        map(() => void 0),
        catchError(this.logAndThrow('deleteUser', url, { id }))
      );
  }

  toggleUserStatus(id: number, actif: boolean): Observable<User> {
    const url = `${API_URL}/api/admin/utilisateurs/${id}/activer`;
    return this.http
      .put<ApiResponseDTO<User>>(url, { actif })
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('toggleUserStatus', url, { id, actif }))
      );
  }

  // Legacy aliases used by existing admin components
  getUtilisateurs(): Observable<any> {
    const legacyUrl = `${API_URL}/api/admin/utilisateurs`;
    const adminsUrl = `${API_URL}/api/administrateurs`;
    const employesUrl = `${API_URL}/api/employes`;

    const typedUsers$ = forkJoin([
      this.http.get<any>(adminsUrl).pipe(
        map((response) => this.extractArrayPayload(response).map((item) => this.normalizeTypedUser(item, 'ADMINISTRATEUR'))),
      ),
      this.http.get<any>(employesUrl).pipe(
        map((response) => this.extractArrayPayload(response).map((item) => this.normalizeTypedUser(item, 'EMPLOYE'))),
      ),
    ]).pipe(
      map(([admins, employes]) => [...admins, ...employes]),
    );

    const legacyUsers$ = this.http
      .get<ApiResponseDTO<any[]>>(legacyUrl)
      .pipe(
        map((response) => this.extractArrayPayload(response)),
        catchError(() => of([])),
      );

    return forkJoin([legacyUsers$, typedUsers$]).pipe(
      map(([legacyUsers, typedUsers]) => ({
        data: this.mergeUsersByIdentity(legacyUsers, typedUsers),
      })),
    );
  }

  private mergeUsersByIdentity(legacyUsers: any[], typedUsers: any[]): any[] {
    const merged = new Map<string, any>();

    const createKey = (user: any): string => {
      const id = Number(
        user?.idUtilisateur
        ?? user?.utilisateurId
        ?? user?.utilisateur?.idUtilisateur
        ?? user?.utilisateur?.utilisateurId
        ?? 0,
      );

      if (id > 0) {
        return `id:${id}`;
      }

      const email = String(user?.email ?? user?.utilisateur?.email ?? '').trim().toLowerCase();
      if (email) {
        return `email:${email}`;
      }

      return `raw:${JSON.stringify(user)}`;
    };

    for (const user of legacyUsers ?? []) {
      merged.set(createKey(user), user);
    }

    for (const user of typedUsers ?? []) {
      const key = createKey(user);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, user);
        continue;
      }

      const existingProfilNom = String(existing?.profil?.nom ?? '').trim();
      const typedProfilNom = String(user?.profil?.nom ?? '').trim();
      const shouldKeepExistingProfilNom = !!existingProfilNom && this.isGenericTypedProfileName(typedProfilNom);

      merged.set(key, {
        ...existing,
        ...user,
        profil: {
          ...(existing?.profil ?? {}),
          ...(user?.profil ?? {}),
          nom: shouldKeepExistingProfilNom ? existingProfilNom : (typedProfilNom || existingProfilNom),
        },
      });
    }

    return Array.from(merged.values());
  }

  private isGenericTypedProfileName(profileName: string): boolean {
    const normalized = String(profileName ?? '').trim().toUpperCase();
    return normalized === 'EMPLOYE' || normalized === 'ADMINISTRATEUR';
  }

  private extractArrayPayload(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    return [];
  }

  private normalizeTypedUser(item: any, fallbackProfileName: string): any {
    const utilisateur = item?.utilisateur ?? item;
    const hasTypedEntityId = item?.idEmploye != null || item?.idAdministrateur != null;
    const idUtilisateurCandidates = [
      utilisateur?.idUtilisateur,
      utilisateur?.utilisateurId,
      item?.idUtilisateur,
      item?.utilisateurId,
      item?.utilisateur?.idUtilisateur,
      item?.utilisateur?.utilisateurId,
      utilisateur?.id,
      item?.utilisateur?.id,
      hasTypedEntityId ? null : item?.id,
    ];

    const idUtilisateur = Number(idUtilisateurCandidates.find((value) => Number(value) > 0) ?? 0) || undefined;

    const explicitProfilNom = String(
      utilisateur?.profil?.nom
      ?? utilisateur?.profilName
      ?? utilisateur?.profilNom
      ?? utilisateur?.role
      ?? item?.role
      ?? '',
    ).trim();

    const profilId = Number(
      utilisateur?.profil?.idProfil
      ?? utilisateur?.profilId
      ?? utilisateur?.idProfil
      ?? item?.profilId
      ?? item?.idProfil
      ?? 0,
    ) || undefined;

    const profilNom = explicitProfilNom || (profilId ? '' : fallbackProfileName);

    return {
      ...item,
      ...utilisateur,
      idUtilisateur,
      nom: String(utilisateur?.nom ?? item?.nom ?? '').trim(),
      prenom: String(utilisateur?.prenom ?? item?.prenom ?? '').trim(),
      email: String(utilisateur?.email ?? item?.email ?? '').trim(),
      telephone: utilisateur?.telephone ?? item?.telephone,
      profil: {
        ...(utilisateur?.profil ?? {}),
        idProfil: profilId,
        nom: profilNom,
      },
      profilId,
      huilerieId: Number(
        utilisateur?.huilerieId
        ?? utilisateur?.idHuilerie
        ?? item?.huilerieId
        ?? item?.idHuilerie
        ?? utilisateur?.huilerie?.idHuilerie
        ?? utilisateur?.huilerie?.id
        ?? item?.huilerie?.idHuilerie
        ?? item?.huilerie?.id
        ?? 0,
      ) || undefined,
      entrepriseId: Number(
        utilisateur?.entrepriseId
        ?? utilisateur?.idEntreprise
        ?? item?.entrepriseId
        ?? item?.idEntreprise
        ?? utilisateur?.entreprise?.idEntreprise
        ?? utilisateur?.entreprise?.id
        ?? item?.entreprise?.idEntreprise
        ?? item?.entreprise?.id
        ?? 0,
      ) || undefined,
    };
  }

  createUtilisateur(payload: any): Observable<any> {
    const url = `${API_URL}/api/admin/utilisateurs`;
    const normalizedPayload = this.normalizeUtilisateurPayload(payload);
    return this.http
      .post<ApiResponseDTO<any>>(url, normalizedPayload)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('createUtilisateur', url, normalizedPayload))
      );
  }

  updateUtilisateur(id: number, payload: any): Observable<any> {
    const url = `${API_URL}/api/admin/utilisateurs/${id}`;
    const normalizedPayload = this.normalizeUtilisateurPayload(payload);

    const employeId = Number(
      payload?.idEmploye
      ?? payload?.employe?.idEmploye
      ?? 0,
    );

    const administrateurId = Number(
      payload?.idAdministrateur
      ?? payload?.administrateur?.idAdministrateur
      ?? 0,
    );

    const fallbackPayload = {
      nom: normalizedPayload?.nom,
      prenom: normalizedPayload?.prenom,
      email: normalizedPayload?.email,
      telephone: normalizedPayload?.telephone,
      profilId: normalizedPayload?.profilId,
      idProfil: normalizedPayload?.idProfil,
      huilerieId: normalizedPayload?.huilerieId,
      idHuilerie: normalizedPayload?.idHuilerie,
      entrepriseId: normalizedPayload?.entrepriseId,
      idEntreprise: normalizedPayload?.idEntreprise,
    };

    const updateEmployeUrl = `${API_URL}/api/employes/${employeId}`;
    const updateAdministrateurUrl = `${API_URL}/api/administrateurs/${administrateurId}`;
    const targetUserId = Number(payload?.idUtilisateur ?? payload?.utilisateurId ?? id ?? 0);
    const targetEmail = String(normalizedPayload?.email ?? '').trim().toLowerCase();

    const resolveAndUpdateTypedUser$ = forkJoin([
      this.http.get<any>(`${API_URL}/api/employes`).pipe(map((response) => this.extractArrayPayload(response))),
      this.http.get<any>(`${API_URL}/api/administrateurs`).pipe(map((response) => this.extractArrayPayload(response))),
    ]).pipe(
      switchMap(([employes, administrateurs]) => {
        const resolvedEmployeId = this.resolveTypedEntityId(employes, 'idEmploye', targetUserId, targetEmail);
        if (resolvedEmployeId > 0) {
          return this.http
            .put<ApiResponseDTO<any>>(`${API_URL}/api/employes/${resolvedEmployeId}`, fallbackPayload)
            .pipe(
              map((response) => response?.data ?? response),
              catchError(this.logAndThrow('updateUtilisateurResolvedEmploye', `${API_URL}/api/employes/${resolvedEmployeId}`, { id, targetUserId, targetEmail, payload: fallbackPayload })),
            );
        }

        const resolvedAdminId = this.resolveTypedEntityId(administrateurs, 'idAdministrateur', targetUserId, targetEmail);
        if (resolvedAdminId > 0) {
          return this.http
            .put<ApiResponseDTO<any>>(`${API_URL}/api/administrateurs/${resolvedAdminId}`, fallbackPayload)
            .pipe(
              map((response) => response?.data ?? response),
              catchError(this.logAndThrow('updateUtilisateurResolvedAdministrateur', `${API_URL}/api/administrateurs/${resolvedAdminId}`, { id, targetUserId, targetEmail, payload: fallbackPayload })),
            );
        }

        return this.logAndThrow('updateUtilisateurResolveTypedId', url, { id, targetUserId, targetEmail, payload: normalizedPayload })({ status: 403, message: 'Impossible de résoudre l\'identifiant employé/administrateur pour la mise à jour.' });
      }),
    );

    return this.http
      .put<ApiResponseDTO<any>>(url, normalizedPayload)
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          const shouldFallback = error?.status === 403 || error?.status === 404;
          if (!shouldFallback) {
            return this.logAndThrow('updateUtilisateur', url, { id, payload: normalizedPayload })(error);
          }

          if (employeId > 0) {
            return this.http
              .put<ApiResponseDTO<any>>(updateEmployeUrl, fallbackPayload)
              .pipe(
                map((response) => response?.data ?? response),
                catchError(this.logAndThrow('updateUtilisateurFallbackEmploye', updateEmployeUrl, { id, employeId, payload: fallbackPayload })),
              );
          }

          if (administrateurId > 0) {
            return this.http
              .put<ApiResponseDTO<any>>(updateAdministrateurUrl, fallbackPayload)
              .pipe(
                map((response) => response?.data ?? response),
                catchError(this.logAndThrow('updateUtilisateurFallbackAdministrateur', updateAdministrateurUrl, { id, administrateurId, payload: fallbackPayload })),
              );
          }

          return resolveAndUpdateTypedUser$;
        })
      );
  }

  private resolveTypedEntityId(items: any[], entityIdKey: 'idEmploye' | 'idAdministrateur', targetUserId: number, targetEmail: string): number {
    for (const item of items ?? []) {
      const utilisateur = item?.utilisateur ?? item;
      const userId = Number(
        utilisateur?.idUtilisateur
        ?? utilisateur?.utilisateurId
        ?? item?.idUtilisateur
        ?? item?.utilisateurId
        ?? utilisateur?.id
        ?? 0,
      );

      const email = String(utilisateur?.email ?? item?.email ?? '').trim().toLowerCase();
      const entityId = Number(item?.[entityIdKey] ?? item?.id ?? 0);

      const matchesByUserId = targetUserId > 0 && userId > 0 && userId === targetUserId;
      const matchesByEmail = !!targetEmail && !!email && email === targetEmail;

      if ((matchesByUserId || matchesByEmail) && entityId > 0) {
        return entityId;
      }
    }

    return 0;
  }

  deleteUtilisateur(id: number): Observable<any> {
    const url = `${API_URL}/api/admin/utilisateurs/${id}`;
    return this.http
      .delete<ApiResponseDTO<any>>(url)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('deleteUtilisateur', url, { id }))
      );
  }

  toggleActif(id: number): Observable<any> {
    const getUserUrl = `${API_URL}/api/admin/utilisateurs/${id}`;
    const toggleUrl = `${API_URL}/api/admin/utilisateurs/${id}/activer`;
    return this.getUserById(id).pipe(
      switchMap((user) =>
        this.http
          .put<ApiResponseDTO<any>>(toggleUrl, { actif: !user?.actif })
          .pipe(
            map((response) => response.data),
            catchError(this.logAndThrow('toggleActif', toggleUrl, { id, actif: !user?.actif }))
          )
      ),
      catchError(this.logAndThrow('toggleActif_getUserById', getUserUrl, { id }))
    );
  };

}

