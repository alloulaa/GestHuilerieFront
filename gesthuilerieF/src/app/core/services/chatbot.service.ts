import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export type ChatbotResponseType = 'text' | 'choice' | 'chart';
export type ChatbotChartType = 'bar' | 'line' | 'pie';

export interface ChatbotChartPoint {
  label: string;
  value: number;
}

export interface ChatbotChartDataset {
  label: string;
  data: number[];
}

export interface ChatbotChartPayload {
  labels: string[];
  datasets: ChatbotChartDataset[];
}

export interface ChatbotResponse {
  type: ChatbotResponseType;
  message: string;
  options: string[];
  chart_type: ChatbotChartType | null;
  data: unknown;
  intent: string | null;
  confidence: number | null;
  applied_scope: string | null;
  response?: string;
}

export interface ChatbotRequest {
  message: string;
  session_id: string;
  token: string;
  jwt_token: string;
  user_id?: number;
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
      return of(this.normalizeResponse({
        type: 'text',
        message: 'Veuillez écrire un message pour continuer.',
        intent: 'empty',
        data: null,
      }));
    }

    const token = this.resolveToken();
    if (!token) {
      return of(this.normalizeResponse({
        type: 'text',
        message: 'Session expirée. Veuillez vous reconnecter pour utiliser le chatbot de votre entreprise.',
        intent: 'auth_required',
        data: null,
      }));
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

    return this.httpClient.post<unknown>(this.apiUrl, request, { headers }).pipe(
      map((response) => this.normalizeResponse(response)),
      tap((response) => {
        console.log('[Chatbot API] Response received:', response);
      }),
      catchError((error) => {
        console.error('[Chatbot API] Error:', error);
        return of(this.normalizeResponse({
          type: 'text',
          message: 'Erreur de connexion au chatbot',
          intent: 'error',
          data: { error: error.message },
        }));
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

  private normalizeResponse(response: any): ChatbotResponse {
    const type = this.normalizeType(response?.type);
    const message = String(response?.message ?? response?.response ?? '').trim();
    const resolvedMessage = message || 'Réponse reçue.';
    const options = Array.isArray(response?.options) ? response.options.filter((option: unknown) => typeof option === 'string') : [];
    const chartType = this.normalizeChartType(response?.chart_type);
    const normalizedChartData = this.normalizeChartData(response?.data);

    return {
      type,
      message: resolvedMessage,
      options,
      chart_type: chartType,
      // Keep raw backend payload first to preserve supplier fields
      // such as acidite/rendement/nb_lots used by chatbot widget ranking view.
      data: response?.data ?? normalizedChartData ?? null,
      intent: typeof response?.intent === 'string' ? response.intent : null,
      confidence: typeof response?.confidence === 'number' ? response.confidence : null,
      applied_scope: typeof response?.applied_scope === 'string' ? response.applied_scope : null,
      response: typeof response?.response === 'string' ? response.response : resolvedMessage,
    };
  }

  private normalizeChartData(data: unknown): ChatbotChartPayload | null {
    if (!data) {
      return null;
    }

    if (this.isChartPayload(data)) {
      const payload = data as ChatbotChartPayload;

      return {
        labels: payload.labels.map((label) => String(label)),
        datasets: payload.datasets
          .map((dataset) => ({
            label: String(dataset?.label ?? 'Série'),
            data: Array.isArray(dataset?.data) ? dataset.data.map((value) => this.normalizeNumber(value)) : [],
          }))
          .filter((dataset) => dataset.data.length > 0),
      };
    }

    if (Array.isArray(data)) {
      const points = data
        .map((item) => this.normalizeChartPoint(item))
        .filter((point): point is ChatbotChartPoint => point !== null);

      if (points.length === 0) {
        return null;
      }

      return {
        labels: points.map((point) => point.label),
        datasets: [
          {
            label: 'Valeur',
            data: points.map((point) => point.value),
          },
        ],
      };
    }

    return null;
  }

  private isChartPayload(value: unknown): value is ChatbotChartPayload {
    return !!value && typeof value === 'object' && 'labels' in value && 'datasets' in value;
  }

  private normalizeChartPoint(item: unknown): ChatbotChartPoint | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const record = item as Record<string, unknown>;
    const label = record['label'] ?? record['name'] ?? record['title'] ?? record['key'];
    const numericValue = this.normalizeNumber(record['value'] ?? record['count'] ?? record['total'] ?? record['amount'] ?? record['y'] ?? record['val']);

    if (label === undefined || label === null || Number.isNaN(numericValue)) {
      return null;
    }

    return {
      label: String(label),
      value: numericValue,
    };
  }

  private normalizeNumber(value: unknown): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private normalizeType(value: unknown): ChatbotResponseType {
    if (value === 'choice' || value === 'chart') {
      return value;
    }

    return 'text';
  }

  private normalizeChartType(value: unknown): ChatbotChartType | null {
    if (value === 'bar' || value === 'line' || value === 'pie') {
      return value;
    }

    return null;
  }
}
