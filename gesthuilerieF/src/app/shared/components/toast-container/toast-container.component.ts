// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\shared\components\toast-container\toast-container.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toastService.toasts"
        class="toast"
        [class]="'toast-' + toast.type"
      >
        <div class="toast-icon">
          <svg *ngIf="toast.type === 'success'" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <svg *ngIf="toast.type === 'error'" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <svg *ngIf="toast.type === 'info'" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
      </div>
    </div>
  `,
  styleUrl: './toast-container.component.scss'
})
export class ToastContainerComponent implements OnDestroy {
  constructor(public toastService: ToastService) {}

  ngOnDestroy(): void {
    this.toastService.toasts = [];
  }
}
