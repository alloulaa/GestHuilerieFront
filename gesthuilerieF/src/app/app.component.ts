import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { ChatbotWidgetComponent } from './shared/components/chatbot-widget/chatbot-widget.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [NgIf, RouterOutlet, ToastContainerComponent, ConfirmDialogComponent, ChatbotWidgetComponent]
})
export class AppComponent {
  title = 'Gestion Huilerie';

  private readonly hiddenChatbotRoutes: string[] = [
    '/login',
    '/signup',
    '/reset-password',
    '/reset-password/confirm'
  ];

  constructor(private readonly router: Router) {}

  get showChatbot(): boolean {
    const normalizedUrl = this.normalizeUrl(this.router.url);

    if (normalizedUrl.includes('/access-pending')) {
      return true;
    }

    return !this.hiddenChatbotRoutes.includes(normalizedUrl);
  }

  private normalizeUrl(url: string): string {
    return (url.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
  }
}
