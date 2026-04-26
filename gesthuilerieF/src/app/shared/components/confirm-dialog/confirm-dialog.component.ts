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
        <nb-card class="confirm-card" [class.intent-danger]="dialog.intent === 'danger'" [class.intent-info]="dialog.intent === 'info'">
          <nb-card-header>{{ dialog.title }}</nb-card-header>
          <nb-card-body>
            <div class="confirm-message" [class.confirm-message--metrics]="hasMultipleLines(dialog.message)">
              <ng-container *ngIf="hasMultipleLines(dialog.message); else singleMessage">
                <div class="metric-row" *ngFor="let line of splitLines(dialog.message)">
                  <strong *ngIf="getMetricLabel(line) as metricLabel">{{ metricLabel }}</strong>
                  <span>{{ getMetricValue(line) }}</span>
                </div>
              </ng-container>
              <ng-template #singleMessage>
                <p>{{ dialog.message }}</p>
              </ng-template>
            </div>
          </nb-card-body>
          <nb-card-footer class="confirm-actions">
            <button *ngIf="dialog.cancelText" nbButton status="basic" class="app-cancel-btn" type="button" (click)="confirmDialogService.cancel()">{{ dialog.cancelText }}</button>
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

  splitLines(message: string): string[] {
    return String(message ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  hasMultipleLines(message: string): boolean {
    return this.splitLines(message).length > 1;
  }

  getMetricLabel(line: string): string {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      return '';
    }
    return line.slice(0, separatorIndex + 1).trim();
  }

  getMetricValue(line: string): string {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      return line.trim();
    }
    return line.slice(separatorIndex + 1).trim();
  }
}
