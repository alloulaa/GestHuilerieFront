// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\core\services\admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';

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
  actif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  private normalizeUtilisateurPayload(payload: any): any {
    const profilId = payload?.profilId ?? payload?.idProfil ?? payload?.profil?.idProfil ?? null;
    const huilerieId =
      payload?.huilerieId ?? payload?.huilierieId ?? payload?.idHuilerie ?? payload?.huilerie?.idHuilerie ?? null;

    return {
      ...payload,
      profilId,
      idProfil: profilId,
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
  getProfils(): Observable<{ data: Profil[] }> {
    const url = `${API_URL}/api/admin/profils`;
    return this.http
      .get<ApiResponseDTO<Profil[]>>(url)
      .pipe(
        map((response) => ({ data: response?.data ?? [] })),
        catchError(this.logAndThrow('getProfils', url))
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
    const url = `${API_URL}/api/admin/utilisateurs`;
    return this.http
      .get<ApiResponseDTO<any[]>>(url)
      .pipe(
        map((response) => ({ data: response?.data ?? [] })),
        catchError(this.logAndThrow('getUtilisateurs', url))
      );
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
    return this.http
      .put<ApiResponseDTO<any>>(url, normalizedPayload)
      .pipe(
        map((response) => response.data),
        catchError(this.logAndThrow('updateUtilisateur', url, { id, payload: normalizedPayload }))
      );
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
  }
}
