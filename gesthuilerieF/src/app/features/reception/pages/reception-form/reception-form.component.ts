import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { LotOlives } from '../../../lots/models/lot.models';
import { CreatePeseeInput, LotManagementService } from '../../../lots/services/lot-management.service';
import { Pesee } from '../../../stock/models/stock.models';
import { WeighingService } from '../../../stock/services/weighing.service';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { RawMaterialService } from '../../../matieres-premieres/services/raw-material.service';
import { MatierePremiere } from '../../../matieres-premieres/models/raw-material.models';

@Component({
  selector: 'app-reception-form',
  standalone: true,
  templateUrl: './reception-form.component.html',
  styleUrls: ['./reception-form.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class ReceptionFormComponent implements OnInit {
  lots: LotOlives[] = [];
  weighings: Pesee[] = [];
  availableLotsForReception: LotOlives[] = [];
  huileries: Huilerie[] = [];
  matieresPremieres: MatierePremiere[] = [];
  campagnes: string[] = [];
  errorMessage = '';
  showSaveSuccessPopup = false;
  savedReception: Pesee | null = null;

  readonly form;

  constructor(
    private formBuilder: FormBuilder,
    private lotManagementService: LotManagementService,
    private weighingService: WeighingService,
    private router: Router,
    private huilerieService: HuilerieService,
    private rawMaterialService: RawMaterialService,
  ) {
    this.form = this.formBuilder.group({
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

    this.form.valueChanges.subscribe(values => {
      const net = this.lotManagementService.calculatePoidsNet(
        Number(values.poidsBrut ?? 0),
        Number(values.poidsTare ?? 0),
      );
      this.form.get('poidsNet')?.setValue(net, { emitEvent: false });
    });

    this.form.get('lotMode')?.valueChanges.subscribe(mode => {
      this.applyLotModeValidation(mode === 'new' ? 'new' : 'existing');
    });

    this.form.get('existingLotId')?.valueChanges.subscribe(id => {
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
      this.matieresPremieres = matieresPremieres;
      
      console.log('✅ Loaded huileries:', this.huileries);
      console.log('✅ Loaded matieresPremieres:', this.matieresPremieres);

      const selectedHuilerieId = Number(this.form.get('huilerieId')?.value);
      if (!this.huileries.some((h) => h.idHuilerie === selectedHuilerieId) && this.huileries.length > 0) {
        this.form.patchValue({ huilerieId: this.huileries[0].idHuilerie });
      }

      // Set default matière première
      if (this.matieresPremieres.length > 0) {
        const currentMatiereId = this.form.get('matierePremiereId')?.value;
        console.log('Current matiereId:', currentMatiereId);
        if (!currentMatiereId || !this.matieresPremieres.some((m) => m.idMatierePremiere === currentMatiereId)) {
          const defaultMatiereId = this.matieresPremieres[0].idMatierePremiere;
          console.log('Setting default matiereId to:', defaultMatiereId);
          this.form.patchValue({ matierePremiereId: defaultMatiereId });
        }
      }
    });

    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.lots$.subscribe(data => {
        this.lots = data;
        this.campagnes = this.buildCampaignSeasonsFromLots();
        
        console.log('✅ Loaded lots:', this.lots);
        console.log('✅ Computed campagnes:', this.campagnes);
        
        // Set default campagne
        if (this.campagnes.length > 0) {
          const currentCampagne = this.form.get('campagneId')?.value;
          console.log('Current campagne:', currentCampagne);
          if (!currentCampagne || !this.campagnes.includes(currentCampagne)) {
            const defaultCampagne = this.campagnes[0];
            console.log('Setting default campagne to:', defaultCampagne);
            this.form.patchValue({ campagneId: defaultCampagne });
          }
        }
        
        this.computeAvailableLots();
        this.selectDefaultLot();
      });

      this.lotManagementService.weighings$.subscribe(data => {
        this.weighings = data;
        console.log('✅ Loaded weighings:', this.weighings);
        this.computeAvailableLots();
        this.selectDefaultLot();
      });
    });
  }

  isNewLotMode(): boolean {
    return this.form.get('lotMode')?.value === 'new';
  }

  submit(): void {
    this.errorMessage = '';
    
    console.log('=== DEBUG SUBMIT ===');
    console.log('Form valid:', this.form.valid);
    console.log('Form invalid:', this.form.invalid);
    console.log('Form errors:', this.form.errors);
    console.log('Form status:', this.form.status);
    console.log('Form value:', this.form.value);
    
    // Check each control
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      console.log(`${key}:`, {
        value: control?.value,
        valid: control?.valid,
        invalid: control?.invalid,
        errors: control?.errors,
        touched: control?.touched,
      });
    });

    if (this.form.invalid) {
      console.log('❌ FORM INVALID - Marking all as touched');
      this.form.markAllAsTouched();
      return;
    }

    console.log('✅ FORM VALID - Proceeding with submit');
    const raw = this.form.getRawValue();

    const payload: CreatePeseeInput = {
      datePesee: raw.datePesee ?? new Date().toISOString(),
      poidsBrut: Number(raw.poidsBrut),
      poidsTare: Number(raw.poidsTare),
      huilerieId: Number(raw.huilerieId),
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
            matierePremiereId: Number(raw.matierePremiereId ?? this.matieresPremieres[0]?.idMatierePremiere ?? 1),
            campagneId: this.resolveCampaignSeason(
              String(raw.campagneId ?? ''),
              String(raw.dateRecolte ?? ''),
              String(raw.dateReception ?? ''),
            ),
          }
          : undefined,
    };

    this.lotManagementService.createPesee(payload).subscribe({
      next: result => {
        this.savedReception = result;
        this.showSaveSuccessPopup = true;
      },

      error: errorResponse => {
        console.log('BACKEND ERROR =', errorResponse);
        console.log('BACKEND ERROR BODY =', errorResponse?.error);

        this.errorMessage =
          errorResponse?.error?.message ??
          errorResponse?.error?.error ??
          errorResponse?.message ??
          'Erreur de validation.';
      },
    });
  }

  onPopupGeneratePdf(): void {
    if (this.savedReception?.reference) {
      this.generateReceptionPdf(this.savedReception.reference);
    }
    this.closePopupAndGoToList();
  }

  onPopupSkipPdf(): void {
    this.closePopupAndGoToList();
  }

  private closePopupAndGoToList(): void {
    this.showSaveSuccessPopup = false;
    this.router.navigateByUrl('/pages/reception');
  }

  private generateReceptionPdf(reference: string): void {
    this.weighingService.generateBonPeseePdf(reference).subscribe({
      next: blob => {
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

  private applyLotModeValidation(mode: 'existing' | 'new'): void {
    console.log('🔄 applyLotModeValidation called with mode:', mode);
    
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
      console.log('Setting existing lot mode validators');
      existingLotControl?.setValidators([Validators.required]);

      newLotFields.forEach(field => {
        const control = this.form.get(field);
        control?.clearValidators();
        control?.updateValueAndValidity({ emitEvent: false });
      });
    } else {
      console.log('Setting new lot mode validators');
      existingLotControl?.clearValidators();

      this.form.get('maturite')?.setValidators([Validators.required]);
      this.form.get('dateRecolte')?.setValidators([Validators.required]);
      this.form.get('dateReception')?.setValidators([Validators.required]);
      this.form.get('dureeStockageAvantBroyage')?.setValidators([Validators.required, Validators.min(0)]);
      
      const matiereControl = this.form.get('matierePremiereId');
      const campagneControl = this.form.get('campagneId');
      
      matiereControl?.setValidators([Validators.required, Validators.min(1)]);
      campagneControl?.setValidators([Validators.required]);
      
      console.log('matiere value:', matiereControl?.value, 'campagne value:', campagneControl?.value);

      newLotFields.forEach(field => {
        this.form.get(field)?.updateValueAndValidity({ emitEvent: false });
      });
    }

    existingLotControl?.updateValueAndValidity({ emitEvent: false });
    
    console.log('After applyLotModeValidation - Form valid:', this.form.valid);
  }

  private patchLotIdentityFromSelection(lotId: number): void {
    if (this.isNewLotMode()) {
      return;
    }

    const lot = this.lots.find(item => item.idLot === lotId);
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
    if (this.isNewLotMode() || this.availableLotsForReception.length === 0) {
      return;
    }

    const availableLot = this.availableLotsForReception[0];

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
}
