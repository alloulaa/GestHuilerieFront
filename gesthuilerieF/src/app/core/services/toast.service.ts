// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\core\services\toast.service.ts
import { Injectable } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: Toast[] = [];
  private idCounter = 0;

  show(type: 'success' | 'error' | 'info', message: string, duration = 3000): void {
    const id = ++this.idCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, duration);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }
}
