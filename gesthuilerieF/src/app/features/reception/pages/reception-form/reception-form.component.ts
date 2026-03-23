import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LotOlives } from '../../../lots/models/lot.models';
import { CreatePeseeInput, LotManagementService } from '../../../lots/services/lot-management.service';
import { Pesee } from '../../../stock/models/stock.models';

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
  errorMessage = '';
  showSaveSuccessPopup = false;
  savedReception: Pesee | null = null;

  readonly form;

  constructor(
    private formBuilder: FormBuilder,
    private lotManagementService: LotManagementService,
    private router: Router,
  ) {
    this.form = this.formBuilder.group({
      datePesee: [new Date().toISOString().slice(0, 16), [Validators.required]],
      poidsBrut: [0, [Validators.required, Validators.min(0)]],
      poidsTare: [0, [Validators.required, Validators.min(0)]],
      poidsNet: [{ value: 0, disabled: true }, [Validators.required]],
      lotMode: ['existing', [Validators.required]],
      existingLotId: [31, [Validators.required]],
      origine: ['Meknes', [Validators.required]],
      varieteOlive: ['Picholine Morocaine', [Validators.required]],
      maturite: ['Vert tendre', [Validators.required]],
      dateRecolte: [new Date().toISOString().slice(0, 10), [Validators.required]],
      dateReception: [new Date().toISOString().slice(0, 10), [Validators.required]],
      dureeStockageAvantBroyage: [1, [Validators.required, Validators.min(0)]],
      matierePremiereId: [1, [Validators.required, Validators.min(1)]],
      campagneId: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
      huilerieId: [1, [Validators.required]],
    });

    this.form.valueChanges.subscribe(values => {
      const net = this.lotManagementService.calculatePoidsNet(
        Number(values.poidsBrut ?? 0),
        Number(values.poidsTare ?? 0),
      );
      this.form.get('poidsNet')?.setValue(net, { emitEvent: false });
    });

    this.form.get('existingLotId')?.valueChanges.subscribe(id => {
      if (this.isNewLotMode()) {
        return;
      }
      const lot = this.lots.find(item => item.idLot === Number(id));
      if (!lot) {
        return;
      }
      this.form.patchValue({ origine: lot.origine, varieteOlive: lot.varieteOlive });
    });
  }

  ngOnInit(): void {
    this.lotManagementService.loadInitialData().subscribe(() => {
      this.lotManagementService.lots$.subscribe(data => {
        this.lots = data;
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
      existingLotId: Number(raw.existingLotId),
      origine: String(raw.origine ?? ''),
      varieteOlive: String(raw.varieteOlive ?? ''),
      newLotDetails:
        raw.lotMode === 'new'
          ? {
            maturite: String(raw.maturite ?? ''),
            dateRecolte: String(raw.dateRecolte ?? ''),
            dateReception: String(raw.dateReception ?? ''),
            dureeStockageAvantBroyage: Number(raw.dureeStockageAvantBroyage),
            matierePremiereId: Number(raw.matierePremiereId),
            campagneId: Number(raw.campagneId),
          }
          : undefined,
    };

    this.lotManagementService.createPesee(payload).subscribe({
      next: result => {
        this.savedReception = result.pesee;
        this.showSaveSuccessPopup = true;
      },
      error: errorResponse => {
        this.errorMessage = errorResponse?.message ?? 'Erreur de validation.';
      },
    });
  }

  onPopupGeneratePdf(): void {
    if (this.savedReception) {
      this.generateReceptionPdf(this.savedReception);
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

  private generateReceptionPdf(reception: Pesee): void {
    const html = `
      <html>
      <head>
        <title>Reception ${reception.idPesee}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; }
          h1 { margin: 0 0 12px; }
          .line { margin: 6px 0; }
        </style>
      </head>
      <body>
        <h1>Fiche Reception</h1>
        <div class="line">ID reception: ${reception.idPesee}</div>
        <div class="line">Date: ${reception.datePesee}</div>
        <div class="line">Lot: ${reception.lotId}</div>
        <div class="line">Poids brut: ${reception.poidsBrut} kg</div>
        <div class="line">Poids tare: ${reception.poidsTare} kg</div>
        <div class="line">Poids net: ${reception.poidsNet} kg</div>
        <div class="line">Huilerie: ${reception.huilerieId}</div>
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
}
