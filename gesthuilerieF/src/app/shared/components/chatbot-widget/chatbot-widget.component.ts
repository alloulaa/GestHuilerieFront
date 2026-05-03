import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Chart, ChartConfiguration, ChartDataset, ChartType, registerables, TooltipItem } from 'chart.js';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ChatbotChartPayload, ChatbotChartType, ChatbotResponse, ChatbotResponseType, ChatbotService, RankingIntent, FournisseurItem, MachineItem, LotItem, AnalysisItem } from '../../../core/services/chatbot.service';

Chart.register(...registerables);

const CHART_COLORS = ['#6f8d3a', '#9bb85a', '#d8c65a', '#7e9fcb', '#f3a15f', '#c96c6c'];
const RANKING_INTENTS: RankingIntent[] = ['fournisseur', 'machines_utilisees', 'lot_liste', 'analyse_labo'];

const SUPPLIER_ACIDITY_RANGE = { min: 0.2, max: 1.5 };
const SUPPLIER_RENDEMENT_RANGE = { min: 10, max: 30 };
const ANALYSIS_ACIDITY_RANGE = { min: 0.2, max: 0.8 };
const ANALYSIS_PEROXIDE_RANGE = { min: 5, max: 20 };
const ANALYSIS_K270_RANGE = { min: 0.2, max: 0.3 };

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

interface AnalysisRankingPayload {
  items: AnalysisRankingItem[];
}

type RankingPayload = SupplierRankingPayload | MachineRankingPayload | LotRankingPayload | AnalysisRankingPayload | null;
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
    
    // Map French option labels to selection values
    const selection = option.toLowerCase() === 'graphique' ? 'graphique' : 'texte';
    
    // Find the last CHOICE message with pending ranking data (skip non-choice messages)
    const choiceMessage = [...this.messages].reverse().find(m => {
      const hasData = (m as any)._pendingRankingData;
      const hasIntent = (m as any)._pendingRankingIntent;
      return m.sender === 'bot' && m.type === 'choice' && hasData && hasIntent;
    });
    
    const pendingRankingData = choiceMessage ? (choiceMessage as any)._pendingRankingData : null;
    const pendingRankingIntent = choiceMessage ? (choiceMessage as any)._pendingRankingIntent : null;

    console.log('[sendChoice] selection:', selection, 'choice message found:', !!choiceMessage, 'pendingData exists:', !!pendingRankingData, 'pendingIntent:', pendingRankingIntent);

    // If we have pending ranking data, don't call backend - create response directly
    if (pendingRankingData && pendingRankingIntent) {
      const userMessage: ChatMessage = {
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
      };
      this.messages.push(userMessage);

      // Build chart data if displaying chart mode
      let chartData: ChatbotChartPayload | null = null;
      if (selection === 'graphique') {
        chartData = this.buildRankingChartPayload(pendingRankingData, pendingRankingIntent);
      }

      // Create a bot response message with the ranking data
      const botResponse: ChatMessage = {
        id: this.nextMessageId(),
        sender: 'bot',
        content: `Voici les résultats en mode ${selection === 'graphique' ? 'graphique' : 'texte'}...`,
        timestamp: new Date(),
        type: selection === 'graphique' ? 'chart' : 'text',  // ← Match type to selection
        options: [],
        chartType: selection === 'graphique' ? 'bar' : null,
        chartData: chartData,
        rankingData: pendingRankingData,
        rankingIntent: pendingRankingIntent,
        rankingViewMode: selection === 'graphique' ? 'chart' : 'text',
        rankingMetric: undefined,
        debug: null,
      };
      this.messages.push(botResponse);
      this.scrollToBottom();
      setTimeout(() => this.renderCharts());
      return;
    }

    // Otherwise, send to backend normally
    this.sendMessage(option, selection as 'texte' | 'graphique');
  }

  sendMessage(messageOverride?: string, selection?: 'texte' | 'graphique'): void {
    const message = (messageOverride ?? this.draftMessage).trim();
    if (!message || this.isLoading) return;

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

    console.log('[Chatbot Widget] Sending message:', message, 'selection:', selection);

    this.chatbotService
      .sendMessage(message, selection)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.scrollToBottom();
        })
      )
      .subscribe((response: ChatbotResponse) => {
        console.log('[Chatbot Widget] Response received:', response);
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

        if (!this.isOpen) {
          this.hasUnreadPulse = true;
        }

        setTimeout(() => {
          this.renderCharts();
          this.scrollToBottom();
        });
      });
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

  getRankingMetric(message: ChatMessage): string {
    return message.rankingMetric ?? 'kg';
  }

  setRankingMetric(message: ChatMessage, metric: string): void {
    message.rankingMetric = metric;
    // Rebuild chart data with new metric for ranking types that support it
    if (message.rankingData && message.rankingIntent && ['fournisseur', 'machines_utilisees', 'lot_liste', 'analyse_labo'].includes(message.rankingIntent)) {
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
    
    // Smart detection: if intent is "unknown"/"inconnu" AND we have data, try to detect from content
    if ((!intent || String(intent).toLowerCase() === 'inconnu' || String(intent).toLowerCase() === 'unknown') 
        && response.data) {
      const textContent = (response.message || response.response || '').toLowerCase();
      
      // Detect ranking type from text patterns
      if (textContent.includes('lot') && (textContent.includes('**lo') || textContent.includes('référence'))) {
        intent = 'lot_liste';
      } else if (textContent.includes('fournisseur') || textContent.includes('supplier')) {
        intent = 'fournisseur';
      } else if (textContent.includes('machine') || textContent.includes('execution')) {
        intent = 'machines_utilisees';
      } else if (textContent.includes('analyse') || textContent.includes('acidité') || textContent.includes('peroxyde')) {
        intent = 'analyse_labo';
      }
    } else if ((!intent || String(intent).toLowerCase() === 'inconnu') && !response.data) {
      // If backend sent "unknown" intent AND no data, this is probably a duplicate empty response - skip it
      console.log('[Chatbot Widget] Skipping empty response with no data');
      return null;
    }
    
    const isRankingIntent = RANKING_INTENTS.includes(intent as RankingIntent);
    
    let rankingData: RankingPayload = null;
    let chartData: ChatbotChartPayload | null = null;

    // Try to normalize ranking data based on intent
    if (isRankingIntent && response.type !== 'choice') {
      rankingData = this.normalizeRankingData(response.data, intent as RankingIntent);
      if (rankingData) {
        chartData = this.buildRankingChartPayload(rankingData, intent as RankingIntent);
      }
    }

    // Fallback to generic chart data if no ranking data
    if (!chartData) {
      chartData = response.type === 'chart' ? this.normalizeChartData(response.data) : null;
    }

    // Smart flow: If backend sends ranking data with type='text'/'chart' directly,
    // convert to choice message first (ignore the actual type)
    let messageType = response.type ?? 'text';
    let rankedItemsToDisplay: RankingPayload | null = null;
    
    // Only create a choice message if we have actual ranking data
    if (isRankingIntent && rankingData && messageType !== 'choice') {
      // Store ranking data to display after choice
      rankedItemsToDisplay = rankingData;
      // Convert to choice message
      messageType = 'choice';
    } else if (messageType === 'choice' && !rankingData && isRankingIntent) {
      // If backend sent "choice" but no ranking data, change to text
      // (this is probably a duplicate response without the actual data)
      messageType = 'text';
    }

    const shouldAttachRanking = messageType !== 'choice' && (isRankingIntent && !!rankingData);
    const viewMode: RankingViewMode = response.selected_option === 'texte' ? 'text' : 'chart';

    console.log('[Chatbot Widget] createBotMessage - intent:', intent, 'isRanking:', isRankingIntent, 'rankingData:', rankingData, 'messageType:', messageType);

    const botMessage: ChatMessage = {
      id: this.nextMessageId(),
      sender: 'bot',
      content: response.message || response.response || 'Réponse reçue.',
      timestamp: new Date(),
      type: messageType,
      options: messageType === 'choice' ? ['texte', 'graphique'] : [],
      chartType: messageType === 'chart' ? response.chart_type : null,
      chartData: messageType === 'chart' ? chartData : null,
      rankingData: shouldAttachRanking ? rankingData : null,
      rankingIntent: shouldAttachRanking ? (intent as RankingIntent) : null,
      rankingViewMode: viewMode,
      rankingMetric: 'kg',
      debug:
        response.intent || response.confidence !== null || response.applied_scope
          ? {
              intent: response.intent,
              confidence: response.confidence,
              appliedScope: response.applied_scope,
            }
          : null,
    };

    // If we're showing a choice message but have ranking data, store it for later display
    if (messageType === 'choice' && rankedItemsToDisplay) {
      (botMessage as any)._pendingRankingData = rankedItemsToDisplay;
      (botMessage as any)._pendingRankingIntent = intent as RankingIntent;
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
      default:
        return null;
    }
  }

  private normalizeFournisseurData(data: unknown): SupplierRankingPayload | null {
    const suppliers = this.extractArrayData(data, ['suppliers', 'fournisseurs', 'items', 'data']);
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
    const machines = this.extractArrayData(data, ['machines', 'machinesUtilisees', 'items', 'data']);
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
    const lots = this.extractArrayData(data, ['lots', 'items', 'data']);
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
    const analyses = this.extractArrayData(data, ['analyses', 'items', 'data']);
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
