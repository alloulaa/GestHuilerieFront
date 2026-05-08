import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export type ChatbotResponseType = 'text' | 'choice' | 'chart';
export type ChatbotChartType = 'bar' | 'line' | 'pie';
export type RankingIntent = 'fournisseur' | 'machines_utilisees' | 'lot_liste' | 'analyse_labo' | 'stock';

// ─────────────────────────────────────────────────────────────────────────────
// Ranking Data Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface FournisseurItem {
  rang: number;
  name: string;
  fournisseur_nom: string;
  kg: number;
  acidity: number;
  rendement: number;
  lots: number;
  kg_str: string;
  acidity_str: string;
  rendement_str: string;
  acidite_status: 'ok' | 'out of range';
  rendement_status: 'ok' | 'out of range';
}

export interface MachineItem {
  rang: number;
  name: string;
  nomMachine: string;
  machineRef: string;
  nbExecutions: number;
  rendementMoyen: number;
  totalProduit: number;
  nb_exec_str: string;
  rend_str: string;
  prod_str: string;
}

export interface LotItem {
  rang: number;
  name: string;
  reference: string;
  variete: string;
  fournisseur_nom: string;
  quantite_initiale: number;
  qualite_huile: string;
  qte_str: string;
}

export interface AnalysisItem {
  rang: number;
  name: string;
  lot_ref: string;
  date_analyse: string;
  acidite_huile_pourcent: number;
  indice_peroxyde_meq_o2_kg: number;
  k270: number;
  acid_str: string;
  peroxide_str: string;
  k270_str: string;
  acidity_status: 'ok' | 'out of range';
  peroxide_status: 'ok' | 'out of range';
  k270_status: 'ok' | 'out of range';
}

export interface RankingPayload {
  suppliers?: FournisseurItem[];
  machines?: MachineItem[];
  lots?: LotItem[];
  analyses?: AnalysisItem[];
}

export interface ChatbotChartPoint {
  label: string;
  value: number;
}

export interface ChatbotChartDataset {
  label: string;
  data: number[];
  type?: ChatbotChartType;
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
  selected_option?: string | null;
  pending_choice?: boolean;
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
  selection?: 'texte' | 'graphique';
  prediction_payload?: Record<string, unknown>;
}

// Payload sent specifically for prediction flow
export interface PredictionPayload {
  variete: string;
  region: string;
  methode_recolte: string;
  type_sol: string;
  lavage_effectue: string;
  type_machine: string;
  type_broyeur: string;
  type_malaxeur: string;
  type_nettoyage: string;
  type_separation: string;
  controle_temperature: string;
  poids_olives_kg: number;
  maturite_niveau_1_5: number;
  duree_stockage_jours: number;
  temps_depuis_recolte_heures: number;
  temperature_malaxage_c: number;
  duree_malaxage_min: number;
  vitesse_decanteur_tr_min: number;
  humidite_pourcent: number;
  acidite_olives_pourcent: number;
  taux_feuilles_pourcent: number;
  pression_extraction_bar: number;
  nombre_etapes: number;
  presence_ajout_eau: number;
  presence_presse: number;
  presence_separateur: number;
  acidite_huile_pourcent?: number;
  indice_peroxyde_meq_o2_kg?: number;
  k270?: number;
  polyphenols_mg_kg?: number;
  k232?: number;
}
@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = 'http://127.0.0.1:8001/chat/ask';
  private readonly sessionId = this.generateSessionId();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authService: AuthService,
  ) {}

  sendMessage(message: string, selection?: 'texte' | 'graphique', predictionPayload?: Record<string, unknown>): Observable<ChatbotResponse> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return of(this.normalizeResponse({
        type: 'text',
        message: 'Veuillez écrire un message pour continuer.',
        intent: 'empty',
        data: null,
      }));
    }

    if (this.shouldReturnMachineMock(trimmedMessage)) {
      return of(this.normalizeResponse(this.buildMachineMockResponse(trimmedMessage))).pipe(
        tap((response) => {
          console.log('[Chatbot API] Dev mock response received:', response);
        })
      );
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
      ...(selection ? { selection } : {}),
      ...(predictionPayload ? { prediction_payload: predictionPayload } : {}),
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

  // Send prediction using fixed session id 'front-session' and allow component to handle HTTP errors (422)
  sendPrediction(predictionPayload: PredictionPayload): Observable<ChatbotResponse> {
    const token = this.resolveToken();
    if (!token) {
      return of(this.normalizeResponse({
        type: 'text',
        message: 'Session expirée. Veuillez vous reconnecter pour utiliser le chatbot.',
        intent: 'auth_required',
        data: null,
      }));
    }

    const request: ChatbotRequest = {
      message: 'prediction',
      session_id: 'front-session',
      token,
      jwt_token: token,
      prediction_payload: predictionPayload as unknown as Record<string, unknown>,
    };

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    // Do not swallow HTTP errors here; let component inspect status codes (e.g., 422)
    return this.httpClient.post<unknown>(this.apiUrl, request, { headers }).pipe(
      map((response) => this.normalizeResponse(response)),
      tap((response) => console.log('[Chatbot API] Prediction response received:', response))
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

  private shouldReturnMachineMock(message: string): boolean {
    if (environment.production) {
      return false;
    }

    const normalizedMessage = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return (
      normalizedMessage.includes('__mock_machine__') ||
      normalizedMessage.includes('mock machine') ||
      normalizedMessage.includes('demo machine') ||
      normalizedMessage.includes('machine demo')
    );
  }

  private buildMachineMockResponse(message: string): Record<string, unknown> {
    const hasZitounia = message.toLowerCase().includes('zitounia');
    const huilerieLabel = hasZitounia ? 'zitounia' : 'démonstration';

    return {
      type: 'text',
      message: `Machines de l'huilerie ${huilerieLabel} :\n- **makina1** | catégorie: broyage | type: disques | exécutions: 12 | état: EN_SERVICE\n- **makina2** | catégorie: malaxage | type: vertical | exécutions: 7 | état: EN_SERVICE`,
      response: `Machines de l'huilerie ${huilerieLabel} :\n- **makina1** | catégorie: broyage | type: disques | exécutions: 12 | état: EN_SERVICE\n- **makina2** | catégorie: malaxage | type: vertical | exécutions: 7 | état: EN_SERVICE`,
      intent: 'machine',
      confidence: 1,
      options: [],
      chart_type: null,
      data: {
        machines: [
          {
            rang: 1,
            nomMachine: 'makina1',
            categorieMachine: 'broyage',
            typeMachine: 'disques',
            nbExecutions: 12,
            etatMachine: 'EN_SERVICE',
          },
          {
            rang: 2,
            nomMachine: 'makina2',
            categorieMachine: 'malaxage',
            typeMachine: 'vertical',
            nbExecutions: 7,
            etatMachine: 'EN_SERVICE',
          },
        ],
        labels: ['makina1', 'makina2'],
        datasets: [],
      },
      applied_scope: hasZitounia ? { huilerie: 'zitounia' } : { huilerie: 'demo' },
      pending_choice: false,
      selected_option: null,
    };
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
      selected_option: typeof response?.selected_option === 'string' ? response.selected_option : null,
      pending_choice: !!response?.pending_choice,
      intent: this.normalizeIntent(response?.intent),
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

  private normalizeIntent(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalizedIntent = value.trim().toLowerCase();
    if (!normalizedIntent) {
      return null;
    }

    return normalizedIntent === 'intent_prediction' ? 'prediction' : normalizedIntent;
  }
}
