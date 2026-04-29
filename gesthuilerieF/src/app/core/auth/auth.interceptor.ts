import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) { }

  private resolveToken(): string | null {
    const fromService = this.authService.getToken();
    const currentUserRaw = localStorage.getItem('currentUser');

    let fromCurrentUser: string | null = null;
    if (currentUserRaw) {
      try {
        const parsed = JSON.parse(currentUserRaw);
        fromCurrentUser =
          parsed?.token ??
          parsed?.jwt_token ??
          parsed?.access_token ??
          parsed?.accessToken ??
          parsed?.jwt ??
          parsed?.utilisateur?.token ??
          parsed?.utilisateur?.jwt_token ??
          parsed?.utilisateur?.access_token ??
          parsed?.utilisateur?.accessToken ??
          parsed?.utilisateur?.jwt ??
          null;
      } catch {
        fromCurrentUser = null;
      }
    }

    const fromStorage =
      localStorage.getItem('huilerie_token') ??
      localStorage.getItem('token') ??
      localStorage.getItem('jwt_token') ??
      localStorage.getItem('access_token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('jwt');

    const rawToken = fromService ?? fromCurrentUser ?? fromStorage;

    if (!rawToken) {
      return null;
    }

    const normalized = String(rawToken).trim();
    if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') {
      return null;
    }

    return normalized.replace(/^Bearer\s+/i, '');
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiCall = request.url.includes('/api/');

    if (!isApiCall) {
      return next.handle(request);
    }

    const isPublicAuthRequest =
      /\/auth\/(login|signup|refresh|reset-password\/request|reset-password\/confirm)$/i.test(request.url);

    if (isPublicAuthRequest) {
      return next.handle(request);
    }
    const existingAuthorization = request.headers.get('Authorization');
    if (existingAuthorization && existingAuthorization.trim().length > 0) {
      return next.handle(request).pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        }),
      );
    }

    const token = this.resolveToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
    );
  }
}