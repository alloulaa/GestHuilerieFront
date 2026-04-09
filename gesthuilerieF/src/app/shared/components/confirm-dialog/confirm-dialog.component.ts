import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NbButtonModule, NbCardModule } from '@nebular/theme';

import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule, NbCardModule, NbButtonModule],
    template: `
    <ng-container *ngIf="confirmDialogService.dialog$ | async as dialog">
      <div class="confirm-overlay" (click)="confirmDialogService.cancel()"></div>
      <div class="confirm-shell" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <nb-card class="confirm-card" [class.intent-danger]="dialog.intent === 'danger'">
          <nb-card-header>{{ dialog.title }}</nb-card-header>
          <nb-card-body>
            <p>{{ dialog.message }}</p>
          </nb-card-body>
          <nb-card-footer class="confirm-actions">
            <button nbButton status="basic" class="app-cancel-btn" type="button" (click)="confirmDialogService.cancel()">{{ dialog.cancelText }}</button>
            <button nbButton [status]="dialog.intent" type="button" (click)="confirmDialogService.accept()">{{ dialog.confirmText }}</button>
          </nb-card-footer>
        </nb-card>
      </div>
    </ng-container>
  `,
    styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
    constructor(public confirmDialogService: ConfirmDialogService) { }
}
