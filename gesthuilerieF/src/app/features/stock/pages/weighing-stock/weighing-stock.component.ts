import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbCardModule, NbInputModule, NbButtonModule, NbSelectModule } from '@nebular/theme';
import { Pesee, StockMovement } from '../../models/stock.models';
import { LotOlives } from '../../../lots/models/lot.models';
import { CreatePeseeInput, LotManagementService } from '../../../lots/services/lot-management.service';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { RawMaterialService } from '../../../matieres-premieres/services/raw-material.service';
import { MatierePremiere } from '../../../matieres-premieres/models/raw-material.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-weighing-stock',
  templateUrl: './weighing-stock.component.html',
  styleUrls: ['./weighing-stock.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    NbSelectModule,
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class WeighingStockComponent implements OnInit {
  weighings: Pesee[] = [];
  movements: StockMovement[] = [];
  lots: LotOlives[] = [];
  availableLotsForReception: LotOlives[] = [];
  huileries: Huilerie[] = [];
  matieresPremieres: MatierePremiere[] = [];
  campagnes: number[] = [];
  errorMessage = '';

  readonly weighingForm;

  constructor(
    private formBuilder: FormBuilder,
    private lotManagementService: LotManagementService,
    private huilerieService: HuilerieService,
    private rawMaterialService: RawMaterialService,
  ) {
    this.weighingForm = this.formBuilder.group({
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
      huilerieId: [1, [Validators.required]],
    });

    this.weighingForm.valueChanges.subscribe(values => {
      const brut = Number(values.poidsBrut ?? 0);
      const tare = Number(values.poidsTare ?? 0);
      const net = this.lotManagementService.calculatePoidsNet(brut, tare);
      this.weighingForm.get('poidsNet')?.setValue(net, { emitEvent: false });
    });

    this.weighingForm.get('lotMode')?.valueChanges.subscribe(mode => {
      this.applyLotModeValidation(mode === 'new' ? 'new' : 'existing');
    });

    this.weighingForm.get('existingLotId')?.valueChanges.subscribe(lotId => {
      this.patchLotIdentityFromSelection(Number(lotId));
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

      const selectedHuilerieId = Number(this.weighingForm.get('huilerieId')?.value);
      if (!this.huileries.some((h) => h.idHuilerie === selectedHuilerieId) && this.huileries.length > 0) {
        this.weighingForm.patchValue({ huilerieId: this.huileries[0].idHuilerie });
      }

      const selectedMatiereId = Number(this.weighingForm.get('matierePremiereId')?.value);
      if (!this.matieresPremieres.some((m) => m.idMatierePremiere === selectedMatiereId) && this.matieresPremieres.length > 0) {
        const firstMaterial = this.matieresPremieres[0];
        this.weighingForm.patchValue({ matierePremiereId: firstMaterial.idMatierePremiere });
      }
    });

    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.lots$.subscribe((data: LotOlives[]) => {
        this.lots = data;
        this.campagnes = Array.from(new Set(this.lots.map((lot) => Number(lot.campagneId)).filter((id) => !Number.isNaN(id) && id > 0))).sort((a, b) => b - a);
        this.computeAvailableLots();
        this.selectDefaultLot();
      });
      this.lotManagementService.weighings$.subscribe((data: Pesee[]) => {
        this.weighings = data;
        this.computeAvailableLots();
        this.selectDefaultLot();
      });

      this.patchLotIdentityFromSelection(Number(this.weighingForm.get('existingLotId')?.value));
    });
  }

  submitWeighing(): void {
    alert('submitWeighing called');
    console.log('submitWeighing called');

    this.errorMessage = '';

    if (this.weighingForm.invalid) {
      this.weighingForm.markAllAsTouched();
      return;
    }

    const raw = this.weighingForm.getRawValue();

    const input: CreatePeseeInput = {
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

    this.lotManagementService.createPesee(input).subscribe({
      next: result => {
        this.weighingForm.patchValue({
          poidsBrut: 0,
          poidsTare: 0,
          poidsNet: 0,
          datePesee: new Date().toISOString().slice(0, 16),
          lotMode: 'existing',
          existingLotId: result.lotId,
        });

        this.patchLotIdentityFromSelection(result.lotId);
      },
      error: errorResponse => {
        this.errorMessage =
          errorResponse?.error?.message ??
          errorResponse?.message ??
          'Erreur de validation metier.';
      },
    });
    console.log('form valid =', this.weighingForm.valid);
    console.log('raw =', this.weighingForm.getRawValue());
  }

  movementLabel(type: StockMovement['typeMouvement']): string {
    if (type === 'ARRIVAL') {
      return 'Entree';
    }
    if (type === 'DEPARTURE') {
      return 'Sortie';
    }
    if (type === 'TRANSFER') {
      return 'Transfert';
    }
    return 'Ajustement';
  }

  isNewLotMode(): boolean {
    return this.weighingForm.get('lotMode')?.value === 'new';
  }

  exportReceiptPdf(pesee: Pesee): void {
    const html = `
      <html>
      <head>
        <title>Recu pesee ${pesee.idPesee}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; }
          h1 { margin: 0 0 12px; }
          .line { margin: 6px 0; }
        </style>
      </head>
      <body>
<h1>Recu de pesee</h1>
        <div class="line">ID pesee: ${pesee.idPesee}</div>
        <div class="line">Date: ${pesee.datePesee}</div>
        <div class="line">Lot: ${pesee.lotId}</div>
        <div class="line">Poids brut: ${pesee.poidsBrut} kg</div>
        <div class="line">Poids tare: ${pesee.poidsTare} kg</div>
        <div class="line">Poids net: ${pesee.poidsNet} kg</div>
      </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  private applyLotModeValidation(mode: 'existing' | 'new'): void {
    const existingLotControl = this.weighingForm.get('existingLotId');
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
        const control = this.weighingForm.get(field);
        control?.clearValidators();
        control?.updateValueAndValidity({ emitEvent: false });
      });
    } else {
      existingLotControl?.clearValidators();

      this.weighingForm.get('maturite')?.setValidators([Validators.required]);
      this.weighingForm.get('dateRecolte')?.setValidators([Validators.required]);
      this.weighingForm.get('dateReception')?.setValidators([Validators.required]);
      this.weighingForm.get('dureeStockageAvantBroyage')?.setValidators([Validators.required, Validators.min(0)]);
      this.weighingForm.get('matierePremiereId')?.setValidators([Validators.required, Validators.min(1)]);
      this.weighingForm.get('campagneId')?.setValidators([Validators.required, Validators.min(2000)]);

      newLotFields.forEach(field => {
        this.weighingForm.get(field)?.updateValueAndValidity({ emitEvent: false });
      });
    }

    existingLotControl?.updateValueAndValidity({ emitEvent: false });
  }

  private patchLotIdentityFromSelection(lotId: number): void {
    if (this.weighingForm.get('lotMode')?.value !== 'existing') {
      return;
    }

    const lot = this.lots.find(item => item.idLot === lotId);
    if (!lot) {
      return;
    }

    this.weighingForm.patchValue(
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
      this.weighingForm.patchValue(
        {
          existingLotId: availableLot.idLot,
          origine: availableLot.origine,
          varieteOlive: availableLot.varieteOlive,
        },
        { emitEvent: false },
      );
      return;
    }

    this.weighingForm.patchValue({ lotMode: 'new', existingLotId: null }, { emitEvent: false });
    this.applyLotModeValidation('new');
  }

  private computeAvailableLots(): void {
    const receivedLotIds = new Set(this.weighings.map((pesee) => Number(pesee.lotId)).filter((id) => !Number.isNaN(id)));
    this.availableLotsForReception = this.lots.filter((lot) => !receivedLotIds.has(Number(lot.idLot)));
  }

}
