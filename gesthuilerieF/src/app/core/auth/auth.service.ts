// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\core\auth\auth.service.ts
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

  private extractToken(payload: any): string | null {
    return (
      payload?.token ??
      payload?.accessToken ??
      payload?.jwt ??
      payload?.data?.token ??
      payload?.data?.accessToken ??
      payload?.user?.token ??
      payload?.user?.accessToken ??
      null
    );
  }

  private extractUser(payload: any): any {
    return payload?.utilisateur ?? payload?.user ?? payload?.data?.utilisateur ?? payload?.data?.user ?? payload?.data ?? payload;
  }

  private persistAuthResponse(response: any): void {
    const user = this.extractUser(response);
    const token = this.extractToken(response);
    const refreshToken = response?.refreshToken ?? response?.data?.refreshToken ?? null;

    const storedUser = {
      ...user,
      token: token ?? undefined,
      refreshToken: refreshToken ?? undefined,
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
    return !!this.getToken();
  }
}
