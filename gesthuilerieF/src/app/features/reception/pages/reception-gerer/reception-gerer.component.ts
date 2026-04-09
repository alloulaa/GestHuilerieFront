import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NbButtonModule, NbCardModule, NbIconModule } from '@nebular/theme';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { Pesee } from '../../../stock/models/stock.models';
import { LotManagementService, CreatePeseeInput } from '../../../lots/services/lot-management.service';
import { WeighingService } from '../../../stock/services/weighing.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../../core/services/toast.service';
import { LotOlives } from '../../../lots/models/lot.models';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { RawMaterialService } from '../../../matieres-premieres/services/raw-material.service';
import { MatierePremiere } from '../../../matieres-premieres/models/raw-material.models';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-reception-gerer',
  standalone: true,
  templateUrl: './reception-gerer.component.html',
  styleUrls: ['./reception-gerer.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class ReceptionGererComponent implements OnInit {
  pesees: Pesee[] = [];
  lots: LotOlives[] = [];
  weighings: Pesee[] = [];
  availableLotsForReception: LotOlives[] = [];
  huileries: Huilerie[] = [];
  matieresPremieres: MatierePremiere[] = [];
  campagnes: string[] = [];
  errorMessage = '';
  lastCreatedReference = '';
  showSaveSuccessPopup = false;
  savedReception: Pesee | null = null;

  editingId: number | null = null;
  isEditMode = false;
  successMessage = '';

  readonly form;

  constructor(
    private fb: FormBuilder,
    private lotManagementService: LotManagementService,
    private weighingService: WeighingService,
    private toastService: ToastService,
    private router: Router,
    private huilerieService: HuilerieService,
    private rawMaterialService: RawMaterialService,
    private confirmDialogService: ConfirmDialogService,
    private permissionService: PermissionService,
  ) {
    this.form = this.fb.group({
      datePesee: [new Date().toISOString().slice(0, 16), [Validators.required]],
      poidsBrut: [0, [Validators.required, Validators.min(0)]],
      poidsTare: [0, [Validators.required, Validators.min(0)]],
      poidsNet: [{ value: 0, disabled: true }, [Validators.required]],
      lotMode: ['existing', [Validators.required]],
      existingLotId: [null as number | null, [Validators.required]],
      origine: ['', [Validators.required]],
      varieteOlive: ['', [Validators.required]],
      maturite: [''],
      dateRecolte: [new Date().toISOString().slice(0, 10)],
      dateReception: [new Date().toISOString().slice(0, 10)],
      dureeStockageAvantBroyage: [1],
      matierePremiereId: [null as number | null],
      campagneId: [null as string | null],
      huilerieId: [1, [Validators.required, Validators.min(1)]],
    });

    this.form.valueChanges.subscribe((values) => {
      const net = this.lotManagementService.calculatePoidsNet(
        Number(values.poidsBrut ?? 0),
        Number(values.poidsTare ?? 0),
      );
      this.form.get('poidsNet')?.setValue(net, { emitEvent: false });
    });

    this.form.get('lotMode')?.valueChanges.subscribe((mode) => {
      this.applyLotModeValidation(mode === 'new' ? 'new' : 'existing');
    });

    this.form.get('existingLotId')?.valueChanges.subscribe((id) => {
      this.patchLotIdentityFromSelection(Number(id));
    });

    this.applyLotModeValidation('existing');
  }

  ngOnInit(): void {
    forkJoin({
      huileries: this.huilerieService.getAll(),
      matieresPremieres: this.rawMaterialService.getAll(),
    }).subscribe(({ huileries, matieresPremieres }) => {
      this.huileries = huileries;
      this.matieresPremieres = matieresPremieres.map((item, index) => ({
        ...item,
        idMatierePremiere: this.resolveMatierePremiereId(item, index),
      }));

      console.log('[reception-gerer] huileries loaded:', this.huileries.length);
      console.log('[reception-gerer] matieres premieres loaded:', this.matieresPremieres.length);
      console.log('[reception-gerer] matieres premieres ids:', this.matieresPremieres.map((item) => item.idMatierePremiere));
      console.log('[reception-gerer] matieres premieres keys:', this.matieresPremieres.map((item) => Object.keys(item as object)));
      console.log('[reception-gerer] first matiere premiere object:', this.matieresPremieres[0]);
      console.log('[reception-gerer] first matiere premiere json:', JSON.stringify(this.matieresPremieres[0]));
      if (this.matieresPremieres.length === 0) {
        console.warn('[reception-gerer] matieres premieres list is empty, matierePremiereId will stay invalid in new lot mode.');
      }

      const selectedHuilerieId = Number(this.form.get('huilerieId')?.value);
      if (!this.huileries.some((h) => h.idHuilerie === selectedHuilerieId) && this.huileries.length > 0) {
        this.form.patchValue({ huilerieId: this.huileries[0].idHuilerie });
      }

      // Set default matière première
      if (this.matieresPremieres.length > 0) {
        const currentMatiereId = this.form.get('matierePremiereId')?.value;
        if (!currentMatiereId || !this.matieresPremieres.some((m) => m.idMatierePremiere === currentMatiereId)) {
          const firstValidMatiereId = this.matieresPremieres
            .map((m) => this.resolveMatierePremiereId(m))
            .find((id) => id != null);

          if (firstValidMatiereId != null) {
            this.form.patchValue({ matierePremiereId: firstValidMatiereId });
          }
        }
      }
    });

    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.lots$.subscribe((data) => {
        this.lots = data;
        this.campagnes = this.buildCampaignSeasonsFromLots();

        console.log('[reception-gerer] campagnes computed:', this.campagnes);
        if (this.campagnes.length === 0) {
          console.warn('[reception-gerer] campagnes list is empty, campagneId will stay invalid in new lot mode.');
        }
        
        // Set default campagne
        if (this.campagnes.length > 0) {
          const currentCampagne = this.form.get('campagneId')?.value;
          if (!currentCampagne || !this.campagnes.includes(currentCampagne)) {
            this.form.patchValue({ campagneId: this.campagnes[0] });
          }
        }
        
        this.computeAvailableLots();
        this.selectDefaultLot();
      });

      this.lotManagementService.weighings$.subscribe((data) => {
        this.weighings = data;
        this.pesees = data;
        this.computeAvailableLots();
        this.selectDefaultLot();
      });
    });
  }

  get canUpdate(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canUpdate('RECEPTION');
  }

  get canDelete(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canDelete('RECEPTION');
  }

  isNewLotMode(): boolean {
    return this.form.get('lotMode')?.value === 'new';
  }

  loadPesees(): void {
    this.lotManagementService.loadInitialData().subscribe();
  }

  submit(): void {
    this.errorMessage = '';

    console.log('[reception-gerer] submit start');
    console.log('[reception-gerer] form status:', this.form.status);
    console.log('[reception-gerer] form value:', this.form.getRawValue());

    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.log('[reception-gerer] invalid control:', key, {
            value: control.value,
            errors: control.errors,
          });
        }
      });
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreatePeseeInput = {
      datePesee: raw.datePesee ?? new Date().toISOString(),
      poidsBrut: Number(raw.poidsBrut) || 0,
      poidsTare: Number(raw.poidsTare) || 0,
      huilerieId: Number(raw.huilerieId) || 1,
      lotMode: raw.lotMode === 'new' ? 'new' : 'existing',
      existingLotId: raw.existingLotId ? Number(raw.existingLotId) : undefined,
      origine: String(raw.origine ?? ''),
      varieteOlive: String(raw.varieteOlive ?? ''),
      newLotDetails:
        raw.lotMode === 'new'
          ? {
              maturite: String(raw.maturite ?? ''),
              dateRecolte: String(raw.dateRecolte ?? ''),
              dateReception: String(raw.dateReception ?? ''),
              dureeStockageAvantBroyage: Number(raw.dureeStockageAvantBroyage),
              matierePremiereId: Number(
                raw.matierePremiereId
                  ?? this.matieresPremieres
                    .map((item) => this.resolveMatierePremiereId(item))
                    .find((id) => id != null)
                  ?? 1,
              ),
              campagneId: this.resolveCampaignSeason(
                String(raw.campagneId ?? ''),
                String(raw.dateRecolte ?? ''),
                String(raw.dateReception ?? ''),
              ),
            }
          : undefined,
    };

    if (this.isEditMode) {
      if (this.editingId === null) {
        this.errorMessage = 'Mise a jour impossible: identifiant de reception manquant.';
        return;
      }

      this.lotManagementService.updatePesee(this.editingId, payload).subscribe({
        next: () => {
          this.resetForm();
          this.toastService.success('Réception mise à jour avec succès.');
          this.loadPesees();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error?.error?.message ?? 'Erreur lors de la mise à jour de la réception.';
          this.toastService.error(this.errorMessage);
        },
      });
    } else {
      this.lotManagementService.createPesee(payload).subscribe({
        next: (created) => {
          this.savedReception = created;
          this.showSaveSuccessPopup = true;
          this.lastCreatedReference = created.reference ?? '';
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error?.error?.message ?? 'Erreur lors de l\'ajout de la réception.';
          this.toastService.error(this.errorMessage);
        },
      });
    }
  }

  onPopupGeneratePdf(): void {
    if (this.savedReception?.reference) {
      this.generateReceptionPdf(this.savedReception.reference);
    }
    this.closePopup();
  }

  onPopupSkipPdf(): void {
    this.closePopup();
  }

  private closePopup(): void {
    this.showSaveSuccessPopup = false;
    this.resetForm();
    this.loadPesees();
  }

  private generateReceptionPdf(reference: string): void {
    this.weighingService.generateBonPeseePdf(reference).subscribe({
      next: (blob) => {
        const pdfUrl = window.URL.createObjectURL(blob);
        const popup = window.open(pdfUrl, '_blank');

        if (!popup) {
          window.URL.revokeObjectURL(pdfUrl);
          return;
        }

        popup.addEventListener('load', () => {
          popup.focus();
          popup.print();
          window.URL.revokeObjectURL(pdfUrl);
        });
      },
      error: () => {
        this.errorMessage = 'Impossible de generer le PDF.';
      },
    });
  }


  edit(pesee: Pesee): void {
    this.editingId = pesee.idPesee ?? null;
    this.isEditMode = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.lastCreatedReference = '';

    if (this.editingId === null) {
      this.errorMessage = 'Edition impossible: identifiant de reception introuvable.';
      this.isEditMode = false;
      return;
    }

    const lot = this.lots.find((item) => item.idLot === pesee.lotId);

    this.form.patchValue({
      datePesee: pesee.datePesee.slice(0, 16),
      poidsBrut: pesee.poidsBrut,
      poidsTare: pesee.poidsTare,
      lotMode: 'existing',
      existingLotId: pesee.lotId,
      origine: lot?.origine ?? '',
      varieteOlive: lot?.varieteOlive ?? '',
      huilerieId: pesee.huilerieId ?? Number(this.form.get('huilerieId')?.value ?? 1),
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  async askDelete(pesee: Pesee): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer réception',
      message: `Êtes-vous sûr de vouloir supprimer la réception du ${new Date(pesee.datePesee).toLocaleString()} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    const peseeToDelete = pesee;
    if (peseeToDelete.idPesee == null) {
      this.errorMessage = 'Suppression impossible: identifiant de reception manquant.';
      this.toastService.error(this.errorMessage);
      return;
    }

    this.lotManagementService.deletePesee(peseeToDelete.idPesee).subscribe({
      next: () => {
        if (this.editingId === peseeToDelete.idPesee) {
          this.resetForm();
        }
        this.toastService.success('Réception supprimée avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error?.error?.message ?? 'Erreur lors de la suppression.';
        this.toastService.error(this.errorMessage);
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.isEditMode = false;
    this.errorMessage = '';
    this.form.reset({
      datePesee: new Date().toISOString().slice(0, 16),
      poidsBrut: 0,
      poidsTare: 0,
      poidsNet: 0,
      lotMode: 'existing',
      existingLotId: null,
      origine: '',
      varieteOlive: '',
      maturite: '',
      dateRecolte: new Date().toISOString().slice(0, 10),
      dateReception: new Date().toISOString().slice(0, 10),
      dureeStockageAvantBroyage: 1,
      matierePremiereId:
        this.matieresPremieres.map((item) => this.resolveMatierePremiereId(item)).find((id) => id != null)
        ?? 1,
      campagneId: this.campagnes[0] ?? this.toCampaignSeason(new Date().toISOString().slice(0, 10)),
      huilerieId: 1,
    });

    this.selectDefaultLot();
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  trackByPesee(index: number, pesee: Pesee): number {
    return pesee.idPesee ?? index;
  }

  private applyLotModeValidation(mode: 'existing' | 'new'): void {
    console.log('[reception-gerer] applyLotModeValidation mode:', mode);
    const existingLotControl = this.form.get('existingLotId');
    const newLotFields = [
      'maturite',
      'dateRecolte',
      'dateReception',
      'dureeStockageAvantBroyage',
      'matierePremiereId',
      'campagneId',
    ];

    if (mode === 'existing') {
      existingLotControl?.setValidators([Validators.required]);

      newLotFields.forEach((field) => {
        const control = this.form.get(field);
        control?.clearValidators();
        control?.updateValueAndValidity({ emitEvent: false });
      });
    } else {
      existingLotControl?.clearValidators();

      this.form.get('maturite')?.setValidators([Validators.required]);
      this.form.get('dateRecolte')?.setValidators([Validators.required]);
      this.form.get('dateReception')?.setValidators([Validators.required]);
      this.form.get('dureeStockageAvantBroyage')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('matierePremiereId')?.setValidators([Validators.required, Validators.min(1)]);
      this.form.get('campagneId')?.setValidators([Validators.required]);

      newLotFields.forEach((field) => {
        this.form.get(field)?.updateValueAndValidity({ emitEvent: false });
      });
    }

    existingLotControl?.updateValueAndValidity({ emitEvent: false });

    console.log('[reception-gerer] campagneId current:', this.form.get('campagneId')?.value);
    console.log('[reception-gerer] campagneId errors:', this.form.get('campagneId')?.errors);
    console.log('[reception-gerer] matierePremiereId current:', this.form.get('matierePremiereId')?.value);
    console.log('[reception-gerer] matierePremiereId errors:', this.form.get('matierePremiereId')?.errors);
  }

  private patchLotIdentityFromSelection(lotId: number): void {
    if (this.isNewLotMode()) {
      return;
    }

    const lot = this.lots.find((item) => item.idLot === lotId);
    if (!lot) {
      return;
    }

    this.form.patchValue(
      {
        origine: lot.origine,
        varieteOlive: lot.varieteOlive,
      },
      { emitEvent: false },
    );
  }

  private selectDefaultLot(): void {
    if (this.isNewLotMode() || this.lots.length === 0) {
      return;
    }

    const availableLot = this.lots[0];
    if (availableLot) {
      this.form.patchValue(
        {
          existingLotId: availableLot.idLot,
          origine: availableLot.origine,
          varieteOlive: availableLot.varieteOlive,
        },
        { emitEvent: false },
      );
      return;
    }

    this.form.patchValue({ lotMode: 'new', existingLotId: null }, { emitEvent: false });
    this.applyLotModeValidation('new');
  }

  private computeAvailableLots(): void {
    const receivedLotIds = new Set(this.weighings.map((pesee) => Number(pesee.lotId)).filter((id) => !Number.isNaN(id)));
    this.availableLotsForReception = this.lots.filter((lot) => !receivedLotIds.has(Number(lot.idLot)));
  }

  private buildCampaignSeasonsFromLots(): string[] {
    const seasonsFromDates = this.lots
      .flatMap((lot) => [lot.dateRecolte, lot.dateReception])
      .map((value) => this.toCampaignSeason(value))
      .filter((season): season is string => !!season);

    const currentSeason = this.toCampaignSeason(new Date().toISOString().slice(0, 10));
    const seasons = seasonsFromDates.length > 0 ? seasonsFromDates : [currentSeason];

    return Array.from(new Set(seasons)).sort((a, b) => b.localeCompare(a));
  }

  private toCampaignSeason(value: string | null | undefined): string {
    if (!value) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
    }

    const year = Number(String(value).slice(0, 4));
    const month = Number(String(value).slice(5, 7));

    if (!Number.isFinite(year) || year < 2000) {
      const now = new Date();
      const nowYear = now.getFullYear();
      const nowMonth = now.getMonth() + 1;
      return nowMonth >= 9 ? `${nowYear}/${nowYear + 1}` : `${nowYear - 1}/${nowYear}`;
    }

    return Number.isFinite(month) && month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }

  private resolveCampaignSeason(candidate: string, dateRecolte: string, dateReception: string): string {
    if (/^\d{4}\/\d{4}$/.test(candidate)) {
      return candidate;
    }

    const asYear = Number(candidate);
    if (Number.isFinite(asYear) && asYear >= 2000) {
      return `${asYear - 1}/${asYear}`;
    }

    if (dateRecolte) {
      return this.toCampaignSeason(dateRecolte);
    }

    if (dateReception) {
      return this.toCampaignSeason(dateReception);
    }

    return this.campagnes[0] ?? this.toCampaignSeason(new Date().toISOString().slice(0, 10));
  }

  resolveMatierePremiereId(item: MatierePremiere, fallbackIndex?: number): number | undefined {
    const objectItem = item as object;
    const withKnownFields = item as MatierePremiere & {
      matierePremiereId?: number | string;
      id?: number | string;
      id_matiere_premiere?: number | string;
      idmatierepremiere?: number | string;
      idMP?: number | string;
      mpId?: number | string;
      reference?: string;
    };

    const explicitCandidates: unknown[] = [
      withKnownFields.idMatierePremiere,
      withKnownFields.matierePremiereId,
      withKnownFields.id,
      withKnownFields.id_matiere_premiere,
      withKnownFields.idmatierepremiere,
      withKnownFields.idMP,
      withKnownFields.mpId,
    ];

    for (const [key, value] of Object.entries(objectItem)) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.includes('id') && (normalizedKey.includes('matiere') || normalizedKey.includes('premiere') || normalizedKey.includes('mp'))) {
        explicitCandidates.push(value);
      }
    }

    const normalizeCandidate = (candidate: unknown): number | undefined => {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
        return candidate;
      }

      if (typeof candidate === 'string') {
        const direct = Number(candidate);
        if (Number.isFinite(direct) && direct > 0) {
          return direct;
        }

        const extractedDigits = candidate.match(/\d+/)?.[0];
        if (extractedDigits) {
          const extracted = Number(extractedDigits);
          if (Number.isFinite(extracted) && extracted > 0) {
            return extracted;
          }
        }
      }

      return undefined;
    };

    for (const candidateValue of explicitCandidates) {
      const normalized = normalizeCandidate(candidateValue);
      if (normalized != null) {
        return normalized;
      }
    }

    const referenceValue = normalizeCandidate(withKnownFields.reference);
    if (referenceValue != null) {
      return referenceValue;
    }

    if (typeof fallbackIndex === 'number') {
      return fallbackIndex + 1;
    }

    return undefined;
  }
}
