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
          parsed?.accessToken ??
          parsed?.jwt ??
          parsed?.utilisateur?.token ??
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