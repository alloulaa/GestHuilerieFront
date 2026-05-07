import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Chart, ChartConfiguration, ChartDataset, ChartType, registerables, TooltipItem } from 'chart.js';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ChatbotChartPayload, ChatbotChartType, ChatbotResponse, ChatbotResponseType, ChatbotService, PredictionPayload, RankingIntent, FournisseurItem, MachineItem, LotItem, AnalysisItem } from '../../../core/services/chatbot.service';

Chart.register(...registerables);

const CHART_COLORS = ['#6f8d3a', '#9bb85a', '#d8c65a', '#7e9fcb', '#f3a15f', '#c96c6c'];
const RANKING_INTENTS: RankingIntent[] = ['fournisseur', 'machines_utilisees', 'lot_liste', 'analyse_labo', 'stock'];

const SUPPLIER_ACIDITY_RANGE = { min: 0.2, max: 1.5 };
const SUPPLIER_RENDEMENT_RANGE = { min: 10, max: 30 };
const ANALYSIS_ACIDITY_RANGE = { min: 0.1, max: 5 };
const ANALYSIS_PEROXIDE_RANGE = { min: 5, max: 40 };
const ANALYSIS_K270_RANGE = { min: 0.1, max: 0.5 };

interface ChatDebugInfo {
  intent: string | null;
  confidence: number | null;
  appliedScope: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Ranking Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface SupplierRankingItem {
  name: string;
  kg: number;
  acidity: number;
  rendement: number;
  lots: number;
  acidityOutOfRange: boolean;
  rendementOutOfRange: boolean;
}

interface SupplierRankingPayload {
  items: SupplierRankingItem[];
  bestSupplierName: string | null;
  weakSupplierNames: string[];
}

interface MachineRankingItem {
  name: string;
  nbExecutions: number;
  rendementMoyen: number;
  totalProduit: number;
}

interface MachineRankingPayload {
  items: MachineRankingItem[];
}

interface LotRankingItem {
  name: string;
  reference: string;
  variete: string;
  fournisseur_nom: string;
  quantite_initiale: number;
  qualite_huile: string;
}

interface LotRankingPayload {
  items: LotRankingItem[];
}

interface AnalysisRankingItem {
  name: string;
  lot_ref: string;
  date_analyse: string;
  acidite_huile_pourcent: number;
  indice_peroxyde_meq_o2_kg: number;
  k270: number;
  acidityOutOfRange: boolean;
  peroxideOutOfRange: boolean;
  k270OutOfRange: boolean;
}

interface MachineTableItem {
  name?: string;
  machine?: string;
  nomMachine?: string;
  machineRef?: string;
  status?: string;
  statut?: string;
  etat?: string;
  state?: string;
  details?: string;
  info?: string;
  description?: string;
  [key: string]: any;
}

interface MachineListItem {
  nom: string;
  categorie: string;
  type: string;
  executions: number;
}

interface AnalysisRankingPayload {
  items: AnalysisRankingItem[];
}

interface StockRankingItem {
  name: string;
  reference_stock: string;
  variete: string;
  quantite_disponible: number;
  type_stock: string;
  lot_reference: string;
  huilerie_nom: string;
}

interface StockRankingPayload {
  items: StockRankingItem[];
}

type RankingPayload = SupplierRankingPayload | MachineRankingPayload | LotRankingPayload | AnalysisRankingPayload | StockRankingPayload | null;
type RankingViewMode = 'chart' | 'text';

interface ChatMessage {
  id: number;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  type: ChatbotResponseType;
  options: string[];
  chartType: ChatbotChartType | null;
  chartData: ChatbotChartPayload | null;
  rankingData: RankingPayload;
  rankingIntent: RankingIntent | null;
  rankingViewMode: RankingViewMode;
  rankingMetric?: string;
  debug: ChatDebugInfo | null;
  // For non-ranking tabular responses (e.g., machine states, machines en panne)
  tableData?: unknown;
  tableIntent?: string | null;
}

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ChatbotWidgetComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chatWindow') chatWindowRef?: ElementRef<HTMLElement>;
  @ViewChild('messagesContainer') messagesContainerRef?: ElementRef<HTMLElement>;
  @ViewChild('chatInputArea') chatInputAreaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChildren('chartCanvas') chartCanvasRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

  isOpen = false;
  isClosing = false;
  isFullScreen = false;
  hasUnreadPulse = false;
  isLoading = false;
  draftMessage = '';
  hasSentUserMessage = false;
  isMobile = window.innerWidth <= 640;
  showPredictionModal = false;
  showLabAnalysisFields = false;
  predictionFormData: Record<string, unknown> = this.initPredictionFormData();
  predictionFormErrors: string[] = [];
  backendPredictionError: string | null = null;
  private messageIdSequence = 0;
  private chartInstances = new Map<number, Chart>();
  private chartCanvasSubscription?: Subscription;
  private panelResizeObserver?: ResizeObserver;
  private messagesMutationObserver?: MutationObserver | null = null;

  messages: ChatMessage[] = [
    {
      id: this.nextMessageId(),
      sender: 'bot',
      content: 'Bonjour, je suis votre assistant Huilerie. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date(),
      type: 'text',
      options: [],
      chartType: null,
      chartData: null,
      rankingData: null,
      rankingIntent: null,
      rankingViewMode: 'chart',
      debug: null,
    },
  ];

  readonly quickSuggestions: string[] = [
    'Quelle est la production aujourd\'hui ?',
    'Quel est le stock actuel ?',
    'Quelles machines sont en panne ?',
  ];

  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private panelLeft = 0;
  private panelTop = 0;
  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly sanitizer: DomSanitizer,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.renderCharts();

    if (this.chatWindowRef?.nativeElement && typeof ResizeObserver !== 'undefined') {
      this.panelResizeObserver = new ResizeObserver(() => {
        this.resizeCharts();
      });
      this.panelResizeObserver.observe(this.chatWindowRef.nativeElement);
    }

    // Observe mutations in the messages container to catch layout/content changes
    // (e.g., CSS transitions, async content) that may require chart resizing.
    try {
      const container = this.messagesContainerRef?.nativeElement;
      if (container && typeof MutationObserver !== 'undefined') {
        this.messagesMutationObserver = new MutationObserver(() => {
          // schedule a resize to allow layout to settle
          setTimeout(() => this.resizeCharts(), 80);
        });
        this.messagesMutationObserver.observe(container, { childList: true, subtree: true, attributes: true });
      }
    } catch (e) {
      // ignore if MutationObserver unavailable
    }

    if (this.chartCanvasRefs) {
      this.chartCanvasSubscription = this.chartCanvasRefs.changes.subscribe(() => {
        this.renderCharts();
      });
    }
  }

  ngOnDestroy(): void {
    this.chartCanvasSubscription?.unsubscribe();
    this.panelResizeObserver?.disconnect();
    if (this.messagesMutationObserver) {
      try { this.messagesMutationObserver.disconnect(); } catch (_) {}
      this.messagesMutationObserver = null;
    }
    this.destroyAllCharts();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Markdown renderer
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Converts a bot message (which may contain Markdown produced by the backend)
   * into safe HTML for [innerHTML] binding.
   *
   * Supported:  **bold**  __bold__  *italic*  _italic_  `code`
   *             - unordered list item
   *             1. ordered list item
   *             \n line breaks
   */
  renderMarkdown(text: string): SafeHtml {
    const html = this.markdownToHtml(text);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private markdownToHtml(raw: string): string {
    if (!raw) return '';

    // Escape any HTML from the API response first (XSS prevention)
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = escaped.split('\n');
    const output: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' = 'ul';

    const closeList = (): void => {
      if (inList) {
        output.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ulMatch = line.match(/^[\-\*]\s+(.+)/);
      const olMatch = line.match(/^\d+\.\s+(.+)/);

      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          closeList();
          output.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        output.push(`<li>${this.inlineMarkdown(ulMatch[1])}</li>`);
      } else if (olMatch) {
        if (!inList || listType !== 'ol') {
          closeList();
          output.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        output.push(`<li>${this.inlineMarkdown(olMatch[1])}</li>`);
      } else {
        closeList();
        const trimmed = line.trim();
        if (trimmed === '') {
          output.push('<br>');
        } else {
          output.push(this.inlineMarkdown(trimmed));
          const next = lines[i + 1];
          if (next !== undefined && next.trim() !== '') {
            output.push('<br>');
          }
        }
      }
    }

    closeList();
    return output.join('');
  }

  private inlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/_(?!_)(.+?)_(?!_)/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Widget open / close / fullscreen
  // ─────────────────────────────────────────────────────────────────────────────

  toggleWidget(): void {
    if (this.isOpen) {
      this.closeWidget();
      return;
    }
    this.openWidget();
  }

  closeWidget(): void {
    this.isOpen = false;
    this.isClosing = true;
    this.isDragging = false;

    if (this.closeAnimationTimer) {
      clearTimeout(this.closeAnimationTimer);
    }

    this.closeAnimationTimer = setTimeout(() => {
      this.isClosing = false;
      this.closeAnimationTimer = null;
    }, 240);
  }

  toggleFullScreen(): void {
    if (this.isMobile) return;

    this.isFullScreen = !this.isFullScreen;
    if (!this.isFullScreen) {
      setTimeout(() => this.resetPanelPosition());
    }
    setTimeout(() => this.resizeCharts(), 320);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────────────────────────

  sendSuggestion(suggestion: string): void {
    if (this.isLoading) return;
    this.draftMessage = suggestion;
    this.sendMessage();
  }

  sendChoice(option: string): void {
    if (this.isLoading) return;

    const selection = option.toLowerCase() === 'graphique' ? 'graphique' : 'texte';

    // Trouver le dernier message choice avec données en attente
    const choiceMessage = [...this.messages]
      .reverse()
      .find(m =>
        m.sender === 'bot' &&
        m.type === 'choice' &&
        !!(m as any)._pendingRankingData &&
        !!(m as any)._pendingRankingIntent,
      );

    const pendingRankingData  = choiceMessage ? (choiceMessage as any)._pendingRankingData  : null;
    const pendingRankingIntent = choiceMessage ? (choiceMessage as any)._pendingRankingIntent : null;

    if (pendingRankingData && pendingRankingIntent) {
      // Set loading state to prevent double-clicks while displaying local data
      this.isLoading = true;

      // Message utilisateur (bulle de droite)
      this.messages.push({
        id: this.nextMessageId(),
        sender: 'user',
        content: selection === 'graphique' ? 'Graphique' : 'Texte',
        timestamp: new Date(),
        type: 'text',
        options: [],
        chartType: null,
        chartData: null,
        rankingData: null,
        rankingIntent: null,
        rankingViewMode: 'chart',
        debug: null,
      });

      // Construire le chartData avec la métrique par défaut de cet intent
      const defaultMetric = this.defaultMetricForIntent(pendingRankingIntent);
      const chartData = selection === 'graphique'
        ? this.buildRankingChartPayload(pendingRankingData, pendingRankingIntent, defaultMetric)
        : null;

      const botResponse: ChatMessage = {
        id: this.nextMessageId(),
        sender: 'bot',
        content: selection === 'graphique'
          ? 'Voici les résultats en mode graphique...'
          : 'Voici les résultats en mode texte...',
        timestamp: new Date(),
        type: selection === 'graphique' ? 'chart' : 'text',
        options: [],
        chartType: selection === 'graphique' ? 'bar' : null,
        chartData,
        rankingData: pendingRankingData,
        rankingIntent: pendingRankingIntent,
        rankingViewMode: selection === 'graphique' ? 'chart' : 'text',
        rankingMetric: defaultMetric,
        debug: null,
      };

      this.messages.push(botResponse);
      this.scrollToBottom();
      const safeTimeoutId = setTimeout(() => {
        if (this.isLoading) {
          console.warn('[Chatbot Widget] Force resetting isLoading in sendChoice (timeout)');
          this.isLoading = false;
        }
      }, 5000);
      setTimeout(() => {
        clearTimeout(safeTimeoutId);
        this.renderCharts();
        this.isLoading = false;
      }, 0);
      return;
    }

    // Fallback: send to backend (sendMessage will handle user message, isLoading, and HTTP request)
    this.sendMessage(option, selection as 'texte' | 'graphique');
  }

  sendMessage(messageOverride?: string, selection?: 'texte' | 'graphique'): void {
    const message = (messageOverride ?? this.draftMessage).trim();
    if (!message || this.isLoading) return;

    const normalizedMessage = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const isMachineListQuery =
      normalizedMessage.includes('machine') &&
      (
        normalizedMessage.includes('liste') ||
        normalizedMessage.includes('quelles sont') ||
        normalizedMessage.includes('quels sont') ||
        normalizedMessage.includes('machines de') ||
        normalizedMessage.includes('machine de')
      );

    const resolvedSelection = selection ?? (isMachineListQuery ? 'texte' : undefined);

    if (this.isMessageAboutPrediction(message)) {
      this.draftMessage = message;
      this.openPredictionModal(message);
      return;
    }

    this.messages.push({
      id: this.nextMessageId(),
      sender: 'user',
      content: message,
      timestamp: new Date(),
      type: 'text',
      options: [],
      chartType: null,
      chartData: null,
      rankingData: null,
      rankingIntent: null,
      rankingViewMode: 'chart',
      debug: null,
    });
    this.hasSentUserMessage = true;
    this.draftMessage = '';
    this.resetTextareaHeight();
    this.isLoading = true;
    this.scrollToBottom();

    console.log('[Chatbot Widget] Sending message:', message, 'selection:', resolvedSelection);

    // Safety timeout to prevent isLoading from being stuck
    const timeoutId = setTimeout(() => {
      if (this.isLoading) {
        console.warn('[Chatbot Widget] Force resetting isLoading (timeout)');
        this.isLoading = false;
      }
    }, 10000);

    this.chatbotService
      .sendMessage(message, resolvedSelection)
      .pipe(
        finalize(() => {
          clearTimeout(timeoutId);
          this.isLoading = false;
          this.cdr.detectChanges();
          this.scrollToBottom();
        })
      )
      .subscribe((response: ChatbotResponse) => {
        console.log('[Chatbot Widget] Response received:', response);
        // IMMEDIATE: Reset loading flag right away so UI is responsive
        this.isLoading = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          try {
            const botMessage = this.createBotMessage(response);

            // Skip if message creation returned null (e.g., empty duplicate response)
            if (!botMessage) {
              console.log('[Chatbot Widget] Skipping null message');
              return;
            }

            // Deduplication: skip if we already have a message with same type, content, and rankingIntent
            // (ignore rankingData since backend might send it differently in duplicate responses)
            const isDuplicate = this.messages.some(msg => 
              msg.sender === 'bot' && 
              msg.type === botMessage.type &&
              msg.content === botMessage.content &&
              msg.rankingIntent === botMessage.rankingIntent &&
              msg.rankingIntent !== null  // Only dedupe ranking messages
            );

            if (isDuplicate) {
              console.log('[Chatbot Widget] Skipping duplicate message:', botMessage.type, botMessage.content.substring(0, 30));
              return;
            }

            this.messages.push(botMessage);

            if (this.shouldOpenPredictionModalFromResponse(response, botMessage)) {
              this.showPredictionModal = true;
            }

            if (!this.isOpen) {
              this.hasUnreadPulse = true;
            }

            this.renderCharts();
            this.scrollToBottom();
            this.cdr.detectChanges();
          } catch (error) {
            console.error('[Chatbot Widget] Failed to render bot response', error);
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        }, 0);
      });
  }

  private initPredictionFormData(): Record<string, unknown> {
    return {
      variete: 'Chemlali',
      region: 'Sfax',
      methode_recolte: 'manuelle',
      type_sol: 'argile',
      lavage_effectue: 'oui',
      type_machine: 'moderne_2_phases',
      type_broyeur: 'standard',
      type_malaxeur: 'standard',
      type_nettoyage: 'standard',
      type_separation: 'standard',
      controle_temperature: 'oui',
      poids_olives_kg: 7200,
      maturite_niveau_1_5: 3,
      duree_stockage_jours: 1,
      temps_depuis_recolte_heures: 10,
      temperature_malaxage_c: 26,
      duree_malaxage_min: 32,
      vitesse_decanteur_tr_min: 3200,
      humidite_pourcent: 18,
      acidite_olives_pourcent: 0.35,
      taux_feuilles_pourcent: 0.9,
      pression_extraction_bar: 95,
      nombre_etapes: 6,
      presence_ajout_eau: 0,
      presence_presse: 0,
      presence_separateur: 0,
      // lab fields
      acidite_huile_pourcent: 0.42,
      indice_peroxyde_meq_o2_kg: 6.8,
      polyphenols_mg_kg: 450,
      k232: 1.75,
      k270: 0.13,
    };
  }

  toggleLabAnalysisFields(): void {
    this.showLabAnalysisFields = !this.showLabAnalysisFields;
    if (!this.showLabAnalysisFields) {
      // Réinitialise les valeurs lab si on désactive
      this.predictionFormData['acidite_huile_pourcent'] = 0;
      this.predictionFormData['indice_peroxyde_meq_o2_kg'] = 0;
      this.predictionFormData['k270'] = 0;
    }
  }

  private isMessageAboutPrediction(message: string): boolean {
    const normalizedMessage = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const explicitPredictionKeywords = [
      'prediction',
      'prevision',
      'predire',
      'prevoir',
      'simuler',
      'simulation',
    ];

    const implicitPredictionPhrases = [
      'est-ce que',
      'est ce que',
      'va etre',
      'sera',
      'serait',
    ];

    const containsExplicitPrediction = explicitPredictionKeywords.some((keyword) => normalizedMessage.includes(keyword));
    if (containsExplicitPrediction) {
      return true;
    }

    const containsImplicitPrediction = implicitPredictionPhrases.some((phrase) => normalizedMessage.includes(phrase));
    const containsQualityTopic = ['qualite', 'rendement', 'olives', 'lot'].some((keyword) => normalizedMessage.includes(keyword));

    return containsImplicitPrediction && containsQualityTopic;
  }

  openPredictionModal(message: string): void {
    if (this.isMessageAboutPrediction(message)) {
      this.showPredictionModal = true;
      console.log('[Chatbot Widget] Opening prediction modal');
    }
  }

  closePredictionModal(): void {
    this.showPredictionModal = false;
  }

  submitPredictionForm(): void {
    if (this.isLoading) return;

    const message = this.draftMessage.trim() || 'prediction';

    // Build and validate payload
    const payload = this.buildPredictionPayload();
    const errors = this.validatePredictionPayload(payload);
    this.predictionFormErrors = errors;
    this.backendPredictionError = null;
    if (errors.length > 0) {
      // keep modal open to allow corrections
      return;
    }

    // Push user message (same behaviour as normal send)
    this.messages.push({
      id: this.nextMessageId(),
      sender: 'user',
      content: message,
      timestamp: new Date(),
      type: 'text',
      options: [],
      chartType: null,
      chartData: null,
      rankingData: null,
      rankingIntent: null,
      rankingViewMode: 'chart',
      debug: null,
    });

    this.hasSentUserMessage = true;
    this.draftMessage = '';
    this.resetTextareaHeight();
    this.isLoading = true;
    this.scrollToBottom();

    console.log('[Chatbot Widget] Sending prediction (prediction_payload):', payload);

    this.chatbotService.sendPrediction(payload)
      .pipe(finalize(() => { this.isLoading = false; this.scrollToBottom(); }))
      .subscribe({
        next: (response: ChatbotResponse) => {
          console.log('[Chatbot Widget] Prediction response received:', response);
          const botMessage = this.createBotMessage(response);
          if (!botMessage) return;

          const isDuplicate = this.messages.some((msg) =>
            msg.sender === 'bot' &&
            msg.type === botMessage.type &&
            msg.content === botMessage.content &&
            msg.rankingIntent === botMessage.rankingIntent &&
            msg.rankingIntent !== null
          );

          if (!isDuplicate) {
            this.messages.push(botMessage);
          }

          // Close modal on success
          this.showPredictionModal = false;
          if (!this.isOpen) this.hasUnreadPulse = true;

          setTimeout(() => { this.renderCharts(); this.scrollToBottom(); });
        },
        error: (err: any) => {
          console.error('[Chatbot Widget] Prediction error:', err);
          if (err && err.status === 422 && err.error) {
            // Prefer structured backend validation messages
            try {
              const backend = err.error;
              if (typeof backend === 'string') {
                this.backendPredictionError = backend;
              } else if (backend?.errors && Array.isArray(backend.errors)) {
                this.backendPredictionError = backend.errors.join('\n');
              } else if (backend?.message) {
                this.backendPredictionError = String(backend.message);
              } else {
                this.backendPredictionError = JSON.stringify(backend);
              }
            } catch (e) {
              this.backendPredictionError = 'Erreur de validation du serveur (422).';
            }
          } else {
            this.backendPredictionError = 'Erreur lors de l\'appel au serveur. Vérifiez la connexion.';
          }
          // keep modal open so user can correct
          this.showPredictionModal = true;
        }
      });
  }

  updatePredictionField(field: string, value: unknown): void {
    this.predictionFormData[field] = value;
    console.log(`[Chatbot Widget] Updated prediction field ${field}:`, value);
  }

  private buildPredictionPayload(): PredictionPayload {
    const pd = this.predictionFormData;
    const toNum = (k: string, fallback = 0) => {
      const v = pd[k];
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const toOptionalNum = (k: string): number | undefined => {
      const v = pd[k];
      if (v === null || v === undefined || v === '') {
        return undefined;
      }

      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const toBinary = (k: string) => {
      const v = pd[k];
      const n = Number(v);
      if (Number.isFinite(n)) return n === 1 ? 1 : 0;
      // accept truthy strings like 'yes'/'oui'
      if (typeof v === 'string') {
        const s = v.toLowerCase();
        return (s === '1' || s === 'oui' || s === 'true' || s === 'yes') ? 1 : 0;
      }
      return 0;
    };

    const payload: PredictionPayload = {
      variete: String(pd['variete'] ?? ''),
      region: String(pd['region'] ?? ''),
      methode_recolte: String(pd['methode_recolte'] ?? ''),
      type_sol: String(pd['type_sol'] ?? ''),
      lavage_effectue: String(pd['lavage_effectue'] ?? ''),
      type_machine: String(pd['type_machine'] ?? ''),
      type_broyeur: String(pd['type_broyeur'] ?? ''),
      type_malaxeur: String(pd['type_malaxeur'] ?? ''),
      type_nettoyage: String(pd['type_nettoyage'] ?? ''),
      type_separation: String(pd['type_separation'] ?? ''),
      controle_temperature: String(pd['controle_temperature'] ?? ''),
      poids_olives_kg: toNum('poids_olives_kg'),
      maturite_niveau_1_5: toNum('maturite_niveau_1_5'),
      duree_stockage_jours: toNum('duree_stockage_jours'),
      temps_depuis_recolte_heures: toNum('temps_depuis_recolte_heures'),
      temperature_malaxage_c: toNum('temperature_malaxage_c'),
      duree_malaxage_min: toNum('duree_malaxage_min'),
      vitesse_decanteur_tr_min: toNum('vitesse_decanteur_tr_min'),
      humidite_pourcent: toNum('humidite_pourcent'),
      acidite_olives_pourcent: toNum('acidite_olives_pourcent'),
      taux_feuilles_pourcent: toNum('taux_feuilles_pourcent'),
      pression_extraction_bar: toNum('pression_extraction_bar'),
      nombre_etapes: toNum('nombre_etapes'),
      presence_ajout_eau: toBinary('presence_ajout_eau'),
      presence_presse: toBinary('presence_presse'),
      presence_separateur: toBinary('presence_separateur'),
      ...(this.showLabAnalysisFields ? {
        acidite_huile_pourcent: toOptionalNum('acidite_huile_pourcent'),
        indice_peroxyde_meq_o2_kg: toOptionalNum('indice_peroxyde_meq_o2_kg'),
        polyphenols_mg_kg: toOptionalNum('polyphenols_mg_kg'),
        k232: toOptionalNum('k232'),
        k270: toOptionalNum('k270'),
      } : {}),
    };

    return payload;
  }

  private validatePredictionPayload(payload: PredictionPayload): string[] {
    const errors: string[] = [];
    const requireNumber = (key: keyof PredictionPayload, label: string) => {
      const value = (payload as any)[key];
      if (!Number.isFinite(value)) {
        errors.push(`${label} doit être un nombre valide.`);
      }
    };

    // Required text fields
    const requiredTextFields: (keyof PredictionPayload)[] = [
      'variete',
      'region',
      'methode_recolte',
      'type_sol',
      'lavage_effectue',
      'type_machine',
      'type_broyeur',
      'type_malaxeur',
      'type_nettoyage',
      'type_separation',
      'controle_temperature',
    ];
    requiredTextFields.forEach((key) => {
      const raw = payload[key];
      if (!raw || String(raw).trim() === '') {
        errors.push(`${String(key)} est requis.`);
      }
    });

    // Required numeric fields
    requireNumber('poids_olives_kg','poids_olives_kg');
    requireNumber('maturite_niveau_1_5','maturite_niveau_1_5');
    requireNumber('duree_stockage_jours','duree_stockage_jours');
    requireNumber('temps_depuis_recolte_heures','temps_depuis_recolte_heures');
    requireNumber('temperature_malaxage_c','temperature_malaxage_c');
    requireNumber('duree_malaxage_min','duree_malaxage_min');
    requireNumber('vitesse_decanteur_tr_min','vitesse_decanteur_tr_min');
    requireNumber('humidite_pourcent','humidite_pourcent');
    requireNumber('acidite_olives_pourcent','acidite_olives_pourcent');
    requireNumber('taux_feuilles_pourcent','taux_feuilles_pourcent');
    requireNumber('pression_extraction_bar','pression_extraction_bar');
    requireNumber('nombre_etapes','nombre_etapes');
    requireNumber('presence_ajout_eau','presence_ajout_eau');
    requireNumber('presence_presse','presence_presse');
    requireNumber('presence_separateur','presence_separateur');
    if (this.showLabAnalysisFields) {
      requireNumber('acidite_huile_pourcent','acidite_huile_pourcent');
      requireNumber('indice_peroxyde_meq_o2_kg','indice_peroxyde_meq_o2_kg');
      requireNumber('k270','k270');
      requireNumber('polyphenols_mg_kg','polyphenols_mg_kg');
      requireNumber('k232','k232');
    }

    return errors;
  }

  private shouldOpenPredictionModalFromResponse(response: ChatbotResponse, botMessage: ChatMessage | null): boolean {
    const intent = String(response.intent ?? '').toLowerCase();

    return intent === 'prediction';
  }

  predictionField(field: string): string {
    return String(this.predictionFormData[field] ?? '');
  }

  predictionNumber(field: string): number {
    const numericValue = Number(this.predictionFormData[field]);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Template helpers
  // ─────────────────────────────────────────────────────────────────────────────

  trackByMessageId(_: number, message: ChatMessage): number {
    return message.id;
  }

  isChartMessage(message: ChatMessage): boolean {
    return message.sender === 'bot' && message.type === 'chart' && (this.hasChartData(message) || !!message.rankingData);
  }

  isRankingMessage(message: ChatMessage): boolean {
    // Show ranking view only when bot returned ranking data and NOT during choice prompt
    return message.sender === 'bot' && message.type !== 'choice' && !!message.rankingData && !!message.rankingIntent;
  }

  isChoiceMessage(message: ChatMessage): boolean {
    return message.sender === 'bot' && message.type === 'choice' && message.options.length > 0;
  }

  onTextareaInput(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${nextHeight}px`;
  }

  toggleRankingView(message: ChatMessage, viewMode: RankingViewMode): void {
    message.rankingViewMode = viewMode;

    if (viewMode === 'chart') {
      setTimeout(() => this.renderCharts());
      return;
    }
    this.destroyAllCharts();
  }

  /** Returns the first/default metric key for a given ranking intent */
  private defaultMetricForIntent(intent: RankingIntent | string | null): string {
    switch (intent) {
      case 'fournisseur':        return 'kg';
      case 'machines_utilisees': return 'executions';
      case 'lot_liste':          return 'quantite';
      case 'analyse_labo':       return 'acidite';
      case 'stock':              return 'quantite';
      default:                   return 'kg';
    }
  }

  getRankingMetric(message: ChatMessage): string {
    if (message.rankingMetric) return message.rankingMetric;
    return this.defaultMetricForIntent(message.rankingIntent);
  }

  setRankingMetric(message: ChatMessage, metric: string): void {
    message.rankingMetric = metric;
    // Rebuild chart data with new metric for ranking types that support it
    if (message.rankingData && message.rankingIntent && ['fournisseur', 'machines_utilisees', 'lot_liste', 'analyse_labo', 'stock'].includes(message.rankingIntent)) {
      message.chartData = this.buildRankingChartPayload(message.rankingData, message.rankingIntent, metric);
    }
    setTimeout(() => this.renderCharts());
  }

  getRankingItems(message: ChatMessage): unknown[] {
    if (!message.rankingData || !('items' in message.rankingData)) {
      return [];
    }
    return message.rankingData.items as unknown[];
  }

  public getTableMachineItems(message: ChatMessage): MachineTableItem[] {
    const data: any = (message as any).tableData;
    if (!data) return [];
    const rawItems = Array.isArray(data)
      ? data
      : Array.isArray(data.machines)
        ? data.machines
        : Array.isArray(data.items)
          ? data.items
          : [];

    return rawItems.map((item: any, index: number) => ({
      name: String(item?.nomMachine ?? item?.name ?? item?.machine ?? `Machine ${index + 1}`),
      status: String(item?.etatMachine ?? item?.status ?? item?.statut ?? '—'),
      details: [item?.typeMachine, item?.huilerieNom]
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
        .join(' • ') || '-',
      machineRef: item?.reference ?? item?.idMachine ?? '',
      nomMachine: item?.nomMachine,
      etat: item?.etatMachine,
      typeMachine: item?.typeMachine,
      huilerieNom: item?.huilerieNom,
    }));
  }

  private normalizeMachine(item: any): MachineListItem {
    const nom = item?.nomMachine ?? item?.nom_machine ?? item?.nom ?? 'Machine inconnue';
    const categorie = item?.categorieMachine ?? item?.categorie_machine ?? 'Inconnue';
    const type = item?.typeMachine ?? item?.type_machine ?? 'Inconnu';
    const executions = Number(item?.nbExecutions ?? item?.nb_executions ?? 0) || 0;

    return {
      nom: String(nom).trim() || 'Machine inconnue',
      categorie: String(categorie).trim() || 'Inconnue',
      type: String(type).trim() || 'Inconnu',
      executions: executions,
    };
  }

  private extractMachineList(data: unknown): MachineListItem[] {
    if (!data || typeof data !== 'object') return [];

    const rawMachines = Array.isArray((data as any).machines)
      ? (data as any).machines
      : Array.isArray((data as any).items)
        ? (data as any).items
        : [];

    return rawMachines.map((item: any) => this.normalizeMachine(item));
  }

  private extractMachineTableRows(data: unknown): MachineTableItem[] {
    if (!data || typeof data !== 'object') return [];

    const rawMachines = Array.isArray((data as any).machines)
      ? (data as any).machines
      : Array.isArray((data as any).items)
        ? (data as any).items
        : [];

    return rawMachines.map((item: any, index: number) => ({
      name: String(item?.nomMachine ?? item?.name ?? item?.machine ?? `Machine ${index + 1}`),
      status: String(item?.etatMachine ?? item?.status ?? item?.statut ?? '—'),
      details: [item?.typeMachine, item?.huilerieNom]
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
        .join(' • ') || '-',
      machineRef: item?.reference ?? item?.idMachine ?? '',
      nomMachine: item?.nomMachine,
      etat: item?.etatMachine,
      typeMachine: item?.typeMachine,
      huilerieNom: item?.huilerieNom,
    }));
  }

  public isMachineTableMessage(message: ChatMessage): boolean {
    const intent = (message as any).tableIntent ?? message.debug?.intent ?? message.rankingIntent;
    if (!intent) return false;
    const s = String(intent).toLowerCase();
    return s.includes('machine') || s.includes('panne') || s.includes('etat') || s.includes('tous');
  }

  public isMachineListMessage(message: ChatMessage): boolean {
    const intent = (message as any).tableIntent ?? message.debug?.intent ?? message.rankingIntent;
    if (!intent) return false;
    return String(intent).toLowerCase() === 'machine';
  }

  public getTableMachineListItems(message: ChatMessage): MachineListItem[] {
    const data: any = (message as any).tableData;
    if (!data) return [];

    const rawItems = Array.isArray(data.machineList)
      ? data.machineList
      : Array.isArray(data.machines)
        ? data.machines
        : Array.isArray(data.items)
          ? data.items
          : [];

    return rawItems.map((item: any) => this.normalizeMachine(item));
  }

  getFournisseurItems(message: ChatMessage): SupplierRankingItem[] {
    return this.getRankingItems(message) as SupplierRankingItem[];
  }

  getMachineItems(message: ChatMessage): MachineRankingItem[] {
    return this.getRankingItems(message) as MachineRankingItem[];
  }

  getLotItems(message: ChatMessage): LotRankingItem[] {
    return this.getRankingItems(message) as LotRankingItem[];
  }

  getAnalysisItems(message: ChatMessage): AnalysisRankingItem[] {
    return this.getRankingItems(message) as AnalysisRankingItem[];
  }

  getStockItems(message: ChatMessage): StockRankingItem[] {
    return this.getRankingItems(message) as StockRankingItem[];
  }

  getDisplayedItems<T>(items: T[], limit: number = 8): T[] {
    return items.slice(0, limit);
  }

  getHiddenItemsCount(items: unknown[], limit: number = 8): number {
    return Math.max(0, (items?.length ?? 0) - limit);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drag
  // ─────────────────────────────────────────────────────────────────────────────

  startDrag(event: MouseEvent | TouchEvent): void {
    if (!this.isOpen || this.isFullScreenActive || !this.chatWindowRef) return;

    const panel = this.chatWindowRef.nativeElement;
    const panelRect = panel.getBoundingClientRect();
    const pointer = this.getPointer(event);
    if (!pointer) return;

    this.isDragging = true;
    this.dragOffsetX = pointer.clientX - panelRect.left;
    this.dragOffsetY = pointer.clientY - panelRect.top;
    this.panelLeft = panelRect.left;
    this.panelTop = panelRect.top;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.updateDragPosition(event);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    this.updateDragPosition(event);
  }

  @HostListener('document:touchend')
  onTouchEnd(): void {
    this.isDragging = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= 640;
    if (this.isOpen && !this.isDragging && !this.isFullScreenActive) {
      this.clampToViewport();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.isOpen && this.isFullScreenActive) {
      this.isFullScreen = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed getters
  // ─────────────────────────────────────────────────────────────────────────────

  get isPanelVisible(): boolean {
    return this.isOpen || this.isClosing;
  }

  get isFullScreenActive(): boolean {
    return this.isFullScreen || this.isMobile;
  }

  get showSuggestions(): boolean {
    return !this.hasSentUserMessage && !this.draftMessage.trim() && !this.isLoading;
  }

  get canSend(): boolean {
    return !!this.draftMessage.trim() && !this.isLoading;
  }

  get panelStyles(): Record<string, string> {
    if (!this.isOpen || this.isFullScreenActive || !this.chatWindowRef) {
      return {};
    }
    return {
      left: `${this.panelLeft}px`,
      top: `${this.panelTop}px`,
      right: 'auto',
      bottom: 'auto',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private — drag helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private updateDragPosition(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging || this.isFullScreenActive || !this.chatWindowRef) return;

    const pointer = this.getPointer(event);
    if (!pointer) return;

    this.panelLeft = pointer.clientX - this.dragOffsetX;
    this.panelTop = pointer.clientY - this.dragOffsetY;
    this.clampToViewport();
  }

  private clampToViewport(): void {
    const panel = this.chatWindowRef?.nativeElement;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const maxLeft = window.innerWidth - panelRect.width - 8;
    const maxTop = window.innerHeight - panelRect.height - 8;

    this.panelLeft = Math.max(8, Math.min(this.panelLeft, maxLeft));
    this.panelTop = Math.max(8, Math.min(this.panelTop, maxTop));
  }

  private resetPanelPosition(): void {
    if (this.isFullScreenActive) return;

    const panel = this.chatWindowRef?.nativeElement;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    this.panelLeft = window.innerWidth - panelRect.width - 24;
    this.panelTop = window.innerHeight - panelRect.height - 88;
    this.clampToViewport();
  }

  private getPointer(event: MouseEvent | TouchEvent): { clientX: number; clientY: number } | null {
    if (event instanceof MouseEvent) {
      return { clientX: event.clientX, clientY: event.clientY };
    }
    if (event.touches.length > 0) {
      const t = event.touches[0];
      return { clientX: t.clientX, clientY: t.clientY };
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private — scroll / open
  // ─────────────────────────────────────────────────────────────────────────────

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const container = this.messagesContainerRef?.nativeElement;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });
  }

  private openWidget(): void {
    this.hasUnreadPulse = false;
    this.isOpen = true;
    this.isClosing = false;

    if (this.closeAnimationTimer) {
      clearTimeout(this.closeAnimationTimer);
      this.closeAnimationTimer = null;
    }

    setTimeout(() => {
      if (!this.isFullScreenActive) {
        this.resetPanelPosition();
      }
      this.renderCharts();
      this.scrollToBottom();
    });
  }

  private nextMessageId(): number {
    this.messageIdSequence += 1;
    return this.messageIdSequence;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private — message creation
  // ─────────────────────────────────────────────────────────────────────────────

  private createBotMessage(response: ChatbotResponse): ChatMessage | null {
    let intent = (response.intent ?? null) as RankingIntent | string | null;
    const payloadIntent = response.data ? this.inferRankingIntentFromPayload(response.data) : null;
    // Preserve explicit backend intent 'machine' — do not override it with ranking inference.
    const explicitIntent = response.intent ? String(response.intent).toLowerCase() : null;
    if (payloadIntent && (!explicitIntent || ['inconnu', 'unknown'].includes(explicitIntent))) {
      intent = payloadIntent;
    }
    const isRankingIntent = RANKING_INTENTS.includes(intent as RankingIntent);

    // ── 1. Détection automatique de l'intent depuis le texte si inconnu ──────
    if (
      (!intent || ['inconnu', 'unknown'].includes(String(intent).toLowerCase())) &&
      response.data
    ) {
      const textContent = (response.message || response.response || '').toLowerCase();
      if (textContent.includes('stock')) {
        intent = 'stock';
      } else if (textContent.includes('fournisseur') || textContent.includes('supplier')) {
        intent = 'fournisseur';
      } else if (
        textContent.includes('panne') ||
        textContent.includes('en panne') ||
        textContent.includes('défaill') ||
        textContent.includes('defaill') ||
        textContent.includes('incident machine')
      ) {
        intent = 'machines_pannes';
      } else if (
        textContent.includes('qualité') ||
        textContent.includes('qualite') ||
        textContent.includes('type de machine') ||
        textContent.includes('machines de huilerie') ||
        textContent.includes('huilerie')
      ) {
        intent = 'machines_huilerie';
      } else if (textContent.includes('machine') || textContent.includes('execution')) {
        intent = 'machines_utilisees';
      } else if (textContent.includes('lot') && textContent.includes('référence')) {
        intent = 'lot_liste';
      } else if (textContent.includes('analyse') || textContent.includes('acidité')) {
        intent = 'analyse_labo';
      }
    }

    // ── 2. Si backend envoie type='choice' SANS données de ranking → ignorer ─
    //    C'est le doublon parasite qu'on veut éliminer.
    if (
      response.type === 'choice' &&
      isRankingIntent &&
      !response.data
    ) {
      console.log('[Chatbot Widget] Skipping empty choice message (no data)');
      return null;
    }

    // ── 3. Si intent inconnu ET aucune donnée → ignorer ──────────────────────
    if (
      (!intent || ['inconnu', 'unknown'].includes(String(intent).toLowerCase())) &&
      !response.data
    ) {
      console.log('[Chatbot Widget] Skipping empty response with no data and unknown intent');
      return null;
    }

    const isRanking = RANKING_INTENTS.includes(intent as RankingIntent);

    // ── 4. Normaliser les données de ranking ─────────────────────────────────
    let rankingData: RankingPayload = null;
    let chartData: ChatbotChartPayload | null = null;

    if (isRanking && response.type !== 'choice') {
      rankingData = this.normalizeRankingData(response.data, intent as RankingIntent);
      if (rankingData) {
        chartData = this.buildRankingChartPayload(
          rankingData,
          intent as RankingIntent,
          this.defaultMetricForIntent(intent as RankingIntent),
        );
      }
    }

    // Fallback chart générique
    if (!chartData && response.type === 'chart') {
      chartData = this.normalizeChartData(response.data);
    }

    // ── 5. Décider le type de message final ──────────────────────────────────
    let messageType = response.type ?? 'text';
    let pendingRankingData: RankingPayload = null;

    if (
      isRanking &&
      rankingData &&
      messageType !== 'choice' &&
      response.pending_choice !== false &&
      !response.selected_option
    ) {
      // Backend a renvoyé directement text/chart avec les données
      // → on intercepte et on crée le message choice
      pendingRankingData = rankingData;
      messageType = 'choice';
    } else if (isRanking && messageType === 'choice') {
      // Backend a envoyé type='choice' avec données → stocker pour après
      rankingData = this.normalizeRankingData(response.data, intent as RankingIntent);
      if (rankingData) {
        chartData = this.buildRankingChartPayload(
          rankingData,
          intent as RankingIntent,
          this.defaultMetricForIntent(intent as RankingIntent),
        );
        pendingRankingData = rankingData;
      }
    }

    // Si on vient de sendChoice (selected_option), on affiche le résultat
    if (response.selected_option) {
      messageType = response.selected_option === 'graphique' ? 'chart' : 'text';
    }

    const shouldAttachRanking =
      messageType !== 'choice' && isRanking && !!rankingData;

    const viewMode: RankingViewMode =
      response.selected_option === 'texte' ? 'text' : 'chart';

    const botMessage: ChatMessage = {
      id: this.nextMessageId(),
      sender: 'bot',
      content: response.message || response.response || 'Réponse reçue.',
      timestamp: new Date(),
      type: messageType,
      options: messageType === 'choice' ? ['graphique', 'texte'] : [],
      chartType: messageType === 'chart' ? (response.chart_type ?? 'bar') : null,
      chartData: messageType === 'chart' ? chartData : null,
      rankingData: shouldAttachRanking ? rankingData : null,
      rankingIntent: shouldAttachRanking ? (intent as RankingIntent) : null,
      rankingViewMode: viewMode,
      rankingMetric: this.defaultMetricForIntent(intent as RankingIntent),
      debug: response.intent || response.confidence !== null || response.applied_scope
        ? {
            intent: response.intent,
            confidence: response.confidence,
            appliedScope: response.applied_scope,
          }
        : null,
    };

    // Stocker les données en attente sur le message choice
    if (messageType === 'choice' && pendingRankingData) {
      (botMessage as any)._pendingRankingData = pendingRankingData;
      (botMessage as any)._pendingRankingIntent = intent as RankingIntent;
    }

    // If backend sent a 'choice' or structured data for a non-ranking machine intent,
    // convert to a direct text/table message and attach raw tableData for template rendering.
    if (!isRanking && response.data) {
      const tableIntent = response.intent ?? intent ?? null;
      (botMessage as any).tableIntent = tableIntent;

      if (tableIntent === 'machine') {
        const machineList = this.extractMachineList(response.data);
        if (machineList.length === 0) {
          botMessage.content = 'Aucune machine trouvée.';
          botMessage.type = 'text';
          (botMessage as any).tableData = null;
        } else {
          botMessage.content = 'Machines de l\'huilerie';
          (botMessage as any).tableData = { machineList };
        }
      } else {
        const machineRows = this.extractMachineTableRows(response.data);
        (botMessage as any).tableData = { machines: machineRows };
      }

      if (botMessage.type === 'choice') {
        botMessage.type = 'text';
        botMessage.options = [];
      }
    }

    return botMessage;
  }

  private normalizeOptions(options: string[]): string[] {
    const fallback = ['texte', 'graphique'];
    const normalized = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
      .map((o) => o.toLowerCase());
    return normalized.length >= 2 ? normalized : fallback;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private — unified ranking normalization
  // ─────────────────────────────────────────────────────────────────────────────

  private normalizeRankingData(data: unknown, intent: RankingIntent | null): RankingPayload {
    if (!data) return null;

    switch (intent) {
      case 'fournisseur':
        return this.normalizeFournisseurData(data);
      case 'machines_utilisees':
        return this.normalizeMachinesData(data);
      case 'lot_liste':
        return this.normalizeLotsData(data);
      case 'analyse_labo':
        return this.normalizeAnalysesData(data);
      case 'stock':
        return this.normalizeStockData(data);
      default:
        return null;
    }
  }

  private inferRankingIntentFromPayload(data: unknown): RankingIntent | null {
    if (!data) return null;

    const hasArray = (key: string): boolean =>
      data && typeof data === 'object' && Array.isArray((data as any)[key]);

    if (hasArray('stocks')) {
      return 'stock';
    }
    if (hasArray('suppliers') || hasArray('fournisseurs')) {
      return 'fournisseur';
    }
    if (hasArray('machines') || hasArray('machinesUtilisees')) {
      return 'machines_utilisees';
    }
    if (hasArray('lots')) {
      return 'lot_liste';
    }
    if (hasArray('analyses')) {
      return 'analyse_labo';
    }

    const arrayPayload = Array.isArray(data) ? data : this.extractArrayData(data, ['stocks', 'suppliers', 'fournisseurs', 'machines', 'machinesUtilisees', 'lots', 'analyses', 'items', 'data', 'value']);
    if (!Array.isArray(arrayPayload) || arrayPayload.length === 0) {
      return null;
    }

    const first = arrayPayload[0];
    if (!first || typeof first !== 'object') {
      return null;
    }

    const record = first as Record<string, unknown>;
    if ('reference_stock' in record || 'quantite_disponible' in record || 'type_stock' in record || 'lot_reference' in record) {
      return 'stock';
    }
    if ('fournisseur_nom' in record || 'kg' in record || 'rendement' in record || 'acidity' in record) {
      return 'fournisseur';
    }
    if ('nbExecutions' in record || 'nomMachine' in record || 'machineRef' in record) {
      return 'machines_utilisees';
    }
    if ('reference' in record && 'qualite_huile' in record) {
      return 'lot_liste';
    }
    if ('lot_ref' in record || 'k270' in record || 'acidite_huile_pourcent' in record) {
      return 'analyse_labo';
    }

    return null;
  }

  private normalizeFournisseurData(data: unknown): SupplierRankingPayload | null {
    let suppliers: unknown[] = [];

    // Check for specific suppliers property first
    if (data && typeof data === 'object' && 'suppliers' in data && Array.isArray((data as any).suppliers)) {
      suppliers = (data as any).suppliers;
    } else {
      // Fallback to extractArrayData for compatibility
      suppliers = this.extractArrayData(data, ['suppliers', 'fournisseurs', 'items', 'data']);
    }

    if (!suppliers.length) return null;

    const items = suppliers
      .map((s, i) => this.normalizeFournisseurItem(s, i))
      .filter((item): item is SupplierRankingItem => item !== null)
      .sort((a, b) => b.kg - a.kg);

    if (!items.length) return null;

    return {
      items,
      bestSupplierName: items[0]?.name ?? null,
      weakSupplierNames: items.filter((i) => i.acidityOutOfRange || i.rendementOutOfRange).map((i) => i.name),
    };
  }

  private normalizeFournisseurItem(item: unknown, index: number): SupplierRankingItem | null {
    if (!item || typeof item !== 'object') return null;

    const r = item as Record<string, unknown>;
    const name = String(r['name'] ?? r['fournisseur_nom'] ?? r['supplier'] ?? `Fournisseur ${index + 1}`).trim();
    const kg = this.normalizeNumber(r['kg'] ?? r['quantity'] ?? r['quantite_totale_kg'] ?? 0);
    const acidity = this.normalizeNumber(r['acidity'] ?? r['acidite'] ?? r['acidite_moyenne'] ?? 0);
    const rendement = this.normalizeNumber(r['rendement'] ?? r['rendement_moyen'] ?? 0);
    const lots = Math.max(0, Math.round(this.normalizeNumber(r['lots'] ?? r['nb_lots'] ?? 0)));

    if (!name) return null;

    return {
      name,
      kg,
      acidity,
      rendement,
      lots,
      acidityOutOfRange: acidity < SUPPLIER_ACIDITY_RANGE.min || acidity > SUPPLIER_ACIDITY_RANGE.max,
      rendementOutOfRange: rendement < SUPPLIER_RENDEMENT_RANGE.min || rendement > SUPPLIER_RENDEMENT_RANGE.max,
    };
  }

  private normalizeMachinesData(data: unknown): MachineRankingPayload | null {
    let machines: unknown[] = [];

    // Check for specific machines property first
    if (data && typeof data === 'object' && 'machines' in data && Array.isArray((data as any).machines)) {
      machines = (data as any).machines;
    } else {
      // Fallback to extractArrayData for compatibility
      machines = this.extractArrayData(data, ['machines', 'machinesUtilisees', 'items', 'data']);
    }

    if (!machines.length) return null;

    const items = machines
      .map((m, i) => this.normalizeMachineItem(m, i))
      .filter((item): item is MachineRankingItem => item !== null)
      .sort((a, b) => b.nbExecutions - a.nbExecutions);

    if (!items.length) return null;

    return { items };
  }

  private normalizeMachineItem(item: unknown, index: number): MachineRankingItem | null {
    if (!item || typeof item !== 'object') return null;

    const r = item as Record<string, unknown>;
    const name = String(r['name'] ?? r['nomMachine'] ?? r['machine'] ?? `Machine ${index + 1}`).trim();
    const nbExecutions = Math.max(0, Math.round(this.normalizeNumber(r['nbExecutions'] ?? r['executions'] ?? 0)));
    const rendementMoyen = this.normalizeNumber(r['rendementMoyen'] ?? r['rendement'] ?? 0);
    const totalProduit = this.normalizeNumber(r['totalProduit'] ?? r['production'] ?? 0);

    if (!name) return null;

    return {
      name,
      nbExecutions,
      rendementMoyen,
      totalProduit,
    };
  }

  private normalizeLotsData(data: unknown): LotRankingPayload | null {
    let lots: unknown[] = [];

    // Check for specific lots property first
    if (data && typeof data === 'object' && 'lots' in data && Array.isArray((data as any).lots)) {
      lots = (data as any).lots;
    } else {
      // Fallback to extractArrayData for compatibility
      lots = this.extractArrayData(data, ['lots', 'items', 'data']);
    }

    if (!lots.length) return null;

    const items = lots
      .map((l, i) => this.normalizeLotItem(l, i))
      .filter((item): item is LotRankingItem => item !== null);

    if (!items.length) return null;

    return { items };
  }

  private normalizeLotItem(item: unknown, index: number): LotRankingItem | null {
    if (!item || typeof item !== 'object') return null;

    const r = item as Record<string, unknown>;
    const name = String(r['name'] ?? r['reference'] ?? `Lot ${index + 1}`).trim();
    const reference = String(r['reference'] ?? r['ref'] ?? name).trim();
    const variete = String(r['variete'] ?? r['variety'] ?? '').trim();
    const fournisseur_nom = String(r['fournisseur_nom'] ?? r['supplier'] ?? '').trim();
    const quantite_initiale = this.normalizeNumber(r['quantite_initiale'] ?? r['quantity'] ?? 0);
    const qualite_huile = String(r['qualite_huile'] ?? r['quality'] ?? '').trim();

    if (!reference) return null;

    return {
      name,
      reference,
      variete,
      fournisseur_nom,
      quantite_initiale,
      qualite_huile,
    };
  }

  private normalizeAnalysesData(data: unknown): AnalysisRankingPayload | null {
    let analyses: unknown[] = [];

    // Check for specific analyses property first
    if (data && typeof data === 'object' && 'analyses' in data && Array.isArray((data as any).analyses)) {
      analyses = (data as any).analyses;
    } else {
      // Fallback to extractArrayData for compatibility
      analyses = this.extractArrayData(data, ['analyses', 'items', 'data']);
    }

    if (!analyses.length) return null;

    const items = analyses
      .map((a, i) => this.normalizeAnalysisItem(a, i))
      .filter((item): item is AnalysisRankingItem => item !== null);

    if (!items.length) return null;

    return { items };
  }

  private normalizeAnalysisItem(item: unknown, index: number): AnalysisRankingItem | null {
    if (!item || typeof item !== 'object') return null;

    const r = item as Record<string, unknown>;
    const lot_ref = String(r['lot_ref'] ?? r['reference'] ?? `Lot ${index + 1}`).trim();
    const name = lot_ref;
    const date_analyse = String(r['date_analyse'] ?? r['date'] ?? '').trim();
    const acidite_huile_pourcent = this.normalizeNumber(r['acidite_huile_pourcent'] ?? r['acidity'] ?? 0);
    const indice_peroxyde_meq_o2_kg = this.normalizeNumber(r['indice_peroxyde_meq_o2_kg'] ?? r['peroxide'] ?? 0);
    const k270 = this.normalizeNumber(r['k270'] ?? 0);

    if (!lot_ref) return null;

    return {
      name,
      lot_ref,
      date_analyse,
      acidite_huile_pourcent,
      indice_peroxyde_meq_o2_kg,
      k270,
      acidityOutOfRange: acidite_huile_pourcent < ANALYSIS_ACIDITY_RANGE.min || acidite_huile_pourcent > ANALYSIS_ACIDITY_RANGE.max,
      peroxideOutOfRange: indice_peroxyde_meq_o2_kg < ANALYSIS_PEROXIDE_RANGE.min || indice_peroxyde_meq_o2_kg > ANALYSIS_PEROXIDE_RANGE.max,
      k270OutOfRange: k270 < ANALYSIS_K270_RANGE.min || k270 > ANALYSIS_K270_RANGE.max,
    };
  }

  private normalizeStockData(data: unknown): StockRankingPayload | null {
    let rows: unknown[] = [];

    // Check for specific stocks property first
    if (data && typeof data === 'object' && 'stocks' in data && Array.isArray((data as any).stocks)) {
      rows = (data as any).stocks;
    } else {
      // Fallback to extractArrayData for compatibility
      rows = this.extractArrayData(data, ['value', 'stocks', 'items', 'data']);
    }

    if (!rows.length) return null;

    const items = rows
      .map((r: any) => ({
        name: String(r.reference_stock || r.reference || 'N/D'),
        reference_stock: String(r.reference_stock || r.reference || 'N/D'),
        variete: String(r.variete || 'Inconnue'),
        quantite_disponible: Number(r.quantite_disponible || r.total_stock || 0),
        type_stock: String(r.type_stock || 'Olive'),
        lot_reference: String(r.lot_reference || r.references_lots || ''),
        huilerie_nom: String(r.huilerie_nom || ''),
      }))
      .filter((i: any) => i.reference_stock !== 'N/D');

    if (!items.length) return null;
    return { items };
  }

  private extractArrayData(data: unknown, keys: string[]): unknown[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const record = data as Record<string, unknown>;
    for (const key of keys) {
      const candidate = record[key];
      if (Array.isArray(candidate)) return candidate;
    }

    return [];
  }

  private buildRankingChartPayload(ranking: RankingPayload, intent: RankingIntent | null, metric?: string): ChatbotChartPayload | null {
    if (!ranking) return null;

    if ('items' in ranking && ranking.items && (ranking.items as any[]).length > 0) {
      const items = (ranking.items as any[]);

      if (intent === 'fournisseur' && (items[0] as any).kg !== undefined) {
        const suppliers = items as SupplierRankingItem[];
        
        let datasets: ChatbotChartPayload['datasets'] = [];
        if (!metric) {
          // Show all metrics by default
          datasets = [
            { label: 'Quantité (kg)', data: suppliers.map((s) => s.kg), type: 'bar' },
            { label: 'Rendement (%)', data: suppliers.map((s) => s.rendement), type: 'bar' },
            { label: 'Acidité (%)', data: suppliers.map((s) => s.acidity), type: 'bar' },
          ];
        } else {
          // Show only selected metric
          if (metric === 'kg') {
            datasets = [{ label: 'Quantité (kg)', data: suppliers.map((s) => s.kg), type: 'bar' }];
          } else if (metric === 'rendement') {
            datasets = [{ label: 'Rendement (%)', data: suppliers.map((s) => s.rendement), type: 'bar' }];
          } else if (metric === 'acidite') {
            datasets = [{ label: 'Acidité (%)', data: suppliers.map((s) => s.acidity), type: 'bar' }];
          }
        }
        
        return {
          labels: suppliers.map((s) => s.name),
          datasets,
        };
      }

      if (intent === 'machines_utilisees' && (items[0] as any).nbExecutions !== undefined) {
        const machines = items as MachineRankingItem[];
        
        let datasets: ChatbotChartPayload['datasets'] = [];
        if (!metric) {
          // Show all metrics by default
          datasets = [
            { label: 'Exécutions', data: machines.map((m) => m.nbExecutions), type: 'bar' },
            { label: 'Rendement moyen (%)', data: machines.map((m) => m.rendementMoyen), type: 'bar' },
            { label: 'Production (L)', data: machines.map((m) => m.totalProduit), type: 'bar' },
          ];
        } else {
          // Show only selected metric
          if (metric === 'executions') {
            datasets = [{ label: 'Exécutions', data: machines.map((m) => m.nbExecutions), type: 'bar' }];
          } else if (metric === 'rendement') {
            datasets = [{ label: 'Rendement moyen (%)', data: machines.map((m) => m.rendementMoyen), type: 'bar' }];
          } else if (metric === 'production') {
            datasets = [{ label: 'Production (L)', data: machines.map((m) => m.totalProduit), type: 'bar' }];
          }
        }
        
        return {
          labels: machines.map((m) => m.name),
          datasets,
        };
      }

      if (intent === 'lot_liste' && (items[0] as any).quantite_initiale !== undefined) {
        const lots = items as LotRankingItem[];
        return {
          labels: lots.map((l) => l.reference),
          datasets: [
            { label: 'Quantité (kg)', data: lots.map((l) => l.quantite_initiale), type: 'bar' },
          ],
        };
      }

      if (intent === 'analyse_labo' && (items[0] as any).acidite_huile_pourcent !== undefined) {
        const analyses = items as AnalysisRankingItem[];
        
        let datasets: ChatbotChartPayload['datasets'] = [];
        if (!metric) {
          // Show all metrics by default
          datasets = [
            { label: 'Acidité (%)', data: analyses.map((a) => a.acidite_huile_pourcent), type: 'bar' },
            { label: 'Peroxyde (meq O2/kg)', data: analyses.map((a) => a.indice_peroxyde_meq_o2_kg), type: 'bar' },
            { label: 'K270', data: analyses.map((a) => a.k270), type: 'bar' },
          ];
        } else {
          // Show only selected metric
          if (metric === 'acidite') {
            datasets = [{ label: 'Acidité (%)', data: analyses.map((a) => a.acidite_huile_pourcent), type: 'bar' }];
          } else if (metric === 'peroxyde') {
            datasets = [{ label: 'Peroxyde (meq O2/kg)', data: analyses.map((a) => a.indice_peroxyde_meq_o2_kg), type: 'bar' }];
          } else if (metric === 'k270') {
            datasets = [{ label: 'K270', data: analyses.map((a) => a.k270), type: 'bar' }];
          }
        }
        
        return {
          labels: analyses.map((a) => a.lot_ref),
          datasets,
        };
      }

      if (intent === 'stock' && (items[0] as any).quantite_disponible !== undefined) {
        const stockItems = items as StockRankingItem[];
        return {
          labels: stockItems.map(s => `${s.reference_stock} (${s.variete})`),
          datasets: [
            { label: 'Quantité disponible (kg)', data: stockItems.map(s => s.quantite_disponible), type: 'bar' },
          ],
        };
      }
    }

    return null;
  }

  private normalizeChartData(data: unknown): ChatbotChartPayload | null {
    if (!data) return null;

    if (typeof data === 'object' && data !== null && 'labels' in data && 'datasets' in data) {
      const payload = data as ChatbotChartPayload;
      return {
        labels: payload.labels.map((l: string) => String(l)),
        datasets: payload.datasets.map((ds: { label?: string; data?: unknown[] }, i: number) => ({
          label: String(ds?.label ?? `Série ${i + 1}`),
          data: Array.isArray(ds?.data) ? ds.data.map((v: unknown) => this.normalizeNumber(v)) : [],
        })),
      };
    }

    if (Array.isArray(data)) {
      const points = data
        .map((item, idx) => this.normalizeChartPoint(item, idx))
        .filter((p): p is { label: string; value: number } => p !== null);

      if (!points.length) return null;

      return {
        labels: points.map((p) => p.label),
        datasets: [{ label: 'Valeur', data: points.map((p) => p.value) }],
      };
    }

    return null;
  }

  private normalizeSupplierRanking(data: unknown): SupplierRankingPayload | null {
    const records = this.extractSupplierRankingRecords(data);
    if (!records.length) return null;

    const items = records
      .map((r, i) => this.normalizeSupplierRankingItem(r, i))
      .filter((item): item is SupplierRankingItem => item !== null)
      .sort((a, b) => b.kg - a.kg);

    if (!items.length) return null;

    return {
      items,
      bestSupplierName: items[0]?.name ?? null,
      weakSupplierNames: items.filter((i) => i.acidityOutOfRange || i.rendementOutOfRange).map((i) => i.name),
    };
  }

  private normalizeSupplierRankingFromChartPayload(data: unknown, intent: string | null | undefined): SupplierRankingPayload | null {
    if (!data || typeof data !== 'object') return null;
    if (!('labels' in data) || !('datasets' in data)) return null;

    const payload = data as { labels?: unknown[]; datasets?: Array<{ label?: string; data?: unknown[] }> };
    const labels = Array.isArray(payload.labels) ? payload.labels.map((l, i) => String(l ?? `Fournisseur ${i + 1}`)) : [];
    const datasets = Array.isArray(payload.datasets) ? payload.datasets : [];
    if (!labels.length || !datasets.length) return null;

    const normalizedIntent = this.normalizeSearchText(intent ?? '');
    const findDataset = (keys: string[]): number[] | null => {
      const dataset = datasets.find((ds) => {
        const label = this.normalizeSearchText(String(ds?.label ?? ''));
        return keys.some((key) => label.includes(key));
      });
      if (!dataset || !Array.isArray(dataset.data)) return null;
      return dataset.data.map((v) => this.normalizeNumber(v));
    };

    const kgValues = findDataset(['kg', 'quantite', 'quantite livree', 'quantite totale']);
    const rendementValues = findDataset(['rendement', 'yield']);
    const acidityValues = findDataset(['acidite', 'acidity']);
    const lotValues = findDataset(['lot', 'lots', 'nb lots']);

    const looksLikeSupplierPayload = !!kgValues || (!!rendementValues && !!acidityValues);
    const isSupplierIntent = normalizedIntent.includes('fournisseur');
    if (!looksLikeSupplierPayload && !isSupplierIntent) return null;

    const items = labels.map((name, index) => {
      const kg = kgValues?.[index] ?? 0;
      const acidity = acidityValues?.[index] ?? 0;
      const rendement = rendementValues?.[index] ?? 0;
      const lots = Math.max(0, Math.round(lotValues?.[index] ?? 0));

      return {
        name,
        kg,
        acidity,
        rendement,
        lots,
        acidityOutOfRange: acidity < SUPPLIER_ACIDITY_RANGE.min || acidity > SUPPLIER_ACIDITY_RANGE.max,
        rendementOutOfRange: rendement < SUPPLIER_RENDEMENT_RANGE.min || rendement > SUPPLIER_RENDEMENT_RANGE.max,
      } as SupplierRankingItem;
    }).sort((a, b) => b.kg - a.kg);

    if (!items.length) return null;

    return {
      items,
      bestSupplierName: items[0]?.name ?? null,
      weakSupplierNames: items.filter((i) => i.acidityOutOfRange || i.rendementOutOfRange).map((i) => i.name),
    };
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private extractSupplierRankingRecords(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;

    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      for (const key of ['suppliers', 'ranking', 'items', 'records', 'data']) {
        const candidate = record[key];
        if (Array.isArray(candidate)) return candidate;
      }
    }

    return [];
  }

  private normalizeSupplierRankingItem(item: unknown, index: number): SupplierRankingItem | null {
    if (!item || typeof item !== 'object') return null;

    const r = item as Record<string, unknown>;
    const name = String(
      r['name'] ?? r['supplierName'] ?? r['fournisseur_nom'] ?? r['supplier'] ?? r['label'] ?? `Fournisseur ${index + 1}`
    ).trim();

    const kg = this.normalizeNumber(
      r['kg']
      ?? r['quantity']
      ?? r['quantite']
      ?? r['quantiteTotale']
      ?? r['quantiteTotaleKg']
      ?? r['totalKg']
      ?? r['total_kg']
      ?? r['quantite_totale_kg']
      ?? r['value']
    );
    const acidity = this.normalizeNumber(
      r['acidity']
      ?? r['acidite']
      ?? r['acidite_moyenne']
      ?? r['aciditeMoyenne']
      ?? r['averageAcidity']
      ?? r['acidity_percent']
    );
    const rendement = this.normalizeNumber(
      r['rendement']
      ?? r['yield']
      ?? r['rendement_moyen']
      ?? r['rendementMoyen']
      ?? r['averageYield']
      ?? r['avgRendement']
      ?? r['rendement_percent']
    );
    const lots = Math.max(
      0,
      Math.round(this.normalizeNumber(r['lots'] ?? r['lotCount'] ?? r['nb_lots'] ?? r['nbLots'] ?? r['count']))
    );

    if (!name) return null;

    return {
      name,
      kg,
      acidity,
      rendement,
      lots,
      acidityOutOfRange: acidity < SUPPLIER_ACIDITY_RANGE.min || acidity > SUPPLIER_ACIDITY_RANGE.max,
      rendementOutOfRange: rendement < SUPPLIER_RENDEMENT_RANGE.min || rendement > SUPPLIER_RENDEMENT_RANGE.max,
    };
  }

  private buildSupplierRankingChartPayload(items: SupplierRankingItem[]): ChatbotChartPayload {
    return {
      labels: items.map((i) => i.name),
      datasets: [
        { label: 'Quantité totale (kg)', data: items.map((i) => i.kg) },
        { label: 'Acidité moyenne (%)', data: items.map((i) => this.normalizeToVisualPercent(i.acidity, SUPPLIER_ACIDITY_RANGE.min, SUPPLIER_ACIDITY_RANGE.max)) },
        { label: 'Rendement moyen (%)', data: items.map((i) => this.normalizeToVisualPercent(i.rendement, SUPPLIER_RENDEMENT_RANGE.min, SUPPLIER_RENDEMENT_RANGE.max)) },
      ],
    };
  }

  private normalizeToVisualPercent(value: number, min: number, max: number): number {
    if (max <= min) return 0;
    const clamped = Math.max(min, Math.min(value, max));
    return ((clamped - min) / (max - min)) * 100;
  }

  private normalizeChartPoint(item: unknown, index: number): { label: string; value: number } | null {
    if (typeof item === 'number') return { label: `Série ${index + 1}`, value: item };

    if (typeof item === 'string') {
      const parsed = Number(item);
      return Number.isFinite(parsed)
        ? { label: `Série ${index + 1}`, value: parsed }
        : { label: item, value: index + 1 };
    }

    if (!item || typeof item !== 'object') return null;

    const r = item as Record<string, unknown>;
    const label = r['label'] ?? r['name'] ?? r['title'] ?? r['key'] ?? `Série ${index + 1}`;
    const value = this.normalizeNumber(r['value'] ?? r['count'] ?? r['total'] ?? r['amount'] ?? r['y'] ?? r['val']);
    if (!Number.isFinite(value)) return null;

    return { label: String(label), value };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private — chart rendering
  // ─────────────────────────────────────────────────────────────────────────────

  private renderCharts(): void {
    const chartMessages = this.messages.filter(
      (m) => this.isChartMessage(m) && m.rankingViewMode === 'chart'
    );
    const canvases = this.chartCanvasRefs ? this.chartCanvasRefs.toArray().map((r) => r.nativeElement) : [];

    this.destroyAllCharts();

    chartMessages.forEach((message) => {
      const canvas = canvases.find((c) => c.dataset['messageId'] === String(message.id));
      if (!canvas) return;
      // Ensure the canvas and its message container occupy the full available
      // horizontal space before Chart.js measures it. We apply inline styles
      // to override any CSS that keeps the bubble narrow.
      try {
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        // give ranking charts more vertical space
        if (message.rankingData) {
          canvas.style.height = '420px';
        } else {
          canvas.style.height = '320px';
        }

        // Force the article (message bubble) to stretch if present.
        const article = canvas.closest('article.chatbot-widget__message') as HTMLElement | null;
        if (article) {
          article.style.width = '100%';
          article.style.maxWidth = 'none';
          article.style.alignSelf = 'stretch';
          article.style.display = 'block';
          // ensure the chart container inside the article uses full width
          const chartContainer = article.querySelector('.chatbot-widget__chart') as HTMLElement | null;
          if (chartContainer) {
            chartContainer.style.width = '100%';
            chartContainer.style.maxWidth = '100%';
          }
        }
      } catch (e) {
        // ignore style exceptions
      }
      const chart = new Chart(canvas, this.buildChartConfiguration(message));
      this.chartInstances.set(message.id, chart);

      // Debug: log canvas / parent / panel sizes to help diagnose why the
      // chart may remain visually small even when the panel is enlarged.
      // These logs are safe to leave; they aid remote debugging in the browser
      // console when you reproduce the issue.
      try {
        const parent = canvas.parentElement as HTMLElement | null;
        const panel = this.chatWindowRef?.nativeElement;
        const canvasRect = canvas.getBoundingClientRect();
        const parentRect = parent ? parent.getBoundingClientRect() : null;
        const panelRect = panel ? panel.getBoundingClientRect() : null;
        // Chart properties
        const chartInfo = {
          messageId: message.id,
          canvasClient: { w: Math.round(canvasRect.width), h: Math.round(canvasRect.height) },
          parentClient: parentRect ? { w: Math.round(parentRect.width), h: Math.round(parentRect.height) } : null,
          panelClient: panelRect ? { w: Math.round(panelRect.width), h: Math.round(panelRect.height) } : null,
          computedCanvasStyle: window.getComputedStyle(canvas).cssText || window.getComputedStyle(canvas).toString?.(),
          chartSize: { width: (chart as any).width ?? null, height: (chart as any).height ?? null },
        };
        // eslint-disable-next-line no-console
        console.groupCollapsed('[Chatbot Widget] Chart sizing', message.id);
        // eslint-disable-next-line no-console
        console.log('[Chatbot Widget] sizing info:', chartInfo);
        // eslint-disable-next-line no-console
        console.log('[Chatbot Widget] chart instance:', chart);
        // eslint-disable-next-line no-console
        console.groupEnd();
      } catch (e) {
        // ignore
      }

      // Force multiple resize/update passes after creation so Chart.js measures
      // correctly even if the layout changes slowly (animations, fonts, etc.).
      [60, 250, 700].forEach((delay) =>
        setTimeout(() => {
          try {
            chart.resize();
            chart.update();
          } catch (err) {
            // ignore if chart gone
          }
        }, delay)
      );
    });
  }

  private resizeCharts(): void {
    this.chartInstances.forEach((chart) => {
      try {
        chart.resize();
        chart.update();
      } catch (err) {
        // ignore errors for charts that may have been destroyed concurrently
      }
    });
  }

  private buildChartConfiguration(message: ChatMessage): ChartConfiguration {
    const chartType: ChartType = message.chartType ?? 'bar';

    // Handle unified ranking data
    if (message.rankingData && message.rankingIntent) {
      return this.buildUnifiedRankingChartConfiguration(message);
    }

    const payload = message.chartData;
    if (!payload) {
      return { type: chartType, data: { labels: [], datasets: [] }, options: this.getChartOptions(chartType) };
    }

    const labels = payload.labels;

    if (chartType === 'pie') {
      const first = payload.datasets[0] ?? { label: message.content, data: [] };
      return {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            label: first.label,
            data: first.data,
            backgroundColor: this.buildColorSeries(labels.length),
            borderColor: this.buildColorSeries(labels.length),
            borderWidth: 1,
          }],
        },
        options: this.getChartOptions('pie'),
      };
    }

    const datasetMaxes = payload.datasets.map((ds) =>
      ds.data?.length ? Math.max(...ds.data.map((v) => Number(v) || 0)) : 0
    );
    const overallMax = Math.max(...datasetMaxes, 0);

    const datasets: ChartDataset<'bar' | 'line', number[]>[] = payload.datasets.map((ds, i) => {
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const maxVal = datasetMaxes[i] ?? 0;
      const yAxisID = overallMax > 0 && maxVal < overallMax / 10 ? 'y1' : 'y';
      const dsType = (ds as { type?: string }).type;
      const isBarDataset = (chartType === 'bar' && !dsType) || dsType === 'bar';
      return {
        label: ds.label,
        data: ds.data,
        type: dsType as any,
        borderColor: color,
        backgroundColor: dsType === 'line' || (chartType === 'line' && !dsType) ? color : this.withAlpha(color, 0.28),
        borderWidth: 2,
        fill: false,
        tension: dsType === 'line' || (chartType === 'line' && !dsType) ? 0.35 : 0,
        yAxisID,
        maxBarThickness: isBarDataset ? 42 : undefined,
      } as ChartDataset<'bar' | 'line', number[]>;
    });

    return { type: chartType, data: { labels, datasets }, options: this.getChartOptions(chartType) };
  }

  private buildUnifiedRankingChartConfiguration(message: ChatMessage): ChartConfiguration {
    const { rankingData, rankingIntent, rankingMetric } = message;
    const payload = message.chartData;

    if (!payload) {
      return { type: 'bar', data: { labels: [], datasets: [] }, options: this.getChartOptions('bar') };
    }

    const labels = payload.labels;
    const datasetMaxes = payload.datasets.map((ds) =>
      ds.data?.length ? Math.max(...ds.data.map((v) => Number(v) || 0)) : 0
    );
    const overallMax = Math.max(...datasetMaxes, 0);
    const hasSingleDataset = payload.datasets.length === 1;

    const datasets: ChartDataset<'bar' | 'line', number[]>[] = payload.datasets.map((ds, i) => {
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const maxVal = datasetMaxes[i] ?? 0;
      // Only use y1 axis if we have multiple datasets
      const yAxisID = !hasSingleDataset && overallMax > 0 && maxVal < overallMax / 10 ? 'y1' : 'y';
      const dsType = (ds as { type?: string }).type || 'bar';
      const isBar = dsType === 'bar';

      return {
        label: ds.label,
        data: ds.data,
        type: dsType as any,
        borderColor: color,
        backgroundColor: isBar ? this.withAlpha(color, 0.6) : color,
        borderWidth: isBar ? 1 : 2,
        fill: false,
        tension: !isBar ? 0.35 : 0,
        yAxisID,
        maxBarThickness: isBar ? 42 : undefined,
      } as ChartDataset<'bar' | 'line', number[]>;
    });

    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              title: (ctx: TooltipItem<any>[]) => ctx[0]?.label ?? 'Item',
              afterBody: () => this.getTooltipContext(rankingData, rankingIntent),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            type: 'linear',
          },
          ...(hasSingleDataset ? {} : {
            y1: {
              type: 'linear',
              position: 'right',
              beginAtZero: true,
            },
          }),
        },
      } as any,
    };
  }

  private getTooltipContext(rankingData: RankingPayload, intent: RankingIntent | null): string[] {
    if (!rankingData || !('items' in rankingData) || !rankingData.items) return [];

    const items = rankingData.items as any[];
    if (!items.length) return [];

    if (intent === 'fournisseur') {
      const item = items[0];
      return [
        `Lots: ${item.lots}`,
        `Acidité: ${item.acidity.toLocaleString('fr-FR')}%`,
        `Rendement: ${item.rendement.toLocaleString('fr-FR')}%`,
      ];
    }

    if (intent === 'machines_utilisees') {
      const item = items[0];
      return [
        `Exécutions: ${item.nbExecutions}`,
        `Rendement: ${item.rendementMoyen.toLocaleString('fr-FR')}%`,
        `Production: ${item.totalProduit.toLocaleString('fr-FR')} L`,
      ];
    }

    if (intent === 'lot_liste') {
      const item = items[0];
      return [
        `Variété: ${item.variete}`,
        `Fournisseur: ${item.fournisseur_nom}`,
        `Qualité: ${item.qualite_huile}`,
      ];
    }

    if (intent === 'analyse_labo') {
      const item = items[0];
      return [
        `Date: ${item.date_analyse}`,
        `Peroxyde: ${item.indice_peroxyde_meq_o2_kg.toLocaleString('fr-FR')}`,
        `K270: ${item.k270.toLocaleString('fr-FR')}`,
      ];
    }

    return [];
  }

  private getChartOptions(chartType: ChartType, compactSecondaryAxis = false): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
              const value = Number(ctx.raw);
              return `${label}${Number.isFinite(value) ? value.toLocaleString('fr-FR') : ctx.raw}`;
            },
          },
        },
      },
      scales: chartType === 'pie'
        ? undefined
        : {
            x: { ticks: { color: '#6f7d90' }, grid: { color: 'rgba(127,142,163,0.18)' } },
            y: {
              beginAtZero: true,
              ticks: { color: '#6f7d90', callback: (v) => Number(v).toLocaleString('fr-FR') },
              grid: { color: 'rgba(127,142,163,0.18)' },
            },
            y1: {
              position: 'right',
              beginAtZero: true,
              min: compactSecondaryAxis ? 0 : undefined,
              max: compactSecondaryAxis ? 100 : undefined,
              grid: { drawOnChartArea: false, color: 'rgba(127,142,163,0.08)' },
              ticks: {
                color: '#6f7d90',
                callback: (v) => compactSecondaryAxis ? `${Number(v).toLocaleString('fr-FR')}%` : Number(v).toLocaleString('fr-FR'),
              },
            },
          },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private — utilities
  // ─────────────────────────────────────────────────────────────────────────────

  private hasChartData(message: ChatMessage): boolean {
    return !!message.chartData?.datasets.length;
  }

  private buildColorSeries(count: number): string[] {
    return Array.from({ length: count }, (_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  }

  private withAlpha(hexColor: string, alpha: number): string {
    const normalized = hexColor.replace('#', '');
    const full = normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private normalizeNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return 0;

      // Accept common API formats such as "1 522 kg", "0,12 %", "1.522,4".
      const cleaned = trimmed
        .replace(/\s+/g, '')
        .replace(/%|kg/gi, '')
        .replace(',', '.');

      const numericToken = cleaned.match(/-?\d+(?:\.\d+)?/);
      const n = numericToken ? Number(numericToken[0]) : Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }

    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private destroyAllCharts(): void {
    this.chartInstances.forEach((chart) => chart.destroy());
    this.chartInstances.clear();
  }

  private resetTextareaHeight(): void {
    const textarea = this.chatInputAreaRef?.nativeElement;
    if (!textarea) return;
    textarea.style.height = '44px';
  }
}
