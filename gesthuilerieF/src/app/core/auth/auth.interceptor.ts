import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiCall =
      request.url.startsWith('/api/') ||
      request.url.startsWith('http://localhost:8000/api/');

    if (!isApiCall) {
      return next.handle(request);
    }

    const isPublicAuthRequest =
      /\/auth\/(login|signup|refresh|reset-password\/request|reset-password\/confirm)$/i.test(request.url);

    if (isPublicAuthRequest) {
      return next.handle(request);
    }

    // Add authorization header with token if available
    const token = this.authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }
}
