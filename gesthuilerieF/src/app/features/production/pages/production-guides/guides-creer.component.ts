import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef, OnDestroy } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule, NbSelectModule } from '@nebular/theme';
import { Subscription } from 'rxjs';
import { Huilerie, Machine } from '../../../machines/models/enterprise.models';
import { ParameterValidationService } from '../../../../shared/services/parameter-validation.service';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { MachineService } from '../../../machines/services/machine.service';
import { EtapeProduction, ParametreEtape } from '../../models/production.models';
import { GuideProductionService } from '../../services/guide-production.service';
import { TYPE_MACHINE_OPTIONS, buildGuideStepTemplates, buildSeparationStepForExtractionType } from '../../../../shared/constants/domain-options';

@Component({
  selector: 'app-guides-creer',
  standalone: true,
  templateUrl: './guides-creer.component.html',
  styleUrls: ['./production-guides.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, NbCardModule, NbButtonModule, NbInputModule, NbSelectModule],
})
export class GuidesCreerComponent implements OnInit, OnDestroy {
  huileries: Huilerie[] = [];
  allMachines: Machine[] = [];
  readonly typeMachineOptions = TYPE_MACHINE_OPTIONS;

  guideMessage = '';
  guideError = '';
  submittingGuide = false;

  // Lazy-load cache: codeEtape -> filtered machines
  private machinesCacheByStep = new Map<string, Machine[]>();
  private loadingStepsCache = new Set<string>();

  private etapesSubscription?: Subscription;
  private currentTypeMachine: string | null = null;

  readonly fixedParametreOptions: Array<{
    code: string;
    unite: string;
    description: string;
    valeur: string;
    min: number;
    max: number;
    step: string;
    inputType: 'number';
  }> = [
      {
        code: 'vitesse_decanteur_tr_min',
        unite: 'tr/min',
        description: 'Vitesse du décanteur',
        valeur: '3200',
        min: 3000,
        max: 3400,
        step: '1',
        inputType: 'number',
      },
      {
        code: 'pression_extraction_bar',
        unite: 'bar',
        description: "Pression d'extraction",
        valeur: '250',
        min: 50,
        max: 350,
        step: '1',
        inputType: 'number',
      },
      {
        code: 'temperature_malaxage_c',
        unite: 'C',
        description: 'Température de malaxage',
        valeur: '27',
        min: 24,
        max: 27,
        step: '0.1',
        inputType: 'number',
      },
      {
        code: 'duree_malaxage_min',
        unite: 'min',
        description: 'Durée de malaxage',
        valeur: '40',
        min: 25,
        max: 40,
        step: '1',
        inputType: 'number',
      },
      {
        code: 'presence_eau',
        unite: '',
        description: 'Présence eau',
        valeur: '1',
        min: 0,
        max: 1,
        step: '1',
        inputType: 'number',
      },
      {
        code: 'presence_separateur',
        unite: '',
        description: 'Présence séparateur',
        valeur: '1',
        min: 0,
        max: 1,
        step: '1',
        inputType: 'number',
      },
    ];
  readonly customParametreCode = 'autre';

  readonly guideParameterHelp = [
    { code: 'vitesse_decanteur_tr_min', label: 'Vitesse du décanteur', min: 3000, max: 3400, unite: 'tr/min' },
    { code: 'pression_extraction_bar', label: "Pression d'extraction", min: 50, max: 350, unite: 'bar' },
    { code: 'temperature_malaxage_c', label: 'Température de malaxage', min: 24, max: 27, unite: 'C' },
    { code: 'duree_malaxage_min', label: 'Durée de malaxage', min: 25, max: 40, unite: 'min' },
  ] as const;

  readonly guideForm;

  // intervals from shared validation rules (valeurs réelles)
  executionParameterRanges: Array<{ label: string; min: number; max: number; unite?: string }> = [];

  constructor(
    private fb: FormBuilder,
    @Inject(forwardRef(() => GuideProductionService))
    private guideProductionService: GuideProductionService,
    @Inject(forwardRef(() => HuilerieService))
    private huilerieService: HuilerieService,
    @Inject(forwardRef(() => MachineService))
    private machineService: MachineService,
    private parameterValidationService: ParameterValidationService,
  ) {
    this.guideForm = this.fb.group({
      nom: ['', [Validators.required]],
      description: ['', [Validators.required]],
      dateCreation: [this.today(), [Validators.required]],
      huilerieId: [null, [Validators.required]],
      typeMachine: this.fb.control<string | null>(null, { validators: [Validators.required] }),
      etapes: this.fb.array([
      ]),
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.loadExecutionParameterRanges();
  }

  private loadExecutionParameterRanges(): void {
    try {
      const dict = this.parameterValidationService.getExecutionParameters();
      if (dict && typeof dict === 'object') {
        // Only keep the four parameters we want (in specified order)
        const allowedKeys = ['vitesse.*décanteur', 'pression', 'température', 'durée.*malaxage'];
        const ranges = allowedKeys
          .filter((k) => Object.prototype.hasOwnProperty.call(dict, k))
          .map((k) => {
            const item: any = (dict as any)[k];
            return {
              label: item?.name || 'Paramètre',
              min: item?.min ?? 0,
              max: item?.max ?? 100,
              unite: '',
            };
          });
        this.executionParameterRanges = ranges;
        console.log('[guides-creer] executionParameterRanges loaded:', this.executionParameterRanges.length, 'items');
      }
    } catch (e) {
      console.warn('[guides-creer] failed to load executionParameterRanges', e);
      this.executionParameterRanges = [];
    }
  }

  ngOnDestroy(): void {
    if (this.etapesSubscription) {
      this.etapesSubscription.unsubscribe();
    }
  }

  /**
   * Map step code to machine category
   * Returns category name or null if no machine is needed
   */
  private getStepMachineCategory(codeEtape: string | null): string | null {
    if (!codeEtape) return null;

    const codeMap: Record<string, string | null> = {
      'broyage': 'broyage',
      'broyage_meule': 'broyage',
      'malaxage': 'malaxage',
      'decanteur_3_phases_separateur': 'separation',
      'decanteur_2_phases_separateur': 'separation',
      'extraction_decantation': 'extraction',
      'separation_verticale': 'separation',
      'stockage': 'stockage',
      // Steps that don't need machines
      'reception': null,
      'nettoyage': 'nettoyage',
      'nettoyage_lavage': 'nettoyage',
      'lavage': 'nettoyage',
      'ajout_eau': 'ajout_eau',
    };

    return codeMap[codeEtape] ?? null;
  }

  /**
   * Get machines for a specific step
   */
  getMachinesForStep(codeEtape: string | null): Machine[] {
    const category = this.getStepMachineCategory(codeEtape);
    if (!category) {
      return [];
    }

    // Map step category to expected typeMachine keywords (covers cases where categorieMachine may be missing)
    const expectedTypesByCategory: Record<string, string[]> = {
      broyage: ['marteaux', 'disques', 'meules'],
      malaxage: ['horizontal', 'vertical', 'malaxeur double cuve (optionnel)', 'malaxeur double cuve'],
      extraction: ['centrifugation_2_phases', 'centrifugation_3_phases', 'presse_hydraulique', '2_phase', '3_phase', 'presse'],
      separation: ['decanteur_2_phases', 'decanteur_3_phases', 'separateur_vertical'],
      nettoyage: ['soufflerie', 'laveuse_eau', 'laveuse a eau', 'separateur_feuilles', 'separateur de feuilles'],
      ajout_eau: ['systeme_injection_eau', 'systeme injection eau', 'injection_eau', 'injection eau'],
      stockage: ['cuve_inox', 'cuve_fibre'],
    };

    const expectedTypes = expectedTypesByCategory[category] ?? [];

    const selectedHuilerieId = Number(this.guideForm.get('huilerieId')?.value ?? 0) || null;

    const normalize = (value: unknown): string => String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_');

    return this.allMachines.filter((m) => {
      // If huilerie is selected, filter by it
      if (selectedHuilerieId && Number(m.huilerieId) !== selectedHuilerieId) {
        return false;
      }

      // Prefer explicit category match
      if (normalize(m.categorieMachine) === normalize(category)) return true;

      // Fallback: match by typeMachine keywords
      const tm = normalize(m.typeMachine);
      for (const expected of expectedTypes) {
        if (tm.includes(normalize(expected))) return true;
      }

      return false;
    });
  }

  /**
   * Get machines for a step by its index in the FormArray (safe for templates)
   * Implements lazy-loading with caching per step code
   */
  getMachinesForStepByIndex(index: number): Machine[] {
    try {
      const etapeControl = this.etapes.at(index);
      if (!etapeControl) {
        console.warn(`[guides-creer] No etape found at index ${index}`);
        return [];
      }

      const codeVal = etapeControl.get('codeEtape')?.value;
      const code = codeVal == null ? null : String(codeVal);

      // Check cache first
      if (code && this.machinesCacheByStep.has(code)) {
        const cached = this.machinesCacheByStep.get(code) || [];
        console.log(`[guides-creer] getMachinesForStepByIndex(${index}) [CACHED] code="${code}":`, {
          machineCount: cached.length,
        });
        return cached;
      }

      // Compute and cache result
      const result = this.getMachinesForStep(code);
      if (code) {
        this.machinesCacheByStep.set(code, result);
      }
      console.log(`[guides-creer] getMachinesForStepByIndex(${index}) [COMPUTED] code="${code}":`, {
        machineCount: result?.length || 0,
        allMachinesCount: this.allMachines.length,
      });

      return result || [];
    } catch (e) {
      console.error(`[guides-creer] Error in getMachinesForStepByIndex(${index}):`, e);
      return [];
    }
  }

  get etapes(): FormArray {
    return this.guideForm.get('etapes') as FormArray;
  }

  addEtape(): void {
    this.etapes.push(this.createEtapeGroup(this.etapes.length + 1));
  }

  onTypeMachineSelectionChange(typeMachine: string | null): void {
    const normalizedTypeMachine = String(typeMachine ?? '').trim();
    this.guideForm.patchValue({ typeMachine: normalizedTypeMachine || null });

    if (!normalizedTypeMachine) {
      this.etapes.clear();
      return;
    }

    this.applyGuideTemplate(normalizedTypeMachine);
  }

  removeEtape(index: number): void {
    if (this.etapes.length <= 1) {
      return;
    }

    this.etapes.removeAt(index);
    this.reorderEtapes();
  }

  addParametre(etapeIndex: number): void {
    this.getParametres(etapeIndex).push(this.createParametreGroup());
  }

  removeParametre(etapeIndex: number, parametreIndex: number): void {
    const parametres = this.getParametres(etapeIndex);
    if (parametres.length <= 1) {
      return;
    }

    parametres.removeAt(parametreIndex);
  }

  onParametreCodeChange(etapeIndex: number, parametreIndex: number): void {
    const group = this.getParametres(etapeIndex).at(parametreIndex);
    const selectedCode = String(group.get('codeParametre')?.value ?? '').trim();
    const customNameControl = group.get('nomPersonnalise');

    if (!customNameControl) {
      return;
    }

    if (selectedCode === this.customParametreCode) {
      group.patchValue({ nom: '' });
      customNameControl.setValidators([Validators.required]);
      customNameControl.updateValueAndValidity();
      this.applyParametreValueValidators(group, null);
      return;
    }

    customNameControl.clearValidators();
    customNameControl.setValue('');
    customNameControl.updateValueAndValidity();

    const selectedOption = this.fixedParametreOptions.find((option) => option.code === selectedCode);
    if (!selectedOption) {
      this.applyParametreValueValidators(group, null);
      return;
    }

    group.patchValue({
      nom: selectedOption.code,
      uniteMesure: selectedOption.unite,
      description: selectedOption.description,
      valeur: selectedOption.valeur,
    });

    this.applyParametreValueValidators(group, selectedOption);
  }

  isCustomParamSelected(etapeIndex: number, parametreIndex: number): boolean {
    const selectedCode = this.getParametres(etapeIndex).at(parametreIndex).get('codeParametre')?.value;
    return String(selectedCode ?? '') === this.customParametreCode;
  }

  getParametreHelp(codeParametre: string | null | undefined) {
    const normalizedCode = String(codeParametre ?? '').trim();
    return this.guideParameterHelp.find((item) => item.code === normalizedCode) ?? null;
  }

  isParametreValueInvalid(etapeIndex: number, parametreIndex: number): boolean {
    const control = this.getParametres(etapeIndex).at(parametreIndex).get('valeur');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getParametreValueError(etapeIndex: number, parametreIndex: number): string | null {
    const parametreGroup = this.getParametres(etapeIndex).at(parametreIndex);
    const valueControl = parametreGroup.get('valeur');
    const selectedCode = String(parametreGroup.get('codeParametre')?.value ?? '').trim();
    const help = this.getParametreHelp(selectedCode);

    if (!valueControl || !valueControl.errors || !(valueControl.dirty || valueControl.touched)) {
      return null;
    }

    if (valueControl.errors['range'] && help) {
      return `${help.label} doit rester entre ${help.min} et ${help.max}${help.unite ? ` ${help.unite}` : ''}`;
    }

    if (valueControl.errors['required']) {
      return 'Valeur obligatoire';
    }

    return 'Valeur invalide';
  }

  submitGuide(): void {
    if (this.guideForm.invalid) {
      this.guideForm.markAllAsTouched();
      return;
    }

    const raw = this.guideForm.getRawValue();
    const payload = {
      nom: String(raw.nom ?? '').trim(),
      description: String(raw.description ?? '').trim(),
      dateCreation: String(raw.dateCreation ?? this.today()),
      huilerieId: Number(raw.huilerieId),
      typeMachine: String(raw.typeMachine ?? '').trim(),
      etapes: this.mapEtapesPayload(raw.etapes ?? []),
    };

    const etapeSansMachine = payload.etapes.find((etape) => this.isMachineRequiredForCodeEtape(etape.codeEtape) && Number(etape.machineId ?? 0) <= 0);
    if (etapeSansMachine) {
      this.guideError = `Aucune machine valide trouvée pour l'étape "${etapeSansMachine.nom}".`;
      this.guideMessage = '';
      return;
    }

    this.submittingGuide = true;
    this.guideError = '';
    this.guideMessage = '';

    this.guideProductionService.create(payload).subscribe({
      next: () => {
        this.submittingGuide = false;
        this.guideMessage = 'Guide de production créé avec succès.';
        this.resetGuideForm();
      },
      error: (error) => {
        this.submittingGuide = false;
        this.guideError = this.readHttpError(error, 'Impossible de créer le guide de production.');
      },
    });
  }

  getParametres(etapeIndex: number): FormArray {
    return this.etapes.at(etapeIndex).get('parametres') as FormArray;
  }

  /**
   * Auto-assign a machine to each étape when there's exactly one matching machine
   */
  private autoAssignMachinesToEtapes(): void {
    try {
      const etapesArray = this.guideForm.get('etapes') as FormArray;
      etapesArray.controls.forEach((etapeControl) => {
        const code = String(etapeControl.get('codeEtape')?.value ?? null);
        const machines = this.getMachinesForStep(code);
        if (machines && machines.length === 1) {
          const current = etapeControl.get('machineId')?.value;
          if (!current) {
            etapeControl.get('machineId')?.setValue(machines[0].idMachine);
          }
        }
      });
    } catch (e) {
      console.warn('[guides-creer] autoAssignMachinesToEtapes error', e);
    }
  }

  private loadReferenceData(): void {
    this.huilerieService.getAll().subscribe((items) => (this.huileries = items));

    // Lazy-load machines: load them once and keep in memory for filtering
    this.machineService.getAll().subscribe((items) => {
      this.allMachines = items;
      console.log(`[guides-creer] Loaded ${items.length} machines globally`);
      // Clear cache when machines are reloaded
      this.machinesCacheByStep.clear();
      // Attempt to auto-assign machines to any existing étapes
      this.autoAssignMachinesToEtapes();
    });
  }

  private setupExtractionWatcher(): void {
    if (this.etapesSubscription) {
      this.etapesSubscription.unsubscribe();
    }

    const etapesArray = this.guideForm.get('etapes') as FormArray;

    // 🔍 Find extraction step index
    const extractionStepIndex = etapesArray.controls.findIndex(
      (etape) => {
        const codeEtape = (etape as any).get('codeEtape')?.value;
        return codeEtape?.includes('3_phases') ||
          codeEtape?.includes('2_phases') ||
          codeEtape?.includes('extraction_decantation') ||
          codeEtape === 'ajout_eau'; // For 3_phase, extraction is after "Ajout d'eau"
      }
    );

    if (extractionStepIndex === -1) {
      return; // No extraction step found
    }

    const extractionEtape = etapesArray.at(extractionStepIndex);
    const parametresArray = extractionEtape.get('parametres') as FormArray;

    // Watch for changes in extraction step parameters
    this.etapesSubscription = parametresArray.statusChanges.subscribe(() => {
      this.updateSeparationStepForCurrentExtraction();
    });

    // Also watch for value changes to catch immediate changes
    parametresArray.valueChanges.subscribe(() => {
      this.updateSeparationStepForCurrentExtraction();
    });
  }

  private updateSeparationStepForCurrentExtraction(): void {
    const etapesArray = this.guideForm.get('etapes') as FormArray;
    const typeMachine = String(this.currentTypeMachine ?? '').trim().toLowerCase();

    if (typeMachine === '3_phase') {
      this.updateSeparationStepFor3Phase(etapesArray);
    } else if (typeMachine === '2_phase') {
      this.updateSeparationStepFor2Phase(etapesArray);
    }
    // For 'presse', extraction and separation are merged, so no dynamic update needed
  }

  private updateSeparationStepFor3Phase(etapesArray: FormArray): void {
    // For 3_phase: find the extraction step (after "Ajout d'eau")
    const ajoutEauIndex = etapesArray.controls.findIndex(
      (etape) => (etape as any).get('codeEtape')?.value === 'ajout_eau'
    );

    if (ajoutEauIndex === -1) return;

    const separationStepIndex = ajoutEauIndex + 1;
    if (separationStepIndex >= etapesArray.length) return;

    const separationEtape = etapesArray.at(separationStepIndex);
    const parametresArray = separationEtape.get('parametres') as FormArray;

    // The extraction type for 3_phase is fixed to centrifugation_3_phases
    const newSeparationStep = buildSeparationStepForExtractionType('centrifugation_3_phases');
    if (newSeparationStep) {
      this.updateStepWithTemplate(separationEtape, newSeparationStep);
    }
  }

  private updateSeparationStepFor2Phase(etapesArray: FormArray): void {
    // For 2_phase: find the extraction step (it's the separation merged step)
    const separationStepIndex = etapesArray.controls.findIndex(
      (etape) => (etape as any).get('codeEtape')?.value === 'decanteur_2_phases_separateur'
    );

    if (separationStepIndex === -1) return;

    const separationEtape = etapesArray.at(separationStepIndex);

    // The extraction type for 2_phase is fixed to centrifugation_2_phases
    const newSeparationStep = buildSeparationStepForExtractionType('centrifugation_2_phases');
    if (newSeparationStep) {
      this.updateStepWithTemplate(separationEtape, newSeparationStep);
    }
  }

  private updateStepWithTemplate(
    etapeControl: any,
    template: any
  ): void {
    etapeControl.patchValue({
      nom: template.nom,
      description: template.description,
    }, { emitEvent: false });

    const parametresArray = etapeControl.get('parametres') as FormArray;
    while (parametresArray.length > 0) {
      parametresArray.removeAt(0);
    }

    template.parametres.forEach((parametre: any) => {
      parametresArray.push(this.createParametreGroupFromTemplate(parametre));
    });
  }

  private applyGuideTemplate(typeMachine: string): void {
    const templates = buildGuideStepTemplates(typeMachine);
    this.currentTypeMachine = typeMachine;

    // 🔍 LOG DE DEBUG pour vérifier les étapes chargées
    console.log(`[Guide Template] Type Machine: ${typeMachine}`);
    console.log(`[Guide Template] Étapes chargées:`, templates.map(t => ({
      ordre: t.ordre,
      nom: t.nom,
      parametres: t.parametres.map(p => p.codeParametre)
    })));

    const etapesArray = this.guideForm.get('etapes') as FormArray;

    while (etapesArray.length > 0) {
      etapesArray.removeAt(0);
    }

    templates.forEach((template) => {
      etapesArray.push(this.createEtapeGroupFromTemplate(template.nom, template.ordre, template.description, template.codeEtape, template.parametres));
    });

    // ✅ Setup watchers for dynamic separation step updates
    setTimeout(() => {
      this.setupExtractionWatcher();
      // Try auto-assigning machines now that steps exist
      this.autoAssignMachinesToEtapes();
    }, 100);
  }

  private createEtapeGroup(ordre: number): ReturnType<FormBuilder['group']> {
    return this.fb.group({
      nom: ['', [Validators.required]],
      ordre: [ordre, [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required]],
      machineId: [null],
      parametres: this.fb.array([this.createParametreGroup()]),
    });
  }

  private createEtapeGroupFromTemplate(
    nom: string,
    ordre: number,
    description: string,
    codeEtape: string,
    parametres: Array<{ codeParametre: string; nom: string; uniteMesure: string; description: string; valeur: string }>,
  ): ReturnType<FormBuilder['group']> {
    return this.fb.group({
      nom: [nom, [Validators.required]],
      ordre: [ordre, [Validators.required, Validators.min(1)]],
      description: [description, [Validators.required]],
      codeEtape: [codeEtape],
      machineId: [null],
      parametres: this.fb.array(
        parametres.length > 0
          ? parametres.map((parametre) => this.createParametreGroupFromTemplate(parametre))
          : [],
      ),
    });
  }

  private createParametreGroupFromTemplate(parametre: { codeParametre: string; nom: string; uniteMesure: string; description: string; valeur: string }): ReturnType<FormBuilder['group']> {
    const group = this.fb.group({
      codeParametre: [parametre.codeParametre, [Validators.required]],
      nom: [parametre.nom],
      nomPersonnalise: [''],
      uniteMesure: [parametre.uniteMesure, [Validators.required]],
      description: [parametre.description, [Validators.required]],
      valeur: [parametre.valeur, [Validators.required]],
    });

    const selectedOption = this.fixedParametreOptions.find((option) => option.code === parametre.codeParametre) ?? null;
    this.applyParametreValueValidators(group, selectedOption);
    return group;
  }

  private createParametreGroup(): ReturnType<FormBuilder['group']> {
    return this.fb.group({
      codeParametre: ['', [Validators.required]],
      nom: [''],
      nomPersonnalise: [''],
      uniteMesure: ['', [Validators.required]],
      description: ['', [Validators.required]],
      valeur: ['', [Validators.required]],
    });
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

  private applyParametreValueValidators(
    parametreGroup: AbstractControl,
    selectedOption: { code: string; unite: string; description: string; valeur: string; min: number; max: number; step: string; inputType: 'number' } | null,
  ): void {
    const valueControl = parametreGroup.get('valeur');
    if (!valueControl) {
      return;
    }

    const validators: ValidatorFn[] = [Validators.required];
    if (selectedOption) {
      validators.push(this.createRangeValidator(selectedOption.min, selectedOption.max));
    }

    valueControl.setValidators(validators);
    valueControl.updateValueAndValidity({ emitEvent: false });
  }

  private reorderEtapes(): void {
    this.etapes.controls.forEach((control, index) => {
      control.get('ordre')?.setValue(index + 1);
    });
  }

  private mapEtapesPayload(etapes: unknown[]): EtapeProduction[] {
    return (etapes as Array<Record<string, unknown>>).map((etape) => {
      const codeEtape = String(etape['codeEtape'] ?? '').trim() || undefined;
      const requiresMachine = this.isMachineRequiredForCodeEtape(codeEtape);
      const resolvedMachineId = this.resolveEtapeMachineId(etape);

      return {
        nom: String(etape['nom'] ?? '').trim(),
        ordre: Number(etape['ordre'] ?? 1),
        description: String(etape['description'] ?? '').trim(),
        codeEtape,
        machineId: requiresMachine ? (resolvedMachineId || undefined) : null,
        parametres: this.mapParametresPayload((etape['parametres'] as unknown[]) ?? []),
      };
    });
  }

  private resolveEtapeMachineId(etape: Record<string, unknown>): number {
    const codeEtape = String(etape['codeEtape'] ?? '').trim() || null;
    if (!this.isMachineRequiredForCodeEtape(codeEtape)) {
      return 0;
    }

    const explicitMachineId = Number(etape['machineId'] ?? 0);
    if (explicitMachineId > 0) {
      return explicitMachineId;
    }

    const stepMachines = this.getMachinesForStep(codeEtape);
    if (stepMachines.length > 0) {
      return Number(stepMachines[0].idMachine ?? 0);
    }

    const selectedHuilerieId = Number(this.guideForm.get('huilerieId')?.value ?? 0);
    const fallbackMachine = this.allMachines.find((machine) => {
      return selectedHuilerieId <= 0 || Number(machine.huilerieId ?? 0) === selectedHuilerieId;
    });

    return Number(fallbackMachine?.idMachine ?? 0);
  }

  private isMachineRequiredForCodeEtape(codeEtape: string | null | undefined): boolean {
    return this.getStepMachineCategory(String(codeEtape ?? '').trim() || null) !== null;
  }

  private mapParametresPayload(parametres: unknown[]): ParametreEtape[] {
    return (parametres as Array<Record<string, unknown>>).map((parametre) => ({
      codeParametre: String(parametre['codeParametre'] ?? '').trim(),
      nom: this.resolveParametreNom(parametre),
      uniteMesure: String(parametre['uniteMesure'] ?? '').trim(),
      description: String(parametre['description'] ?? '').trim(),
      valeur: String(parametre['valeur'] ?? '').trim(),
    }));
  }

  private resolveParametreNom(parametre: Record<string, unknown>): string {
    const codeParametre = String(parametre['codeParametre'] ?? '').trim();
    if (codeParametre === this.customParametreCode) {
      return String(parametre['nomPersonnalise'] ?? '').trim();
    }
    return String(parametre['nom'] ?? '').trim();
  }

  private resetGuideForm(): void {
    this.guideForm.reset({
      nom: '',
      description: '',
      dateCreation: this.today(),
      huilerieId: null,
      typeMachine: null,
    });

    this.etapes.clear();
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private readHttpError(error: unknown, fallbackMessage: string): string {
    const possibleMessage = (error as { error?: { message?: string }; message?: string })?.error?.message
      ?? (error as { message?: string })?.message;

    return possibleMessage ? String(possibleMessage) : fallbackMessage;
  }
}
