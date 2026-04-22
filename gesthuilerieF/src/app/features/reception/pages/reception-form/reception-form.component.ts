import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { CampagneService } from '../../../campagnes/services/campagne.service';
import { CampagneOlives } from '../../../campagnes/models/campagne.models';
import { LotOlives } from '../../../lots/models/lot.models';
import { CreatePeseeInput, LotManagementService } from '../../../lots/services/lot-management.service';
import { Pesee } from '../../../stock/models/stock.models';
import { WeighingService } from '../../../stock/services/weighing.service';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { RawMaterialService } from '../../../matieres-premieres/services/raw-material.service';
import { MatierePremiere } from '../../../matieres-premieres/models/raw-material.models';
import { ToastService } from '../../../../core/services/toast.service';

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
export class ReceptionFormComponent implements OnInit, OnChanges {
    @Input() editingPesee: Pesee | null = null;
    @Output() editCleared = new EventEmitter<void>();

    lots: LotOlives[] = [];
    weighings: Pesee[] = [];
    availableLotsForReception: LotOlives[] = [];
    huileries: Huilerie[] = [];
    matieresPremieres: MatierePremiere[] = [];
    campagnes: CampagneOlives[] = [];
    errorMessage = '';
    showSaveSuccessPopup = false;
    savedReception: Pesee | null = null;
    editingId: number | null = null;

    readonly form;

    constructor(
        private formBuilder: FormBuilder,
        private lotManagementService: LotManagementService,
        private weighingService: WeighingService,
        private router: Router,
        private huilerieService: HuilerieService,
        private rawMaterialService: RawMaterialService,
        private toastService: ToastService,
        private campagneService: CampagneService,
    ) {
        this.form = this.formBuilder.group({
            datePesee: [new Date().toISOString().slice(0, 16), [Validators.required]],
            poidsBrut: [null, [Validators.required, Validators.min(1)]],
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
            fournisseurNom: [''],
            fournisseurCIN: [''],
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

        this.form.get('matierePremiereId')?.valueChanges.subscribe(id => {
            this.syncHuilerieAndCampagneFromMatiere(Number(id));
        });

        // Chargement dynamique des campagnes selon la huilerie sélectionnée
        this.form.get('huilerieId')?.valueChanges.subscribe(huilerieId => {
            this.loadCampagnesForHuilerie(Number(huilerieId));
        });

        // Initialiser la liste au démarrage
        this.loadCampagnesForHuilerie(Number(this.form.get('huilerieId')?.value) || 0);

        this.applyLotModeValidation('existing');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('editingPesee' in changes && this.editingPesee) {
            this.applyEditPesee(this.editingPesee);
        }
    }

    get isEditMode(): boolean {
        return this.editingId !== null;
    }

    private loadCampagnesForHuilerie(huilerieId: number, preferredCampagneReference?: string | null): void {
        if (!huilerieId) {
            this.campagnes = [];
            this.form.patchValue({ campagneId: null });
            return;
        }
        const huilerieNom = this.getHuilerieNomById(huilerieId);
        this.campagneService.getAll(undefined, huilerieNom).subscribe(campagnes => {
            this.campagnes = campagnes;
            // Si la campagne sélectionnée n'est plus valide, on la réinitialise
            const currentCampagne = this.form.get('campagneId')?.value;
            const campagneRefs = this.campagnes.map(c => c.reference);
            if (preferredCampagneReference && campagneRefs.includes(preferredCampagneReference)) {
                this.form.patchValue({ campagneId: preferredCampagneReference }, { emitEvent: false });
            } else if (!currentCampagne || !campagneRefs.includes(currentCampagne)) {
                this.form.patchValue({ campagneId: this.campagnes[0]?.reference ?? null });
            }
        });
    }

    private getHuilerieNomById(huilerieId: number): string | undefined {
        const huilerie = this.huileries.find(h => h.idHuilerie === huilerieId);
        return huilerie?.nom;
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

            // Set default matière première
            if (this.matieresPremieres.length > 0) {
                const currentMatiereId = this.form.get('matierePremiereId')?.value;
                if (!currentMatiereId || !this.matieresPremieres.some((m) => m.idMatierePremiere === currentMatiereId)) {
                    const defaultMatiereId = this.matieresPremieres[0].idMatierePremiere;
                    this.form.patchValue({ matierePremiereId: defaultMatiereId });
                }
            }

            const selectedMatiereId = Number(this.form.get('matierePremiereId')?.value ?? 0);
            if (selectedMatiereId > 0) {
                this.syncHuilerieAndCampagneFromMatiere(selectedMatiereId);
            }
        });

        this.lotManagementService.loadInitialData().subscribe(() => {
            this.lotManagementService.lots$.subscribe(data => {
                this.lots = data;
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
            this.toastService.error('Veuillez corriger les champs invalides avant de continuer.');
            return;
        }

        const raw = this.form.getRawValue();

        const matiere = this.matieresPremieres.find(m => m.idMatierePremiere === raw.matierePremiereId);
        const campagne = this.campagnes.find(c => c.reference === raw.campagneId);

        const payload: CreatePeseeInput = {
            datePesee: raw.datePesee ?? new Date().toISOString(),
            pesee: Number(raw.poidsBrut),
            poidsBrut: Number(raw.poidsBrut),
            poidsTare: Number(raw.poidsTare),
            huilerieId: Number(raw.huilerieId),
            origine: String(raw.origine ?? ''),
            varieteOlive: String(raw.varieteOlive ?? ''),
            fournisseurNom: String(raw.fournisseurNom ?? ''),
            fournisseurCIN: String(raw.fournisseurCIN ?? ''),
            maturite: String(raw.maturite ?? ''),
            dateRecolte: String(raw.dateRecolte ?? ''),
            dateReception: String(raw.dateReception ?? ''),
            dureeStockageAvantBroyage: Number(raw.dureeStockageAvantBroyage),
            matierePremiereReference: matiere?.reference ?? '',
            campagneReference: campagne?.reference ?? '',
        };

        const request$ = this.isEditMode && this.editingId !== null
            ? this.lotManagementService.updatePesee(this.editingId, payload)
            : this.lotManagementService.createPesee(payload);

        request$.subscribe({
            next: result => {
                if (this.isEditMode) {
                    this.toastService.success('Réception mise à jour avec succès.');
                    this.clearEditState();
                    return;
                }

                this.savedReception = result;
                this.showSaveSuccessPopup = true;
                this.toastService.success('Réception enregistrée avec succès.');
                // Ne pas rediriger, afficher le popup pour téléchargement PDF
            },
            error: errorResponse => {
                this.errorMessage =
                    errorResponse?.error?.message ??
                    errorResponse?.error?.error ??
                    errorResponse?.message ??
                    'Erreur de validation.';
                this.toastService.error(this.errorMessage);
            },
        });
    }

    cancelEdit(): void {
        this.clearEditState();
    }

    onPopupGeneratePdf(): void {
        this.generateReceptionPdf();
        this.closePopupAndGoToList();
    }

    onPopupSkipPdf(): void {
        this.closePopupAndGoToList();
    }

    private closePopupAndGoToList(): void {
        this.showSaveSuccessPopup = false;
        this.router.navigateByUrl('/pages/reception');
    }

    private clearEditState(): void {
        this.editingId = null;
        this.errorMessage = '';
        this.editCleared.emit();

        const defaultHuilerieId = this.huileries[0]?.idHuilerie ?? 1;
        this.form.reset({
            datePesee: new Date().toISOString().slice(0, 16),
            poidsBrut: null,
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
            matierePremiereId: this.matieresPremieres[0]?.idMatierePremiere ?? null,
            campagneId: null,
            huilerieId: defaultHuilerieId,
            fournisseurNom: '',
            fournisseurCIN: '',
        });
    }

    private generateReceptionPdf(): void {
        const lotId = this.savedReception?.lotId || this.savedReception?.idLotArrivage;
        if (!lotId) {
            this.toastService.error('Impossible de générer le PDF : identifiant du lot manquant.');
            return;
        }
        this.weighingService.generateBonPeseePdf(lotId).subscribe({
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
                this.toastService.error(this.errorMessage);
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
            const matiereControl = this.form.get('matierePremiereId');
            const campagneControl = this.form.get('campagneId');
            matiereControl?.setValidators([Validators.required, Validators.min(1)]);
            campagneControl?.setValidators([Validators.required]);
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

    private syncHuilerieAndCampagneFromMatiere(matiereId: number): void {
        if (!Number.isFinite(matiereId) || matiereId <= 0) {
            return;
        }

        const matiere = this.matieresPremieres.find((item) => Number(item.idMatierePremiere) === matiereId);
        if (!matiere) {
            return;
        }

        const resolvedHuilerieId = this.resolveHuilerieIdFromMatiere(matiere);
        if (!resolvedHuilerieId) {
            return;
        }

        const currentHuilerieId = Number(this.form.get('huilerieId')?.value ?? 0);
        if (currentHuilerieId === resolvedHuilerieId) {
            this.loadCampagnesForHuilerie(resolvedHuilerieId);
            return;
        }

        this.form.patchValue({ huilerieId: resolvedHuilerieId });
    }

    private resolveHuilerieIdFromMatiere(matiere: MatierePremiere): number | null {
        const directHuilerieId = Number(matiere.huilerieId ?? 0);
        if (directHuilerieId > 0) {
            return directHuilerieId;
        }

        const huilerieNom = String(matiere.huilerieNom ?? '').trim().toLowerCase();
        if (!huilerieNom) {
            return null;
        }

        const match = this.huileries.find((h) => String(h.nom ?? '').trim().toLowerCase() === huilerieNom);
        return match?.idHuilerie ?? null;
    }

    private applyEditPesee(pesee: Pesee): void {
        const idLot = Number(pesee?.lotId ?? 0);
        if (!idLot) {
            return;
        }

        this.editingId = idLot;

        const lot = this.lots.find((item) => Number(item.idLot) === Number(pesee.lotId));
        const matiereId = this.resolveMatiereIdFromReference(pesee.matierePremiereReference);
        const huilerieId = Number(pesee.huilerieId ?? lot?.huilerieId ?? this.form.get('huilerieId')?.value ?? 1);
        const campagneReference = String(pesee.campagneReference ?? '').trim() || null;

        this.form.patchValue({
            datePesee: String(pesee.datePesee ?? '').slice(0, 16),
            poidsBrut: Number(pesee.poidsBrut ?? pesee.pesee ?? 0),
            poidsTare: Number(pesee.poidsTare ?? 0),
            origine: String(lot?.origine ?? this.form.get('origine')?.value ?? ''),
            varieteOlive: String(lot?.varieteOlive ?? this.form.get('varieteOlive')?.value ?? ''),
            maturite: String(lot?.maturite ?? this.form.get('maturite')?.value ?? ''),
            dateRecolte: String(lot?.dateRecolte ?? this.form.get('dateRecolte')?.value ?? ''),
            dateReception: String(lot?.dateReception ?? this.form.get('dateReception')?.value ?? ''),
            dureeStockageAvantBroyage: Number(lot?.dureeStockageAvantBroyage ?? this.form.get('dureeStockageAvantBroyage')?.value ?? 1),
            matierePremiereId: matiereId,
            campagneId: campagneReference,
            fournisseurNom: String(pesee.fournisseurNom ?? lot?.fournisseurNom ?? ''),
            fournisseurCIN: String(pesee.fournisseurCIN ?? lot?.fournisseurCIN ?? ''),
            huilerieId,
        } as any);

        this.loadCampagnesForHuilerie(huilerieId, campagneReference);
    }

    private resolveMatiereIdFromReference(reference: string | null | undefined): number | null {
        const normalizedReference = String(reference ?? '').trim().toLowerCase();
        if (!normalizedReference) {
            return null;
        }

        const match = this.matieresPremieres.find((item) =>
            String(item.reference ?? '').trim().toLowerCase() === normalizedReference,
        );

        return match?.idMatierePremiere ?? null;
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
}

