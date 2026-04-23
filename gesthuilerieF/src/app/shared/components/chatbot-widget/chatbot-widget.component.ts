import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ChatbotService, ChatbotResponse } from '../../../core/services/chatbot.service';

interface ChatMessage {
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ChatbotWidgetComponent {
  @ViewChild('chatWindow') chatWindowRef?: ElementRef<HTMLElement>;
  @ViewChild('messagesContainer') messagesContainerRef?: ElementRef<HTMLElement>;
  @ViewChild('chatInputArea') chatInputAreaRef?: ElementRef<HTMLTextAreaElement>;

  isOpen = false;
  isClosing = false;
  isFullScreen = false;
  hasUnreadPulse = false;
  isLoading = false;
  draftMessage = '';
  hasSentUserMessage = false;
  isMobile = window.innerWidth <= 640;
  messages: ChatMessage[] = [
    {
      sender: 'bot',
      content: 'Bonjour, je suis votre assistant Huilerie. Comment puis-je vous aider aujourd’hui ?',
      timestamp: new Date(),
    },
  ];

  readonly quickSuggestions: string[] = [
    'Quelle est la production aujourd’hui ?',
    'Quel est le stock actuel ?',
    'Quelles machines sont en panne ?'
  ];

  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private panelLeft = 0;
  private panelTop = 0;
  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly chatbotService: ChatbotService) {}

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
    if (this.isMobile) {
      return;
    }

    this.isFullScreen = !this.isFullScreen;
    if (!this.isFullScreen) {
      setTimeout(() => this.resetPanelPosition());
    }
  }

  sendSuggestion(suggestion: string): void {
    if (this.isLoading) {
      return;
    }

    this.draftMessage = suggestion;
    this.sendMessage();
  }

  sendMessage(): void {
    const message = this.draftMessage.trim();
    if (!message || this.isLoading) {
      return;
    }

    this.messages.push({
      sender: 'user',
      content: message,
      timestamp: new Date(),
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

        this.messages.push({
          sender: 'bot',
          content: response.response,
          timestamp: new Date(),
        });

        if (!this.isOpen) {
          this.hasUnreadPulse = true;
        }

        this.scrollToBottom();
      });
  }

  onTextareaInput(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${nextHeight}px`;
  }

  startDrag(event: MouseEvent | TouchEvent): void {
    if (!this.isOpen || this.isFullScreenActive || !this.chatWindowRef) {
      return;
    }

    const panel = this.chatWindowRef.nativeElement;
    const panelRect = panel.getBoundingClientRect();
    const pointer = this.getPointer(event);

    if (!pointer) {
      return;
    }

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

  private updateDragPosition(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging || this.isFullScreenActive || !this.chatWindowRef) {
      return;
    }

    const pointer = this.getPointer(event);
    if (!pointer) {
      return;
    }

    this.panelLeft = pointer.clientX - this.dragOffsetX;
    this.panelTop = pointer.clientY - this.dragOffsetY;
    this.clampToViewport();
  }

  private clampToViewport(): void {
    const panel = this.chatWindowRef?.nativeElement;
    if (!panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const maxLeft = window.innerWidth - panelRect.width - 8;
    const maxTop = window.innerHeight - panelRect.height - 8;

    this.panelLeft = Math.max(8, Math.min(this.panelLeft, maxLeft));
    this.panelTop = Math.max(8, Math.min(this.panelTop, maxTop));
  }

  private resetPanelPosition(): void {
    if (this.isFullScreenActive) {
      return;
    }

    const panel = this.chatWindowRef?.nativeElement;
    if (!panel) {
      return;
    }

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
      const firstTouch = event.touches[0];
      return { clientX: firstTouch.clientX, clientY: firstTouch.clientY };
    }

    return null;
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const messagesContainer = this.messagesContainerRef?.nativeElement;
      if (!messagesContainer) {
        return;
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
      this.scrollToBottom();
    });
  }

  private resetTextareaHeight(): void {
    const textarea = this.chatInputAreaRef?.nativeElement;
    if (!textarea) {
      return;
    }

    textarea.style.height = '44px';
  }
}
