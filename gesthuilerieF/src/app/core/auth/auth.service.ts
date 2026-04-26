
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly refreshTokenKey = 'huilerie_refresh_token';

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<any>(
      JSON.parse(localStorage.getItem('currentUser') || 'null')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  getTokenExpirationDate(token: string): Date | null {
    const payload = this.decodeJwtPayload(token);
    if (!payload?.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  }

  isTokenExpired(token: string): boolean {
    const expirationDate = this.getTokenExpirationDate(token);
    if (!expirationDate) {
      return true;
    }

    return expirationDate.getTime() <= Date.now();
  }

  getTokenTimeRemainingMs(token: string): number | null {
    const expirationDate = this.getTokenExpirationDate(token);
    if (!expirationDate) {
      return null;
    }

    return Math.max(0, expirationDate.getTime() - Date.now());
  }

  private extractToken(payload: any): string | null {
    return (
      payload?.token ??
      payload?.jwt_token ??
      payload?.access_token ??
      payload?.accessToken ??
      payload?.jwt ??
      payload?.data?.token ??
      payload?.data?.jwt_token ??
      payload?.data?.access_token ??
      payload?.data?.accessToken ??
      payload?.user?.token ??
      payload?.user?.jwt_token ??
      payload?.user?.access_token ??
      payload?.user?.accessToken ??
      payload?.utilisateur?.token ??
      payload?.utilisateur?.jwt_token ??
      payload?.utilisateur?.access_token ??
      payload?.utilisateur?.accessToken ??
      null
    );
  }

  private extractUser(payload: any): any {
    return payload?.utilisateur ?? payload?.user ?? payload?.data?.utilisateur ?? payload?.data?.user ?? payload?.data ?? payload;
  }

  private persistProfileUpdateResponse(response: any): void {
    const existingUser = this.getCurrentUser() ?? {};
    const user = this.extractUser(response) ?? {};
    const token = this.extractToken(response) ?? this.getToken();
    const refreshToken = response?.refreshToken ?? response?.data?.refreshToken ?? this.getRefreshToken();
    const huilerieId = this.extractCurrentUserHuilerieId(response) ?? this.extractCurrentUserHuilerieId(user) ?? this.extractCurrentUserHuilerieId(existingUser) ?? null;
    const entrepriseId = this.extractCurrentUserEntrepriseId(response) ?? this.extractCurrentUserEntrepriseId(user) ?? this.extractCurrentUserEntrepriseId(existingUser) ?? null;

    const storedUser = {
      ...existingUser,
      ...user,
      token: token ?? undefined,
      refreshToken: refreshToken ?? undefined,
      huilerieId: huilerieId ?? existingUser?.huilerieId ?? user?.huilerieId ?? undefined,
      idHuilerie: huilerieId ?? existingUser?.idHuilerie ?? user?.idHuilerie ?? undefined,
      entrepriseId: entrepriseId ?? existingUser?.entrepriseId ?? user?.entrepriseId ?? undefined,
      idEntreprise: entrepriseId ?? existingUser?.idEntreprise ?? user?.idEntreprise ?? undefined,
      permissions:
        response?.permissions ??
        response?.data?.permissions ??
        user?.permissions ??
        existingUser?.permissions ??
        [],
    };

    localStorage.setItem('currentUser', JSON.stringify(storedUser));

    if (token) {
      localStorage.setItem('huilerie_token', token);
      localStorage.setItem('token', token);
    }

    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }

    this.currentUserSubject.next(storedUser);
  }

  private persistAuthResponse(response: any): void {
    const user = this.extractUser(response);
    const token = this.extractToken(response);
    const refreshToken = response?.refreshToken ?? response?.data?.refreshToken ?? null;
    const huilerieId = this.extractCurrentUserHuilerieId(response) ?? this.extractCurrentUserHuilerieId(user) ?? null;
    const entrepriseId = this.extractCurrentUserEntrepriseId(response) ?? this.extractCurrentUserEntrepriseId(user) ?? null;

    const storedUser = {
      ...user,
      token: token ?? undefined,
      refreshToken: refreshToken ?? undefined,
      huilerieId: huilerieId ?? user?.huilerieId ?? undefined,
      idHuilerie: huilerieId ?? user?.idHuilerie ?? undefined,
      entrepriseId: entrepriseId ?? user?.entrepriseId ?? undefined,
      idEntreprise: entrepriseId ?? user?.idEntreprise ?? undefined,
      permissions: response?.permissions ?? response?.data?.permissions ?? user?.permissions ?? [],
    };

    localStorage.setItem('currentUser', JSON.stringify(storedUser));

    if (token) {
      localStorage.setItem('huilerie_token', token);
      localStorage.setItem('token', token);
    }

    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }

    this.currentUserSubject.next(storedUser);
  }

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, { email, motDePasse: password })
      .pipe(tap((response) => this.persistAuthResponse(response)));
  }

  signup(payload: any): Observable<any> {
    const signupPayload = {
      nom: payload?.nom,
      prenom: payload?.prenom,
      email: payload?.email,
      motDePasse: payload?.motDePasse,
      telephone: payload?.telephone,
    };

    console.log('[AuthService] signup request', {
      url: `${this.apiUrl}/signup`,
      payloadPreview: {
        nom: signupPayload.nom,
        prenom: signupPayload.prenom,
        email: signupPayload.email,
        telephone: signupPayload.telephone,
        motDePasseLength: String(signupPayload.motDePasse ?? '').length,
      },
    });

    return this.http.post<any>(`${this.apiUrl}/signup`, signupPayload);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verify-email`, {
      params: { token }
    });
  }

  persistSessionFromResponse(response: any): boolean {
    const token = this.extractToken(response);
    if (!token) {
      return false;
    }

    this.persistAuthResponse(response);
    return true;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('huilerie_token');
    localStorage.removeItem('token');
    localStorage.removeItem(this.refreshTokenKey);
    this.currentUserSubject.next(null);
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<any>(`${this.apiUrl}/refresh`, {
      refreshToken,
    });
  }

  applyRefreshResponse(response: any): boolean {
    const token = this.extractToken(response);
    if (!token) {
      return false;
    }

    this.setAccessToken(token);
    return true;
  }

  getMe(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(tap((response) => this.persistAuthResponse(response)));
  }

  updateProfile(payload: any): Observable<any> {
    return this.http
      .put<any>(`${this.apiUrl}/me`, payload)
      .pipe(tap((response) => this.persistProfileUpdateResponse(response)));
  }

  resetPasswordRequest(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password/request`, { email });
  }

  resetPasswordConfirm(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password/confirm`, {
      token,
      newPassword,
      password: newPassword,
      motDePasse: newPassword,
      nouveauMotDePasse: newPassword
    });
  }

  getCurrentUser(): any {
    const rawUser = localStorage.getItem('currentUser');
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  getCurrentUserHuilerieId(): number | null {
    const user = this.getCurrentUser();
    const fromUser = this.extractCurrentUserHuilerieId(user);
    if (fromUser) {
      return fromUser;
    }

    const token = this.getToken();
    if (token) {
      const fromToken = this.extractCurrentUserHuilerieId(this.decodeJwtPayload(token));
      if (fromToken) {
        return fromToken;
      }
    }

    return null;
  }

  getCurrentUserEntrepriseId(): number | null {
    const user = this.getCurrentUser();
    const fromUser = this.extractCurrentUserEntrepriseId(user);
    if (fromUser) {
      return fromUser;
    }

    const token = this.getToken();
    if (token) {
      const fromToken = this.extractCurrentUserEntrepriseId(this.decodeJwtPayload(token));
      if (fromToken) {
        return fromToken;
      }
    }

    return null;
  }

  isCurrentUserAdmin(): boolean {
    const user = this.getCurrentUser();
    if (user?.isAdmin === true || user?.utilisateur?.isAdmin === true) {
      return true;
    }

    const roleCandidates = [
      user?.role,
      user?.roleName,
      user?.profil,
      user?.profilName,
      user?.profil?.nom,
      user?.profil?.name,
      user?.utilisateur?.role,
      user?.utilisateur?.roleName,
      user?.utilisateur?.profil,
      user?.utilisateur?.profilName,
      user?.utilisateur?.profil?.nom,
      user?.utilisateur?.profil?.name,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toUpperCase());

    return roleCandidates.some((role) => role.includes('ADMIN') || role.includes('ADMINISTRATEUR'));
  }

  private extractCurrentUserHuilerieId(source: any): number | null {
    return this.findHuilerieId(source, false);
  }

  private extractCurrentUserEntrepriseId(source: any): number | null {
    return this.findEntrepriseId(source, false);
  }

  private findHuilerieId(value: any, withinHuilerieContext: boolean, visited = new Set<any>()): number | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (visited.has(value)) {
      return null;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findHuilerieId(item, withinHuilerieContext, visited);
        if (found) {
          return found;
        }
      }

      return null;
    }

    for (const [key, entryValue] of Object.entries(value)) {
      const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
      const looksLikeHuilerieKey = normalizedKey.includes('huilerie') || normalizedKey.includes('huilierie');
      const looksLikeIdKey = normalizedKey === 'id' || normalizedKey.endsWith('id') || normalizedKey.includes('id');

      if (withinHuilerieContext && looksLikeIdKey) {
        const numericValue = Number(entryValue);
        if (Number.isFinite(numericValue) && numericValue > 0) {
          return numericValue;
        }
      }

      if ((looksLikeHuilerieKey && looksLikeIdKey) || normalizedKey === 'idhuilerie' || normalizedKey === 'huilerieid' || normalizedKey === 'huilierieid') {
        const numericValue = Number(entryValue);
        if (Number.isFinite(numericValue) && numericValue > 0) {
          return numericValue;
        }
      }

      if (entryValue && typeof entryValue === 'object') {
        const nested = this.findHuilerieId(entryValue, withinHuilerieContext || looksLikeHuilerieKey, visited);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  private findEntrepriseId(value: any, withinEntrepriseContext: boolean, visited = new Set<any>()): number | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (visited.has(value)) {
      return null;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findEntrepriseId(item, withinEntrepriseContext, visited);
        if (found) {
          return found;
        }
      }

      return null;
    }

    for (const [key, entryValue] of Object.entries(value)) {
      const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
      const looksLikeEntrepriseKey = normalizedKey.includes('entreprise');
      const looksLikeIdKey = normalizedKey === 'id' || normalizedKey.endsWith('id') || normalizedKey.includes('id');

      if (withinEntrepriseContext && looksLikeIdKey) {
        const numericValue = Number(entryValue);
        if (Number.isFinite(numericValue) && numericValue > 0) {
          return numericValue;
        }
      }

      if ((looksLikeEntrepriseKey && looksLikeIdKey) || normalizedKey === 'identreprise' || normalizedKey === 'entrepriseid') {
        const numericValue = Number(entryValue);
        if (Number.isFinite(numericValue) && numericValue > 0) {
          return numericValue;
        }
      }

      if (entryValue && typeof entryValue === 'object') {
        const nested = this.findEntrepriseId(entryValue, withinEntrepriseContext || looksLikeEntrepriseKey, visited);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  setAccessToken(token: string): void {
    if (!token) {
      return;
    }

    localStorage.setItem('huilerie_token', token);
    localStorage.setItem('token', token);

    const currentUser = this.getCurrentUser() ?? {};
    const updatedUser = {
      ...currentUser,
      token,
    };

    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    this.currentUserSubject.next(updatedUser);
  }

  getToken(): string | null {
    const tokenFromStorage = localStorage.getItem('huilerie_token');
    if (tokenFromStorage) {
      return tokenFromStorage;
    }

    const legacyToken = localStorage.getItem('token');
    if (legacyToken) {
      return legacyToken;
    }

    const user = this.getCurrentUser();
    return user?.token ?? null;
  }

  getRefreshToken(): string | null {
    const user = this.getCurrentUser();
    return user?.refreshToken ?? localStorage.getItem(this.refreshTokenKey) ?? null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const normalized = String(token).trim().toLowerCase();
    if (!normalized || normalized === 'null' || normalized === 'undefined') {
      return false;
    }

    return !this.isTokenExpired(token);
  }
}