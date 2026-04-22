import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule } from '@nebular/theme';
import { LotOlives, AnalyseLaboratoire, TraceabilityEvent } from '../../models/lot.models';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService } from '../../services/lot-management.service';
import { TraceabilityService } from '../../services/traceability.service';
import { AnalyseLaboratoireService } from '../../services/analyse-laboratoire.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LotOlivesService } from '../../services/lot-olives.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-lot-details',
  templateUrl: './lot-details.component.html',
  styleUrls: ['./lot-details.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NbCardModule, NbButtonModule, NbInputModule],
})
export class LotDetailsComponent implements OnInit {
  lot: LotOlives | null = null;
  pesees: Pesee[] = [];
  events: TraceabilityEvent[] = [];
  analyses: AnalyseLaboratoire[] = [];
  traceabilityErrorMessage = '';
  editingMode = false;

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private lotManagementService: LotManagementService,
    private traceabilityService: TraceabilityService,
    private analyseLaboratoireService: AnalyseLaboratoireService,
    private lotOlivesService: LotOlivesService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      varieteOlive: ['', [Validators.required]],
      maturite: [''],
      origine: ['', [Validators.required]],
      dateRecolte: [''],
      dateReception: [''],
      fournisseurNom: [''],
      fournisseurCIN: [''],
      dureeStockageAvantBroyage: [0, [Validators.required, Validators.min(0)]],
      quantiteInitiale: [0, [Validators.required, Validators.min(0)]],
      quantiteRestante: [0, [Validators.required, Validators.min(0)]],
      matierePremiereReference: ['', [Validators.required]],
      campagneReference: ['', [Validators.required]],
    });
    const lotId = Number(this.route.snapshot.paramMap.get('id'));
    if (!lotId) return;

    this.lotManagementService.getLotById(lotId).subscribe(lot => {
      this.lot = lot ?? null;
      if (this.lot) {
        this.form.patchValue(this.buildFormValue(this.lot));
      }
    });

    this.traceabilityService.getLotTraceability(lotId).subscribe({
      next: (dto) => {
        this.traceabilityErrorMessage = '';
        this.pesees = (dto.pesees ?? []).map((pesee) => ({
          ...pesee,
          datePesee: pesee.date,
          lotId: dto.lotId,
        } as Pesee));
        this.events = [...(dto.cycleVie ?? [])]
          .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      },
      error: (error: HttpErrorResponse) => {
        this.pesees = [];
        this.events = [];

        if (error.status === 403) {
          this.traceabilityErrorMessage = 'Lot hors périmètre de votre huilerie';
          return;
        }

        if (error.status === 404) {
          this.traceabilityErrorMessage = 'Lot introuvable';
          return;
        }

        this.traceabilityErrorMessage = 'Une erreur est survenue lors du chargement de la traçabilité du lot.';
        console.error('[lot-details] traceability request failed', error);
      },
    });

    this.analyseLaboratoireService.getByLot(lotId).subscribe(data => {
      this.analyses = data;
    });
  }

  get isEditMode(): boolean {
    return this.editingMode;
  }

  toggleEditMode(): void {
    if (!this.lot) {
      return;
    }

    this.editingMode = !this.editingMode;
    if (this.editingMode) {
      this.form.patchValue(this.buildFormValue(this.lot));
    }
  }

  cancelEdit(): void {
    this.editingMode = false;
    if (this.lot) {
      this.form.patchValue(this.buildFormValue(this.lot));
    }
  }

  async saveLot(): Promise<void> {
    if (!this.lot) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Veuillez corriger les champs du lot.');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Confirmer la modification',
      message: `Voulez-vous mettre à jour le lot ${this.lotReference(this.lot)} ?`,
      confirmText: 'Mettre à jour',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

    const raw = this.form.getRawValue();
    this.lotOlivesService.update(this.lot.idLot, {
      variete: String(raw.varieteOlive ?? '').trim(),
      maturite: String(raw.maturite ?? '').trim(),
      origine: String(raw.origine ?? '').trim(),
      dateRecolte: String(raw.dateRecolte ?? '').trim(),
      dateReception: String(raw.dateReception ?? '').trim(),
      fournisseurNom: String(raw.fournisseurNom ?? '').trim(),
      fournisseurCIN: String(raw.fournisseurCIN ?? '').trim(),
      dureeStockageAvantBroyage: Number(raw.dureeStockageAvantBroyage ?? 0),
      pesee: Number(raw.quantiteInitiale ?? 0),
      quantiteInitiale: Number(raw.quantiteInitiale ?? 0),
      quantiteRestante: Number(raw.quantiteRestante ?? 0),
      matierePremiereReference: String(raw.matierePremiereReference ?? '').trim(),
      campagneReference: String(raw.campagneReference ?? '').trim(),
    }).subscribe({
      next: (updated) => {
        this.lot = updated;
        this.form.patchValue(this.buildFormValue(updated));
        this.editingMode = false;
        this.toastService.success('Lot mis à jour avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.error(error?.error?.message ?? 'Impossible de mettre à jour le lot.');
      },
    });
  }

  async deleteLot(): Promise<void> {
    if (!this.lot) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer le lot',
      message: `Confirmez-vous la suppression du lot ${this.lotReference(this.lot)} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.lotOlivesService.delete(this.lot.idLot).subscribe({
      next: () => {
        this.toastService.success('Lot supprimé avec succès.');
        this.router.navigateByUrl('/pages/lots');
      },
      error: (error: HttpErrorResponse) => {
        // Extract error message with priority: specific error reason > general message
        const errorResponse = error?.error as any;
        const errorReason = errorResponse?.errors?.[0] || errorResponse?.message || 'Impossible de supprimer le lot.';
        this.toastService.error(errorReason);
      },
    });
  }

  stageLabel(stage: TraceabilityEvent['etape']): string {
    if (stage === 'LOT_OLIVES') {
      return 'Reception lot';
    }
    if (stage === 'PESEE') {
      return 'Pesee';
    }
    if (stage === 'PRODUCTION') {
      return 'Production';
    }
    if (stage === 'PRODUIT_FINAL') {
      return 'Produit final';
    }
    return 'Stock';
  }

  lotReference(lot: LotOlives): string {
    return lot.reference || (`LO-${lot.idLot}`);
  }

  analysisReference(analysis: AnalyseLaboratoire): string {
    return analysis.reference || (`AL-${analysis.idAnalyse}`);
  }

  private buildFormValue(lot: LotOlives): Record<string, unknown> {
    return {
      varieteOlive: lot.varieteOlive ?? '',
      maturite: lot.maturite ?? '',
      origine: lot.origine ?? '',
      dateRecolte: lot.dateRecolte ?? '',
      dateReception: lot.dateReception ?? '',
      fournisseurNom: lot.fournisseurNom ?? '',
      fournisseurCIN: lot.fournisseurCIN ?? '',
      dureeStockageAvantBroyage: Number(lot.dureeStockageAvantBroyage ?? 0),
      quantiteInitiale: Number(lot.quantiteInitiale ?? 0),
      quantiteRestante: Number(lot.quantiteRestante ?? 0),
      matierePremiereReference: String(lot.matierePremiereReference ?? ''),
      campagneReference: String(lot.campagneId ?? ''),
    };
  }
}
