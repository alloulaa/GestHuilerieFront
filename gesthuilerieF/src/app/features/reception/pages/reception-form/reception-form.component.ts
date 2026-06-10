import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
import {
    METHODE_RECOLTE_OPTIONS,
    REGION_OPTIONS,
    TYPE_SOL_OPTIONS,
    VARIETE_OPTIONS,
} from '../../../../shared/constants/domain-options';

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
    @ViewChild('datePeseeInput') datePeseeInput?: ElementRef<HTMLInputElement>;

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

    readonly varieteOptions = VARIETE_OPTIONS;
    readonly regionOptions = REGION_OPTIONS;
    readonly methodeRecolteOptions = METHODE_RECOLTE_OPTIONS;
    readonly typeSolOptions = TYPE_SOL_OPTIONS;
    readonly lavageEffectueOptions = ['Oui', 'Non'];
    readonly receptionIntervalRules = [
        { controlName: 'maturite', label: 'Maturité', min: 1, max: 5, unit: '' },
        { controlName: 'humiditePourcent', label: 'Humidité', min: 10, max: 30, unit: '%' },
        { controlName: 'aciditeOlivesPourcent', label: 'Acidité olives', min: 0.1, max: 2.5, unit: '%' },
        { controlName: 'tauxFeuillesPourcent', label: 'Feuilles', min: 0, max: 5, unit: '%' },
    ] as const;

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
            // datePesee initialisé à null — l'utilisateur doit saisir lui-même
            datePesee: [null as string | null, [Validators.required]],
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
            region: [''],
            methodeRecolte: [''],
            typeSol: [''],
            // Calculé automatiquement — désactivé pour la saisie
            tempsDepuisRecolteHeures: [{ value: 0, disabled: true }],
            humiditePourcent: [0, [Validators.min(0), Validators.max(100)]],
            aciditeOlivesPourcent: [0, [Validators.min(0), Validators.max(100)]],
            tauxFeuillesPourcent: [0, [Validators.min(0), Validators.max(100)]],
            lavageEffectue: [''],
            matierePremiereId: [null as number | null],
            campagneId: [null as string | null],
            huilerieId: [1, [Validators.required, Validators.min(1)]],
            fournisseurNom: [''],
            fournisseurCIN: ['', [Validators.required]],
        });

        // Calcul poidsNet + calcul automatique tempsDepuisRecolteHeures
        this.form.valueChanges.subscribe(values => {
            // Poids net
            const net = this.lotManagementService.calculatePoidsNet(
                Number(values.poidsBrut ?? 0),
                Number(values.poidsTare ?? 0),
            );
            this.form.get('poidsNet')?.setValue(net, { emitEvent: false });

            // Temps depuis récolte = (datePesee - dateRecolte) * 24
            const datePeseeVal = values.datePesee ? new Date(values.datePesee) : null;
            const dateRecolteVal = values.dateRecolte ? new Date(values.dateRecolte) : null;
            if (
                datePeseeVal && dateRecolteVal &&
                !isNaN(datePeseeVal.getTime()) && !isNaN(dateRecolteVal.getTime())
            ) {
                const diffHeures = Math.max(0, Math.round(
                    (datePeseeVal.getTime() - dateRecolteVal.getTime()) / 3_600_000
                ));
                this.form.get('tempsDepuisRecolteHeures')?.setValue(diffHeures, { emitEvent: false });
            } else {
                this.form.get('tempsDepuisRecolteHeures')?.setValue(0, { emitEvent: false });
            }
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

        // Revalider dateRecolte quand la campagne change
        this.form.get('campagneId')?.valueChanges.subscribe(() => {
            this.form.get('dateRecolte')?.updateValueAndValidity({ emitEvent: false });
        });

        // Initialiser la liste au démarrage
        this.loadCampagnesForHuilerie(Number(this.form.get('huilerieId')?.value) || 0);

        this.applyLotModeValidation('existing');
        this.applyReceptionIntervalValidators('existing');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('editingPesee' in changes && this.editingPesee) {
            this.applyEditPesee(this.editingPesee);
        }
    }

    get isEditMode(): boolean {
        return this.editingId !== null;
    }

    get selectedExistingLot(): LotOlives | null {
        const existingLotId = Number(this.form.get('existingLotId')?.value ?? 0);
        if (!existingLotId) {
            return null;
        }
        return this.lots.find((lot) => Number(lot.idLot) === existingLotId) ?? null;
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
            const currentCampagne = this.form.get('campagneId')?.value;
            const campagneRefs = this.campagnes.map(c => c.reference);
            if (preferredCampagneReference && campagneRefs.includes(preferredCampagneReference)) {
                this.form.patchValue({ campagneId: preferredCampagneReference }, { emitEvent: false });
            } else if (!currentCampagne || !campagneRefs.includes(currentCampagne)) {
                this.form.patchValue({ campagneId: this.campagnes[0]?.reference ?? null });
            }
            // Revalider dateRecolte avec la nouvelle campagne chargée
            this.form.get('dateRecolte')?.updateValueAndValidity({ emitEvent: false });
        });
    }

    private getHuilerieNomById(huilerieId: number): string | undefined {
        const huilerie = this.huileries.find(h => h.idHuilerie === huilerieId);
        return huilerie?.nom;
    }

    isReceptionIntervalInvalid(controlName: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    getReceptionIntervalError(controlName: string): string | null {
        const control = this.form.get(controlName);
        if (!control || !control.errors || !(control.dirty || control.touched)) {
            return null;
        }
        if (control.errors['range']) {
            const rule = this.receptionIntervalRules.find((item) => item.controlName === controlName);
            if (rule) {
                return `${rule.label} doit être comprise entre ${rule.min} et ${rule.max}${rule.unit}`.trim();
            }
        }
        return null;
    }

    getDateRecolteError(): string | null {
        const control = this.form.get('dateRecolte');
        if (!control || !control.errors || !(control.dirty || control.touched)) {
            return null;
        }
        if (control.errors['dateRecolteHorsCampagne']) {
            return control.errors['dateRecolteHorsCampagne'].message as string;
        }
        return null;
    }

    private createRangeValidator(min: number, max: number): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const rawValue = control.value;
            if (rawValue === null || rawValue === undefined || rawValue === '') {
                return null;
            }
            const value = Number(rawValue);
            if (Number.isNaN(value) || value < min || value > max) {
                return { range: { min, max, actual: rawValue } };
            }
            return null;
        };
    }

    /**
     * Validateur : dateRecolte doit être comprise entre dateDebut et dateFin
     * de la campagne sélectionnée.
     */
    private createDateRecolteValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const dateRecolteStr = control.value as string | null;
            if (!dateRecolteStr) return null;

            const campagneRef = this.form?.get('campagneId')?.value as string | null;
            const campagne = this.campagnes.find(c => c.reference === campagneRef);
            if (!campagne) return null;

            const dateRecolte = new Date(dateRecolteStr);

            // Adapter les noms de propriétés selon votre modèle CampagneOlives
            const dateDebut = (campagne as any).dateDebut
                ? new Date((campagne as any).dateDebut)
                : null;
            const dateFin = (campagne as any).dateFin
                ? new Date((campagne as any).dateFin)
                : null;

            if (dateDebut && !isNaN(dateDebut.getTime()) && dateRecolte < dateDebut) {
                return {
                    dateRecolteHorsCampagne: {
                        message: `La date de récolte doit être après le ${dateDebut.toLocaleDateString('fr-FR')} (début de campagne).`
                    }
                };
            }
            if (dateFin && !isNaN(dateFin.getTime()) && dateRecolte > dateFin) {
                return {
                    dateRecolteHorsCampagne: {
                        message: `La date de récolte doit être avant le ${dateFin.toLocaleDateString('fr-FR')} (fin de campagne).`
                    }
                };
            }

            return null;
        };
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
            const invalidFields = Object.keys(this.form.controls)
                .filter((key) => this.form.get(key)?.invalid);
            console.warn('[reception-form] invalid fields on submit:', invalidFields);
            this.form.markAllAsTouched();
            this.toastService.error('Veuillez corriger les champs invalides avant de continuer.');
            return;
        }

        const raw = this.form.getRawValue();

        const matiere = this.matieresPremieres.find(m => m.idMatierePremiere === raw.matierePremiereId);
        const campagne = this.campagnes.find(c => c.reference === raw.campagneId);

        const payload: CreatePeseeInput = {
            lotId: raw.lotMode === 'new' ? undefined : Number(raw.existingLotId ?? 0) || undefined,
            datePesee: raw.datePesee ?? '',
            pesee: Number(raw.poidsBrut),
            poidsBrut: Number(raw.poidsBrut),
            poidsTare: Number(raw.poidsTare),
            huilerieId: Number(raw.huilerieId),
            origine: String(raw.origine ?? ''),
            varieteOlive: String(raw.varieteOlive ?? ''),
            fournisseurId: undefined,
            fournisseurNom: String(raw.fournisseurNom ?? ''),
            fournisseurCIN: String(raw.fournisseurCIN ?? ''),
            maturite: String(raw.maturite ?? ''),
            dateRecolte: String(raw.dateRecolte ?? ''),
            dateReception: String(raw.dateReception ?? ''),
            region: String(raw.region ?? ''),
            methodeRecolte: String(raw.methodeRecolte ?? ''),
            typeSol: String(raw.typeSol ?? ''),
            // On envoie la valeur calculée (getRawValue() retourne aussi les champs disabled)
            tempsDepuisRecolteHeures: Number(raw.tempsDepuisRecolteHeures ?? 0),
            humiditePourcent: Number(raw.humiditePourcent ?? 0),
            aciditeOlivesPourcent: Number(raw.aciditeOlivesPourcent ?? 0),
            tauxFeuillesPourcent: Number(raw.tauxFeuillesPourcent ?? 0),
            lavageEffectue: String(raw.lavageEffectue ?? '').trim() || undefined,
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
        this.resetForm();
    }
    resetForm(): void {
        const defaultHuilerieId = this.huileries[0]?.idHuilerie ?? 1;
        this.form.reset({
            datePesee: null,
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
            region: '',
            methodeRecolte: '',
            typeSol: '',
            tempsDepuisRecolteHeures: 0,
            humiditePourcent: 0,
            aciditeOlivesPourcent: 0,
            tauxFeuillesPourcent: 0,
            lavageEffectue: '',
            matierePremiereId: this.matieresPremieres[0]?.idMatierePremiere ?? null,
            campagneId: null,
            huilerieId: defaultHuilerieId,
            fournisseurNom: '',
            fournisseurCIN: '',
        });
        this.savedReception = null;
        this.errorMessage = '';
    }
    private clearEditState(): void {
        this.editingId = null;
        this.errorMessage = '';
        this.editCleared.emit();

        const defaultHuilerieId = this.huileries[0]?.idHuilerie ?? 1;
        this.form.reset({
            // Vide — l'utilisateur doit saisir la date
            datePesee: null,
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
            region: '',
            methodeRecolte: '',
            typeSol: '',
            tempsDepuisRecolteHeures: 0,
            humiditePourcent: 0,
            aciditeOlivesPourcent: 0,
            tauxFeuillesPourcent: 0,
            lavageEffectue: '',
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
            // Appliquer quand même le validator de date même en mode existing (optionnel)
            this.form.get('dateRecolte')?.setValidators([this.createDateRecolteValidator()]);
            this.form.get('dateRecolte')?.updateValueAndValidity({ emitEvent: false });
        } else {
            existingLotControl?.clearValidators();
            this.form.get('maturite')?.setValidators([Validators.required]);
            this.form.get('dateRecolte')?.setValidators([
                Validators.required,
                this.createDateRecolteValidator(),
            ]);
            this.form.get('dateReception')?.setValidators([Validators.required]);
            const matiereControl = this.form.get('matierePremiereId');
            const campagneControl = this.form.get('campagneId');
            matiereControl?.setValidators([Validators.required, Validators.min(1)]);
            campagneControl?.setValidators([Validators.required]);
            newLotFields.forEach(field => {
                this.form.get(field)?.updateValueAndValidity({ emitEvent: false });
            });
        }
        existingLotControl?.updateValueAndValidity({ emitEvent: false });

        this.applyReceptionIntervalValidators(mode);
    }

    private applyReceptionIntervalValidators(mode: 'existing' | 'new'): void {
        const validatorsByControl: Record<string, ValidatorFn[]> = {
            maturite: mode === 'new'
                ? [Validators.required, this.createRangeValidator(1, 5)]
                : [this.createRangeValidator(1, 5)],
            humiditePourcent: [this.createRangeValidator(10, 30)],
            aciditeOlivesPourcent: [this.createRangeValidator(0.1, 2.5)],
            tauxFeuillesPourcent: [this.createRangeValidator(0, 5)],
        };

        Object.entries(validatorsByControl).forEach(([controlName, validators]) => {
            const control = this.form.get(controlName);
            if (!control) return;
            control.setValidators(validators);
            control.updateValueAndValidity({ emitEvent: false });
        });
    }

    private patchLotIdentityFromSelection(lotId: number): void {
        if (this.isNewLotMode()) return;
        const lot = this.lots.find(item => item.idLot === lotId);
        if (!lot) return;
        this.form.patchValue(
            {
                origine: lot.origine,
                varieteOlive: lot.varieteOlive,
                region: lot.region,
                methodeRecolte: lot.methodeRecolte,
                typeSol: lot.typeSol,
                humiditePourcent: lot.humiditePourcent ?? 0,
                aciditeOlivesPourcent: lot.aciditeOlivesPourcent ?? 0,
                tauxFeuillesPourcent: lot.tauxFeuillesPourcent ?? 0,
                lavageEffectue: lot.lavageEffectue ?? '',
                fournisseurNom: lot.fournisseurNom ?? null,
                fournisseurCIN: lot.fournisseurCIN ?? null,
            },
            { emitEvent: false },
        );
        // Recalculer le temps après patch (datePesee peut déjà être saisie)
        this.recalculerTempsDepuisRecolte();
    }

    private syncHuilerieAndCampagneFromMatiere(matiereId: number): void {
        if (!Number.isFinite(matiereId) || matiereId <= 0) return;

        const matiere = this.matieresPremieres.find((item) => Number(item.idMatierePremiere) === matiereId);
        if (!matiere) return;

        const resolvedHuilerieId = this.resolveHuilerieIdFromMatiere(matiere);
        if (!resolvedHuilerieId) return;

        const currentHuilerieId = Number(this.form.get('huilerieId')?.value ?? 0);
        if (currentHuilerieId === resolvedHuilerieId) {
            this.loadCampagnesForHuilerie(resolvedHuilerieId);
            return;
        }

        this.form.patchValue({ huilerieId: resolvedHuilerieId }, { emitEvent: false });
        this.loadCampagnesForHuilerie(resolvedHuilerieId);
    }

    private resolveHuilerieIdFromMatiere(matiere: MatierePremiere): number | null {
        const directHuilerieId = Number(matiere.huilerieId ?? 0);
        if (directHuilerieId > 0) return directHuilerieId;

        const huilerieNom = String(matiere.huilerieNom ?? '').trim().toLowerCase();
        if (!huilerieNom) return null;

        const match = this.huileries.find((h) => String(h.nom ?? '').trim().toLowerCase() === huilerieNom);
        return match?.idHuilerie ?? null;
    }

    private applyEditPesee(pesee: Pesee): void {
        const idLot = Number(pesee?.lotId ?? 0);
        if (!idLot) return;

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
            region: String(lot?.region ?? this.form.get('region')?.value ?? ''),
            methodeRecolte: String(lot?.methodeRecolte ?? this.form.get('methodeRecolte')?.value ?? ''),
            typeSol: String(lot?.typeSol ?? this.form.get('typeSol')?.value ?? ''),
            humiditePourcent: Number(lot?.humiditePourcent ?? this.form.get('humiditePourcent')?.value ?? 0),
            aciditeOlivesPourcent: Number(lot?.aciditeOlivesPourcent ?? this.form.get('aciditeOlivesPourcent')?.value ?? 0),
            tauxFeuillesPourcent: Number(lot?.tauxFeuillesPourcent ?? this.form.get('tauxFeuillesPourcent')?.value ?? 0),
            lavageEffectue: String(lot?.lavageEffectue ?? this.form.get('lavageEffectue')?.value ?? ''),
            fournisseurNom: lot?.fournisseurNom ?? this.form.get('fournisseurNom')?.value ?? null,
            fournisseurCIN: lot?.fournisseurCIN ?? this.form.get('fournisseurCIN')?.value ?? null,
            matierePremiereId: matiereId,
            campagneId: campagneReference,
            huilerieId,
        } as any);

        // Recalculer le temps après avoir patchné toutes les dates
        this.recalculerTempsDepuisRecolte();
        this.loadCampagnesForHuilerie(huilerieId, campagneReference);
        this.focusFirstEditableField();
    }

    /**
     * Recalcule tempsDepuisRecolteHeures manuellement (hors valueChanges).
     * Utile après un patchValue avec emitEvent: false.
     */
    private recalculerTempsDepuisRecolte(): void {
        const datePeseeStr = this.form.get('datePesee')?.value as string | null;
        const dateRecolteStr = this.form.get('dateRecolte')?.value as string | null;
        if (datePeseeStr && dateRecolteStr) {
            const dp = new Date(datePeseeStr);
            const dr = new Date(dateRecolteStr);
            if (!isNaN(dp.getTime()) && !isNaN(dr.getTime())) {
                const diffH = Math.max(0, Math.round((dp.getTime() - dr.getTime()) / 3_600_000));
                this.form.get('tempsDepuisRecolteHeures')?.setValue(diffH, { emitEvent: false });
                return;
            }
        }
        this.form.get('tempsDepuisRecolteHeures')?.setValue(0, { emitEvent: false });
    }

    private focusFirstEditableField(): void {
        window.requestAnimationFrame(() => {
            this.datePeseeInput?.nativeElement.focus();
        });
    }

    private resolveMatiereIdFromReference(reference: string | null | undefined): number | null {
        const normalizedReference = String(reference ?? '').trim().toLowerCase();
        if (!normalizedReference) return null;

        const match = this.matieresPremieres.find((item) =>
            String(item.reference ?? '').trim().toLowerCase() === normalizedReference,
        );
        return match?.idMatierePremiere ?? null;
    }

    private selectDefaultLot(): void {
        if (this.isNewLotMode()) return;

        if (this.availableLotsForReception.length === 0) {
            this.form.patchValue({ lotMode: 'new', existingLotId: null }, { emitEvent: false });
            this.applyLotModeValidation('new');
            return;
        }
        const availableLot = this.availableLotsForReception[0];
        if (availableLot) {
            this.form.patchValue(
                {
                    existingLotId: availableLot.idLot,
                    origine: availableLot.origine,
                    varieteOlive: availableLot.varieteOlive,
                    region: availableLot.region,
                    methodeRecolte: availableLot.methodeRecolte,
                    typeSol: availableLot.typeSol,
                    humiditePourcent: availableLot.humiditePourcent ?? 0,
                    aciditeOlivesPourcent: availableLot.aciditeOlivesPourcent ?? 0,
                    tauxFeuillesPourcent: availableLot.tauxFeuillesPourcent ?? 0,
                    fournisseurNom: availableLot.fournisseurNom ?? null,
                    fournisseurCIN: availableLot.fournisseurCIN ?? null,
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