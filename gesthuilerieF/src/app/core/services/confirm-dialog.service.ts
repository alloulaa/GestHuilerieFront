import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmDialogOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    intent?: 'danger' | 'primary';
}

export interface ConfirmDialogState {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    intent: 'danger' | 'primary';
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    private readonly dialogSubject = new BehaviorSubject<ConfirmDialogState | null>(null);
    readonly dialog$ = this.dialogSubject.asObservable();

    private resolver: ((confirmed: boolean) => void) | null = null;

    confirm(options: ConfirmDialogOptions): Promise<boolean> {
        this.dialogSubject.next({
            title: options.title ?? 'Confirmation',
            message: options.message,
            confirmText: options.confirmText ?? 'Confirmer',
            cancelText: options.cancelText ?? 'Annuler',
            intent: options.intent ?? 'primary',
        });

        return new Promise<boolean>((resolve) => {
            this.resolver = resolve;
        });
    }

    accept(): void {
        this.resolveAndClose(true);
    }

    cancel(): void {
        this.resolveAndClose(false);
    }

    private resolveAndClose(result: boolean): void {
        if (this.resolver) {
            this.resolver(result);
            this.resolver = null;
        }
        this.dialogSubject.next(null);
    }
}
