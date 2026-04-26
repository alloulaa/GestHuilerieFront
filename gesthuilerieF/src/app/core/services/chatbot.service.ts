import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface ChatbotRequest {
  message: string;
  session_id: string;
  token: string;
  jwt_token: string;
  user_id?: number;
}

export interface ChatbotResponse {
  response: string;
  intent: string;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = 'http://127.0.0.1:8001/chat/ask';
  private readonly sessionId = this.generateSessionId();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authService: AuthService,
  ) {}

  sendMessage(message: string): Observable<ChatbotResponse> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return of({
        response: 'Please enter a message so I can help you.',
        intent: 'empty',
        data: null,
      });
    }

    const token = this.resolveToken();
    if (!token) {
      return of({
        response: 'Session expirée. Veuillez vous reconnecter pour utiliser le chatbot de votre entreprise.',
        intent: 'auth_required',
        data: null,
      });
    }

    const userId = this.resolveUserId();

    const request: ChatbotRequest = {
      message: trimmedMessage,
      session_id: this.sessionId,
      token,
      jwt_token: token,
      ...(userId !== null ? { user_id: userId } : {}),
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.httpClient.post<ChatbotResponse>(this.apiUrl, request, { headers }).pipe(
      tap((response) => {
        console.log('[Chatbot API] Response received:', response);
      }),
      catchError((error) => {
        console.error('[Chatbot API] Error:', error);
        return of({
          response: 'Erreur de connexion au chatbot',
          intent: 'error',
          data: { error: error.message },
        });
      })
    );
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private resolveToken(): string | null {
    const token = this.authService.getToken();
    if (!token) {
      return null;
    }

    const normalizedToken = String(token).trim().replace(/^Bearer\s+/i, '');
    if (!normalizedToken || normalizedToken.toLowerCase() === 'null' || normalizedToken.toLowerCase() === 'undefined') {
      return null;
    }

    return normalizedToken;
  }

  private resolveUserId(): number | null {
    const user = this.authService.getCurrentUser();
    const candidates = [
      user?.id,
      user?.userId,
      user?.utilisateur?.id,
      user?.utilisateur?.userId,
      user?.data?.id,
      user?.data?.userId,
    ];

    for (const candidate of candidates) {
      const numericValue = Number(candidate);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue;
      }
    }

    return null;
  }
}
