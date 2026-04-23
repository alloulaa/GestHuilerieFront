import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

export interface ChatbotRequest {
  message: string;
  user_id: number;
  session_id: string;
}

export interface ChatbotResponse {
  response: string;
  intent: string;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = 'http://127.0.0.1:8001/chat/ask';
  private readonly userId = 1;
  private readonly sessionId = this.generateSessionId();

  constructor(private readonly httpClient: HttpClient) {}

  sendMessage(message: string): Observable<ChatbotResponse> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return of({
        response: 'Please enter a message so I can help you.',
        intent: 'empty',
        data: null,
      });
    }

    const request: ChatbotRequest = {
      message: trimmedMessage,
      user_id: this.userId,
      session_id: this.sessionId,
    };

    return this.httpClient.post<ChatbotResponse>(this.apiUrl, request).pipe(
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
}
