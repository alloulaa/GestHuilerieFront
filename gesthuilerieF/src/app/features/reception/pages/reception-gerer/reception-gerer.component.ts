import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { AuthService } from '../../../../core/auth/auth.service';
import { AnalyseLaboratoireService } from '../../../lots/services/analyse-laboratoire.service';
import { ReceptionListComponent } from '../reception-list/reception-list.component';
import { ReceptionFormComponent } from "../reception-form/reception-form.component";

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
    ReceptionListComponent,
    ReceptionFormComponent
  ],
})
export class ReceptionGererComponent implements OnInit {
  selectedPeseeForEdit: Pesee | null = null;
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
  selectedBonPeseeFile: File | null = null;
  showBonPeseeUploadSection = false;
  bonPeseeUploadProgress = '';
  selectedLotForAnalysis: LotOlives | null = null;
  analysisSaveError = '';

  editingId: number | null = null;
  isEditMode = false;
  successMessage = '';

  readonly form;
  readonly analysisForm;

  constructor(
    private fb: FormBuilder,
    private lotManagementService: LotManagementService,
    private weighingService: WeighingService,
    private toastService: ToastService,
    private huilerieService: HuilerieService,
    private rawMaterialService: RawMaterialService,
    private confirmDialogService: ConfirmDialogService,
    private permissionService: PermissionService,
    private authService: AuthService,
    private analyseLaboratoireService: AnalyseLaboratoireService,
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
      fournisseurNom: [''],
      fournisseurCIN: [''],
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

    this.analysisForm = this.fb.group({
      acidite_huile_pourcent: [0.6, [Validators.required, Validators.min(0), Validators.max(10)]],
      indice_peroxyde_meq_o2_kg: [8.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      polyphenols_mg_kg: [50.0, [Validators.required, Validators.min(0), Validators.max(10000)]],
      k232: [1.9, [Validators.required, Validators.min(0), Validators.max(10)]],
      k270: [0.18, [Validators.required, Validators.min(0), Validators.max(10)]],
    });

    this.applyLotModeValidation('existing');
  }

  ngOnInit(): void {
    forkJoin({
      huileries: this.huilerieService.getAll(),
      matieresPremieres: this.rawMaterialService.getAll(),
    }).subscribe(({ huileries, matieresPremieres }) => {
      // Restrict huileries for non-admin users
      const isAdmin = this.permissionService.isAdmin();
      const currentUser = this.authService.getCurrentUser();
      const userHuilerieId = currentUser?.huilerieId || currentUser?.idHuilerie;

      if (!isAdmin && userHuilerieId) {
        this.huileries = huileries.filter((h) => h.idHuilerie === userHuilerieId);
        // Lock the huilerie dropdown for non-admin users
        this.form.get('huilerieId')?.disable();
      } else {
        this.huileries = huileries;
      }

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

  onSubmit(): void {
    void this.submit();
  }

  async submit(): Promise<void> {
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
      this.toastService.error('Veuillez corriger les champs invalides avant de continuer.');
      return;
    }

    const raw = this.form.getRawValue();
    const poidsBrut = Number(raw.poidsBrut ?? 0);
    const poidsTare = Number(raw.poidsTare ?? 0);

    if (poidsTare > poidsBrut) {
      this.toastService.info('Le poids tare ne peut pas etre superieur au poids brut.');
      return;
    }

    const selectedMatiereId = Number(
      raw.matierePremiereId
      ?? this.matieresPremieres
        .map((item) => this.resolveMatierePremiereId(item))
        .find((id) => id != null)
      ?? 1,
    );

    const selectedMatiere = this.matieresPremieres.find(
      (item) => this.resolveMatierePremiereId(item) === selectedMatiereId,
    );

    const payload: CreatePeseeInput = {
      datePesee: raw.datePesee ?? new Date().toISOString(),
      pesee: poidsBrut || 0,
      poidsBrut: poidsBrut || 0,
      poidsTare: poidsTare || 0,
      huilerieId: Number(raw.huilerieId) || 1,
      origine: String(raw.origine ?? ''),
      varieteOlive: String(raw.varieteOlive ?? ''),
      fournisseurNom: String(raw.fournisseurNom ?? '').trim(),
      fournisseurCIN: String(raw.fournisseurCIN ?? '').trim(),
      maturite: String(raw.maturite ?? ''),
      dateRecolte: String(raw.dateRecolte ?? ''),
      dateReception: String(raw.dateReception ?? ''),
      dureeStockageAvantBroyage: Number(raw.dureeStockageAvantBroyage ?? 0),
      matierePremiereReference: String(selectedMatiere?.reference ?? selectedMatiereId),
      campagneReference: this.resolveCampaignSeason(
        String(raw.campagneId ?? ''),
        String(raw.dateRecolte ?? ''),
        String(raw.dateReception ?? ''),
      ),
    };

    const confirmed = await this.confirmDialogService.confirm({
      title: this.isEditMode ? 'Confirmer la mise à jour' : 'Confirmer l\'enregistrement',
      message: this.isEditMode
        ? 'Voulez-vous enregistrer les modifications de cette réception ?'
        : 'Voulez-vous enregistrer cette réception ?',
      confirmText: this.isEditMode ? 'Mettre à jour' : 'Enregistrer',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

    if (this.isEditMode) {
      if (this.editingId === null) {
        this.errorMessage = 'Mise a jour impossible: identifiant de reception manquant.';
        this.toastService.error(this.errorMessage);
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
    if (this.savedReception?.lotId) {
      this.generateReceptionPdf(this.savedReception.lotId);
    }
    this.closePopup();
  }

  onPopupSkipPdf(): void {
    this.closePopup();
  }

  onPopupUploadBonPesee(): void {
    this.showBonPeseeUploadSection = true;
    this.bonPeseeUploadProgress = '';
  }

  onBonPeseeFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      this.selectedBonPeseeFile = null;
      this.bonPeseeUploadProgress = 'Seuls les fichiers PDF sont autorises.';
      return;
    }

    this.selectedBonPeseeFile = file;
    this.bonPeseeUploadProgress = `Fichier selectionne: ${file.name}`;
  }

  uploadBonPeseePdf(): void {
    if (!this.savedReception?.lotId) {
      this.bonPeseeUploadProgress = 'Lot de reception introuvable.';
      return;
    }

    if (!this.selectedBonPeseeFile) {
      this.bonPeseeUploadProgress = 'Veuillez selectionner un fichier PDF.';
      return;
    }

    this.bonPeseeUploadProgress = 'Televersement en cours...';
    this.weighingService.uploadBonPeseePdf(this.savedReception.lotId, this.selectedBonPeseeFile).subscribe({
      next: (updatedReception) => {
        this.savedReception = { ...this.savedReception!, ...updatedReception };
        this.bonPeseeUploadProgress = 'Bon de pesee enregistre avec succes.';
        this.toastService.success('Bon de pesee enregistre avec succes.');
        this.closePopup();
      },
      error: (error: HttpErrorResponse) => {
        this.bonPeseeUploadProgress = error?.error?.message ?? 'Erreur lors du televersement du bon de pesee.';
        this.toastService.error(this.bonPeseeUploadProgress);
      },
    });
  }

  private closePopup(): void {
    this.showSaveSuccessPopup = false;
    this.showBonPeseeUploadSection = false;
    this.selectedBonPeseeFile = null;
    this.bonPeseeUploadProgress = '';
    this.resetForm();
    this.loadPesees();
  }

  private generateReceptionPdf(lotId: number): void {
    this.weighingService.generateBonPeseePdf(lotId).subscribe({
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
        this.toastService.error(this.errorMessage);
      },
    });
  }


  edit(pesee: Pesee): void {
    this.selectedPeseeForEdit = pesee;
    this.editingId = pesee.lotId ?? null;
    this.isEditMode = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.lastCreatedReference = '';

    if (this.editingId === null) {
      this.errorMessage = 'Edition impossible: identifiant de reception introuvable.';
      this.toastService.error(this.errorMessage);
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
    if (peseeToDelete.lotId == null) {
      this.errorMessage = 'Suppression impossible: identifiant de reception manquant.';
      this.toastService.error(this.errorMessage);
      return;
    }

    this.lotManagementService.deletePesee(peseeToDelete.lotId).subscribe({
      next: () => {
        if (this.selectedPeseeForEdit?.lotId === peseeToDelete.lotId) {
          this.selectedPeseeForEdit = null;
        }
        if (this.editingId === peseeToDelete.lotId) {
          this.resetForm();
        }
        this.toastService.success('Réception supprimée avec succès.');
      },
      error: (error: HttpErrorResponse) => {
        // Extract error message with priority: specific error reason > general message
        const errorResponse = error?.error as any;
        const errorReason = errorResponse?.errors?.[0] || errorResponse?.message || 'Erreur lors de la suppression.';
        this.errorMessage = errorReason;
        this.toastService.error(this.errorMessage);
      },
    });
  }

  onEditPesee(pesee: Pesee): void {
    this.edit(pesee);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onEditCleared(): void {
    this.selectedPeseeForEdit = null;
  }

  openAddAnalysis(pesee: Pesee): void {
    const lotId = Number(pesee.lotId);
    if (!Number.isFinite(lotId) || lotId <= 0) {
      this.toastService.error('Lot introuvable pour ajouter une analyse.');
      return;
    }

    const lot = this.availableLotsForReception.find((item) => Number(item.idLot) === lotId)
      ?? this.lots.find((item) => Number(item.idLot) === lotId);

    if (!lot) {
      this.toastService.error('Lot introuvable pour ajouter une analyse.');
      return;
    }

    this.analysisSaveError = '';
    this.selectedLotForAnalysis = lot;
    this.analysisForm.reset({
      acidite_huile_pourcent: 0.6,
      indice_peroxyde_meq_o2_kg: 8.0,
      polyphenols_mg_kg: 50.0,
      k232: 1.9,
      k270: 0.18,
    });
  }

  closeAddAnalysis(): void {
    this.selectedLotForAnalysis = null;
    this.analysisSaveError = '';
  }

  saveAnalysis(): void {
    if (!this.selectedLotForAnalysis) {
      return;
    }

    if (this.analysisForm.invalid) {
      this.analysisForm.markAllAsTouched();
      return;
    }

    this.analysisSaveError = '';
    const raw = this.analysisForm.getRawValue();

    this.analyseLaboratoireService.addToStore({
      lotId: this.selectedLotForAnalysis.idLot,
      acidite_huile_pourcent: Number(raw.acidite_huile_pourcent),
      indice_peroxyde_meq_o2_kg: Number(raw.indice_peroxyde_meq_o2_kg),
      polyphenols_mg_kg: Number(raw.polyphenols_mg_kg),
      k232: Number(raw.k232),
      k270: Number(raw.k270),
    }).subscribe({
      next: () => {
        this.toastService.success('Analyse enregistree avec succes.');
        this.closeAddAnalysis();
      },
      error: () => {
        this.analysisSaveError = 'Impossible d\'enregistrer l\'analyse.';
        this.toastService.error(this.analysisSaveError);
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
      fournisseurNom: '',
      fournisseurCIN: '',
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

  onWeightChange(): void {
    const poidsBrut = Number(this.form.get('poidsBrut')?.value ?? 0);
    const poidsTare = Number(this.form.get('poidsTare')?.value ?? 0);
    const poidsNet = this.lotManagementService.calculatePoidsNet(poidsBrut, poidsTare);
    this.form.get('poidsNet')?.setValue(poidsNet, { emitEvent: false });
  }

  isAdminUser(): boolean {
    return this.permissionService.isAdmin();
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

    const lot = this.availableLotsForReception.find((item) => item.idLot === lotId)
      ?? this.lots.find((item) => item.idLot === lotId);
    if (!lot) {
      return;
    }

    const patch: Record<string, unknown> = {
      origine: lot.origine,
      varieteOlive: lot.varieteOlive,
    };

    if (lot.huilerieId != null) {
      patch['huilerieId'] = lot.huilerieId;
    }

    this.form.patchValue(patch, { emitEvent: false });
  }

  private selectDefaultLot(): void {
    if (this.isNewLotMode() || this.availableLotsForReception.length === 0) {
      return;
    }

    const availableLot = this.availableLotsForReception[0];
    if (availableLot) {
      const patch: Record<string, unknown> = {
        existingLotId: availableLot.idLot,
        origine: availableLot.origine,
        varieteOlive: availableLot.varieteOlive,
      };

      if (availableLot.huilerieId != null) {
        patch['huilerieId'] = availableLot.huilerieId;
      }

      this.form.patchValue(
        patch,
        { emitEvent: false },
      );
      return;
    }

    this.form.patchValue({ lotMode: 'new', existingLotId: null }, { emitEvent: false });
    this.applyLotModeValidation('new');
  }

  private computeAvailableLots(): void {
    const isAdmin = this.permissionService.isAdmin();
    const currentUser = this.authService.getCurrentUser();
    const userHuilerieId = currentUser?.huilerieId || currentUser?.idHuilerie;

    // For non-admin users, filter lots by their huilerie only
    let filteredLots = this.lots;
    if (!isAdmin && userHuilerieId) {
      filteredLots = this.lots.filter((lot) => {
        const lotHuilerieId = lot.huilerieId || (lot as any).huilerie?.idHuilerie;
        return lotHuilerieId === userHuilerieId;
      });
    }

    const sortedLots = [...filteredLots].sort((a, b) => Number(a.idLot) - Number(b.idLot));
    const activeTraceabilityLots = sortedLots.filter((lot) => Number(lot.quantiteRestante ?? 0) > 0);
    this.availableLotsForReception = activeTraceabilityLots.length > 0 ? activeTraceabilityLots : sortedLots;
  }

  private buildCampaignSeasonsFromLots(): string[] {
    const isAdmin = this.permissionService.isAdmin();
    const currentUser = this.authService.getCurrentUser();
    const userHuilerieId = currentUser?.huilerieId || currentUser?.idHuilerie;

    // For non-admin users, filter lots by their huilerie for campaign extraction
    let lotsForCampaign = this.lots;
    if (!isAdmin && userHuilerieId) {
      lotsForCampaign = this.lots.filter((lot) => {
        const lotHuilerieId = lot.huilerieId || (lot as any).huilerie?.idHuilerie;
        return lotHuilerieId === userHuilerieId;
      });
    }

    const seasonsFromDates = lotsForCampaign
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
