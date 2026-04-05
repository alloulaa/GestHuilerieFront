// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\core\services\app-init.service.ts
import { Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  constructor(private authService: AuthService) {}

  private isTokenExpired(token: string): boolean {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return true;
      }

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      if (!payload?.exp) {
        return true;
      }

      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= nowInSeconds;
    } catch {
      return true;
    }
  }

  private loadCurrentUser(resolve: () => void): void {
    this.authService.getMe().subscribe({
      next: () => resolve(),
      error: () => resolve(),
    });
  }

  init(): Promise<void> {
    return new Promise(resolve => {
      const accessToken = this.authService.getToken();
      const refreshToken = this.authService.getRefreshToken();
      const hasUsableAccessToken = !!accessToken && !this.isTokenExpired(accessToken);

      if (!hasUsableAccessToken && !refreshToken) {
        resolve();
        return;
      }

      if (refreshToken) {
        this.authService.refreshToken().subscribe({
          next: (response) => {
            const applied = this.authService.applyRefreshResponse(response);
            if (!applied) {
              if (hasUsableAccessToken) {
                this.loadCurrentUser(resolve);
                return;
              }

              resolve();
              return;
            }

            this.loadCurrentUser(resolve);
          },
          error: () => {
            if (hasUsableAccessToken) {
              this.loadCurrentUser(resolve);
              return;
            }

            resolve();
          },
        });
        return;
      }

      if (hasUsableAccessToken) {
        this.loadCurrentUser(resolve);
        return;
      }

      resolve();
    });
  }
}
