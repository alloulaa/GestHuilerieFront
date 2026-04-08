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
  campagnes: number[] = [];
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
      matierePremiereId: [1, [Validators.required, Validators.min(1)]],
      campagneId: [new Date().getFullYear()],
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

      const selectedHuilerieId = Number(this.form.get('huilerieId')?.value);
      if (!this.huileries.some((h) => h.idHuilerie === selectedHuilerieId) && this.huileries.length > 0) {
        this.form.patchValue({ huilerieId: this.huileries[0].idHuilerie });
      }

      const selectedMatiereId = Number(this.form.get('matierePremiereId')?.value);
      if (!this.matieresPremieres.some((m) => m.idMatierePremiere === selectedMatiereId) && this.matieresPremieres.length > 0) {
        const firstMaterial = this.matieresPremieres[0];
        this.form.patchValue({ matierePremiereId: firstMaterial.idMatierePremiere });
      }
    });

    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.lots$.subscribe(data => {
        this.lots = data;
        this.campagnes = Array.from(new Set(this.lots.map((lot) => Number(lot.campagneId)).filter((id) => !Number.isNaN(id) && id > 0))).sort((a, b) => b - a);
        this.computeAvailableLots();
        this.selectDefaultLot();
      });

      this.lotManagementService.weighings$.subscribe(data => {
        this.weighings = data;
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

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

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
            campagneId: Number(raw.campagneId),
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
    if (this.savedReception?.idPesee != null) {
      this.generateReceptionPdf(this.savedReception.idPesee);
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

  private generateReceptionPdf(peseeId: number): void {
    this.weighingService.generateBonPeseePdf(peseeId).subscribe({
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

      newLotFields.forEach(field => {
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
      this.form.get('campagneId')?.setValidators([Validators.required, Validators.min(2000)]);

      newLotFields.forEach(field => {
        this.form.get(field)?.updateValueAndValidity({ emitEvent: false });
      });
    }

    existingLotControl?.updateValueAndValidity({ emitEvent: false });
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
}
