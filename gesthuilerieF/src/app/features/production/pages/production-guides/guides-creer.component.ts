import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule, NbSelectModule } from '@nebular/theme';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { HuilerieService } from '../../../machines/services/huilerie.service';
import { EtapeProduction, ParametreEtape } from '../../models/production.models';
import { GuideProductionService } from '../../services/guide-production.service';

@Component({
  selector: 'app-guides-creer',
  standalone: true,
  templateUrl: './guides-creer.component.html',
  styleUrls: ['./production-guides.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, NbCardModule, NbButtonModule, NbInputModule, NbSelectModule],
})
export class GuidesCreerComponent implements OnInit {
  huileries: Huilerie[] = [];

  guideMessage = '';
  guideError = '';
  submittingGuide = false;

  readonly fixedParametreOptions: Array<{ code: string; unite: string; description: string; valeur: string }> = [
    {
      code: 'temperature_malaxage_c',
      unite: 'C',
      description: 'Temperature de malaxage',
      valeur: '27',
    },
    {
      code: 'duree_malaxage_min',
      unite: 'min',
      description: 'Duree de malaxage',
      valeur: '40',
    },
    {
      code: 'vitesse_decanteur_tr_min',
      unite: 'tr/min',
      description: 'Vitesse du decanteur',
      valeur: '3200',
    },
    {
      code: 'pression_extraction_bar',
      unite: 'bar',
      description: 'Pression d extraction',
      valeur: '2.5',
    },
  ];
  readonly customParametreCode = 'autre';

  readonly guideForm;

  constructor(
    private fb: FormBuilder,
    @Inject(forwardRef(() => GuideProductionService))
    private guideProductionService: GuideProductionService,
    @Inject(forwardRef(() => HuilerieService))
    private huilerieService: HuilerieService,
  ) {
    this.guideForm = this.fb.group({
      nom: ['', [Validators.required]],
      description: ['', [Validators.required]],
      dateCreation: [this.today(), [Validators.required]],
      huilerieId: [null, [Validators.required]],
      etapes: this.fb.array([
        this.createEtapeGroup(1),
        this.createEtapeGroup(2),
      ]),
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
  }

  get etapes(): FormArray {
    return this.guideForm.get('etapes') as FormArray;
  }

  addEtape(): void {
    this.etapes.push(this.createEtapeGroup(this.etapes.length + 1));
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
      return;
    }

    customNameControl.clearValidators();
    customNameControl.setValue('');
    customNameControl.updateValueAndValidity();

    const selectedOption = this.fixedParametreOptions.find((option) => option.code === selectedCode);
    if (!selectedOption) {
      return;
    }

    group.patchValue({
      nom: selectedOption.code,
      uniteMesure: selectedOption.unite,
      description: selectedOption.description,
      valeur: selectedOption.valeur,
    });
  }

  isCustomParamSelected(etapeIndex: number, parametreIndex: number): boolean {
    const selectedCode = this.getParametres(etapeIndex).at(parametreIndex).get('codeParametre')?.value;
    return String(selectedCode ?? '') === this.customParametreCode;
  }

  submitGuide(): void {
    if (this.guideForm.invalid) {
      this.guideForm.markAllAsTouched();
      return;
    }

    this.submittingGuide = true;
    this.guideError = '';
    this.guideMessage = '';

    const raw = this.guideForm.getRawValue();
    const payload = {
      nom: String(raw.nom ?? '').trim(),
      description: String(raw.description ?? '').trim(),
      dateCreation: String(raw.dateCreation ?? this.today()),
      huilerieId: Number(raw.huilerieId),
      etapes: this.mapEtapesPayload(raw.etapes ?? []),
    };

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

  private loadReferenceData(): void {
    this.huilerieService.getAll().subscribe((items) => (this.huileries = items));
  }

  private createEtapeGroup(ordre: number): ReturnType<FormBuilder['group']> {
    return this.fb.group({
      nom: ['', [Validators.required]],
      ordre: [ordre, [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required]],
      parametres: this.fb.array([this.createParametreGroup()]),
    });
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

  private reorderEtapes(): void {
    this.etapes.controls.forEach((control, index) => {
      control.get('ordre')?.setValue(index + 1);
    });
  }

  private mapEtapesPayload(etapes: unknown[]): EtapeProduction[] {
    return (etapes as Array<Record<string, unknown>>).map((etape) => ({
      nom: String(etape['nom'] ?? '').trim(),
      ordre: Number(etape['ordre'] ?? 1),
      description: String(etape['description'] ?? '').trim(),
      parametres: this.mapParametresPayload((etape['parametres'] as unknown[]) ?? []),
    }));
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
    });

    this.etapes.clear();
    this.etapes.push(this.createEtapeGroup(1));
    this.etapes.push(this.createEtapeGroup(2));
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
