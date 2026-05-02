import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Chart, ChartConfiguration, ChartDataset, ChartType, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ChatbotChartPayload, ChatbotChartType, ChatbotResponse, ChatbotResponseType, ChatbotService } from '../../../core/services/chatbot.service';

Chart.register(...registerables);

const CHART_COLORS = ['#6f8d3a', '#9bb85a', '#d8c65a', '#7e9fcb', '#f3a15f', '#c96c6c'];

const SUPPLIER_ACIDITY_RANGE = { min: 0.2, max: 1.5 };
const SUPPLIER_RENDEMENT_RANGE = { min: 10, max: 30 };

interface ChatDebugInfo {
  intent: string | null;
  confidence: number | null;
  appliedScope: string | null;
}

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

type SupplierViewMode = 'chart' | 'text';

interface ChatMessage {
  id: number;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  type: ChatbotResponseType;
  options: string[];
  chartType: ChatbotChartType | null;
  chartData: ChatbotChartPayload | null;
  supplierRanking: SupplierRankingPayload | null;
  supplierViewMode: SupplierViewMode;
  supplierChartMetric: 'kg' | 'rendement' | 'acidite';
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
      supplierRanking: null,
      supplierViewMode: 'chart',
      supplierChartMetric: 'kg',
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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Lifecycle
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Markdown renderer
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Widget open / close / fullscreen
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Messaging
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  sendSuggestion(suggestion: string): void {
    if (this.isLoading) return;
    this.draftMessage = suggestion;
    this.sendMessage();
  }

  sendChoice(option: string): void {
    if (this.isLoading) return;
    this.sendMessage(option);
  }

  sendMessage(messageOverride?: string): void {
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
      supplierRanking: null,
      supplierViewMode: 'chart',
      supplierChartMetric: 'kg',
      debug: null,
    });
    this.hasSentUserMessage = true;
    this.draftMessage = '';
    this.resetTextareaHeight();
    this.isLoading = true;
    this.scrollToBottom();

    console.log('[Chatbot Widget] Sending message:', message);

    this.chatbotService
      .sendMessage(message)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.scrollToBottom();
        })
      )
      .subscribe((response: ChatbotResponse) => {
        console.log('[Chatbot Widget] Response received:', response);
        this.messages.push(this.createBotMessage(response));

        if (!this.isOpen) {
          this.hasUnreadPulse = true;
        }

        setTimeout(() => {
          this.renderCharts();
          this.scrollToBottom();
        });
      });
  }

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Template helpers
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  trackByMessageId(_: number, message: ChatMessage): number {
    return message.id;
  }

  isChartMessage(message: ChatMessage): boolean {
    return message.sender === 'bot' && message.type === 'chart' && (this.hasChartData(message) || !!message.supplierRanking);
  }

  isSupplierRankingMessage(message: ChatMessage): boolean {
    return message.sender === 'bot' && message.type === 'chart' && !!message.supplierRanking;
  }

  isChoiceMessage(message: ChatMessage): boolean {
    return message.sender === 'bot' && message.type === 'choice' && message.options.length > 0;
  }

  onTextareaInput(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${nextHeight}px`;
  }

  toggleSupplierView(message: ChatMessage, viewMode: SupplierViewMode): void {
    message.supplierViewMode = viewMode;

    if (viewMode === 'chart') {
      setTimeout(() => this.renderCharts());
      return;
    }
    this.destroyAllCharts();
  }

  getSupplierMetric(message: ChatMessage): 'kg' | 'rendement' | 'acidite' {
    return message.supplierChartMetric;
  }

  setSupplierMetric(message: ChatMessage, metric: 'kg' | 'rendement' | 'acidite'): void {
    message.supplierChartMetric = metric;
    setTimeout(() => this.renderCharts());
  }

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Drag
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Computed getters
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Private ÔÇö drag helpers
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Private ÔÇö scroll / open
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Private ÔÇö message creation
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  private createBotMessage(response: ChatbotResponse): ChatMessage {
    const supplierRanking =
      this.normalizeSupplierRanking(response.data)
      ?? this.normalizeSupplierRankingFromChartPayload(response.data, response.intent);

    // Debug logs to inspect incoming data when a supplier ranking is returned
    // eslint-disable-next-line no-console
    console.log('[Chatbot Widget] debug response.data for supplier:', response.data);
    // eslint-disable-next-line no-console
    console.log('[Chatbot Widget] debug supplierRanking derived:', supplierRanking);
    const chartData = supplierRanking
      ? this.buildSupplierRankingChartPayload(supplierRanking.items)
      : this.normalizeChartData(response.data);
    const messageType = response.type ?? 'text';

    return {
      id: this.nextMessageId(),
      sender: 'bot',
      content: response.message || response.response || 'R├®ponse re├ºue.',
      timestamp: new Date(),
      type: messageType,
      options: messageType === 'choice' ? this.normalizeOptions(response.options) : [],
      chartType: messageType === 'chart' ? response.chart_type : null,
      chartData: messageType === 'chart' ? chartData : null,
      supplierRanking: messageType === 'chart' ? supplierRanking : null,
      supplierViewMode: 'chart',
      supplierChartMetric: 'kg',
      debug:
        response.intent || response.confidence !== null || response.applied_scope
          ? {
              intent: response.intent,
              confidence: response.confidence,
              appliedScope: response.applied_scope,
            }
          : null,
    };
  }

  private normalizeOptions(options: string[]): string[] {
    const fallback = ['texte', 'graphique'];
    const normalized = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
      .map((o) => o.toLowerCase());
    return normalized.length >= 2 ? normalized : fallback;
  }

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Private ÔÇö chart data normalization
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  private normalizeChartData(data: unknown): ChatbotChartPayload | null {
    if (!data) return null;

    if (typeof data === 'object' && data !== null && 'labels' in data && 'datasets' in data) {
      const payload = data as ChatbotChartPayload;
      return {
        labels: payload.labels.map((l: string) => String(l)),
        datasets: payload.datasets.map((ds: { label?: string; data?: unknown[] }, i: number) => ({
          label: String(ds?.label ?? `S├®rie ${i + 1}`),
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
        { label: 'Quantit├® totale (kg)', data: items.map((i) => i.kg) },
        { label: 'Acidit├® moyenne (%)', data: items.map((i) => this.normalizeToVisualPercent(i.acidity, SUPPLIER_ACIDITY_RANGE.min, SUPPLIER_ACIDITY_RANGE.max)) },
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
    if (typeof item === 'number') return { label: `S├®rie ${index + 1}`, value: item };

    if (typeof item === 'string') {
      const parsed = Number(item);
      return Number.isFinite(parsed)
        ? { label: `S├®rie ${index + 1}`, value: parsed }
        : { label: item, value: index + 1 };
    }

    if (!item || typeof item !== 'object') return null;

    const r = item as Record<string, unknown>;
    const label = r['label'] ?? r['name'] ?? r['title'] ?? r['key'] ?? `S├®rie ${index + 1}`;
    const value = this.normalizeNumber(r['value'] ?? r['count'] ?? r['total'] ?? r['amount'] ?? r['y'] ?? r['val']);
    if (!Number.isFinite(value)) return null;

    return { label: String(label), value };
  }

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Private ÔÇö chart rendering
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  private renderCharts(): void {
    const chartMessages = this.messages.filter(
      (m) => this.isChartMessage(m) && m.supplierViewMode === 'chart'
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
        // give supplier-ranking charts more vertical space
        if (message.supplierRanking) {
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

    if (message.supplierRanking) {
      return this.buildSupplierRankingChartConfiguration(message);
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
      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: chartType === 'line' ? color : this.withAlpha(color, 0.28),
        borderWidth: 2,
        fill: false,
        tension: chartType === 'line' ? 0.35 : 0,
        yAxisID,
      } as ChartDataset<'bar' | 'line', number[]>;
    });

    return { type: chartType, data: { labels, datasets }, options: this.getChartOptions(chartType) };
  }

  private buildSupplierRankingChartConfiguration(message: ChatMessage): ChartConfiguration {
    const sr = message.supplierRanking;
    const items = sr?.items ?? [];
    const labels = items.map((i) => i.name);
    const metric = message.supplierChartMetric;

    let dataset: ChartDataset<'bar', number[]>;
    let yAxisLabel: string;
    let yAxisFormat: (v: number) => string;

    if (metric === 'kg') {
      dataset = {
        label: 'Quantit├® livr├®e (kg)',
        data: items.map((i) => i.kg),
        backgroundColor: 'rgba(111,141,58,0.6)',
        borderColor: '#6f8d3a',
        borderWidth: 1,
        yAxisID: 'y',
      };
      yAxisLabel = 'Quantit├® (kg)';
      yAxisFormat = (v) => Number(v).toLocaleString('fr-FR');
    } else if (metric === 'rendement') {
      dataset = {
        label: 'Rendement (%)',
        data: items.map((i) => i.rendement),
        backgroundColor: 'rgba(126,159,203,0.6)',
        borderColor: '#7e9fcb',
        borderWidth: 1,
        yAxisID: 'y',
      };
      yAxisLabel = 'Rendement (%)';
      yAxisFormat = (v) => `${Number(v).toLocaleString('fr-FR')}%`;
    } else {
      // acidite
      dataset = {
        label: 'Acidit├® (%)',
        data: items.map((i) => i.acidity),
        backgroundColor: 'rgba(216,198,90,0.6)',
        borderColor: '#d8c65a',
        borderWidth: 1,
        yAxisID: 'y',
      };
      yAxisLabel = 'Acidit├® (%)';
      yAxisFormat = (v) => `${Number(v).toLocaleString('fr-FR')}%`;
    }

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [dataset],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              title: (ctx) => ctx[0]?.label ? `Fournisseur: ${ctx[0].label}` : 'Fournisseur',
              label: (ctx) => {
                const item = items[ctx.dataIndex];
                if (!item) return '';
                if (metric === 'kg') return `Quantit├®: ${item.kg.toLocaleString('fr-FR')} kg`;
                if (metric === 'rendement') return `Rendement: ${item.rendement.toLocaleString('fr-FR')}%`;
                if (metric === 'acidite') return `Acidit├®: ${item.acidity.toLocaleString('fr-FR')}%`;
                return `${ctx.dataset.label}: ${String(ctx.raw)}`;
              },
              afterBody: (ctx) => {
                const item = items[ctx[0]?.dataIndex ?? 0];
                if (!item) return [];
                const result: string[] = [`Lots: ${item.lots}`];
                if (metric === 'kg' && item.name === sr?.bestSupplierName) {
                  result.push('Ô¡É Meilleur fournisseur');
                }
                if (item.acidityOutOfRange && metric === 'acidite') {
                  result.push(`Hors plage (${SUPPLIER_ACIDITY_RANGE.min}%ÔÇô${SUPPLIER_ACIDITY_RANGE.max}%)`);
                }
                if (item.rendementOutOfRange && metric === 'rendement') {
                  result.push(`Hors plage (${SUPPLIER_RENDEMENT_RANGE.min}%ÔÇô${SUPPLIER_RENDEMENT_RANGE.max}%)`);
                }
                return result;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: '#6f7d90' }, grid: { color: 'rgba(127,142,163,0.12)' } },
          y: {
            beginAtZero: true,
            ticks: { color: '#6f7d90', callback: (tickValue: string | number) => yAxisFormat(Number(tickValue)) },
            title: { display: true, text: yAxisLabel },
            grid: { color: 'rgba(127,142,163,0.18)' },
          },
          // Ensure right axis is completely removed/hidden for supplier charts
          y1: { display: false },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    };
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

  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Private ÔÇö utilities
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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
