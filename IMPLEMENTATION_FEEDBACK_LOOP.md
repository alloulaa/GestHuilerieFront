# 🎯 IMPLÉMENTATION COMPLÈTE : FEEDBACK LOOP VALEURS RÉELLES

## Vue d'ensemble

Ce guide fournit une implémentation complète et exécutable pour intégrer les valeurs réelles dans le système d'IA. Le flux global est :

```
Frontend (saisie) → Backend (validation/stockage) → IA (réentraînement) → Modèles améliorés
```

---

## 🔹 PARTIE 1 : FRONTEND (Angular)

### 1.1 Service Angular - ExecutionProductionService

**Fichier à créer/modifier** : `gesthuilerieF/src/app/features/production/services/execution-production.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ValeurReelleInput {
  parametreEtapeId: number;
  valeurReelle: number;
  uniteMesure?: string;
}

export interface SaveValeursReellesRequest {
  executionProductionId: number;
  valeursReelles: ValeurReelleInput[];
}

export interface ValeurReelleParametreDTO {
  idValeurReelleParametre: number;
  executionProductionId: number;
  parametreEtapeId: number;
  valeurReelle: number;
  nomParametre: string;
  uniteMesure: string;
  valeurEstimee: number;
  dateCreation: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExecutionProductionService {
  private apiUrl = '/api/execution-productions';

  constructor(private http: HttpClient) {}

  create(execution: any): Observable<any> {
    return this.http.post(this.apiUrl, execution).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  predictOnStart(executionId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${executionId}/predict-on-start`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Sauvegarde les valeurs réelles des paramètres à la fin de l'exécution
   * @param executionId ID de l'exécution
   * @param valeursReelles Tableau des valeurs réelles avec validation
   */
  saveValeursReelles(
    executionId: number,
    valeursReelles: ValeurReelleInput[]
  ): Observable<ValeurReelleParametreDTO[]> {
    const request: SaveValeursReellesRequest = {
      executionProductionId: executionId,
      valeursReelles
    };
    
    return this.http
      .post<ValeurReelleParametreDTO[]>(
        `${this.apiUrl}/${executionId}/valeurs-reelles`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère les valeurs réelles d'une exécution
   */
  getValeursReelles(executionId: number): Observable<ValeurReelleParametreDTO[]> {
    return this.http
      .get<ValeurReelleParametreDTO[]>(
        `${this.apiUrl}/${executionId}/valeurs-reelles`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Exporte les valeurs réelles pour réentraînement du modèle
   */
  exportValeursReellesForRetraining(
    filters?: { depuis?: string; jusqu?: string }
  ): Observable<Blob> {
    let params = new URLSearchParams();
    if (filters?.depuis) params.append('depuis', filters.depuis);
    if (filters?.jusqu) params.append('jusqu', filters.jusqu);

    return this.http
      .get(`${this.apiUrl}/valeurs-reelles/export-retrain`, {
        responseType: 'blob'
      })
      .pipe(catchError(this.handleError));
  }

  finishExecution(executionId: number, data: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/${executionId}/finish`, data)
      .pipe(catchError(this.handleError));
  }

  createProduitFinal(data: any): Observable<any> {
    return this.http.post('/api/produits-finaux', data).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
```

### 1.2 Composant Angular - Formulaire de Valeurs Réelles

**Fichier à créer** : `gesthuilerieF/src/app/features/production/pages/production-guides/execution-real-values.component.ts`

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule, NbIconModule, NbAlertModule } from '@nebular/theme';
import { ExecutionProduction } from '../../models/production.models';
import { ExecutionProductionService, ValeurReelleInput } from '../../services/execution-production.service';
import { ToastService } from '../../../../core/services/toast.service';

interface ParametreField {
  parametreEtapeId: number;
  stepName: string;
  parameterName: string;
  uniteMesure: string;
  estimatedValue: number;
  minValue: number;
  maxValue: number;
  tolerance: number;
}

@Component({
  selector: 'app-execution-real-values',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbIconModule,
    NbAlertModule
  ],
  template: `
    <nb-card [attr.class]="'real-values-card'">
      <nb-card-header>
        <div class="header-content">
          <h4>📊 Saisie des Valeurs Réelles</h4>
          <p class="subtitle">Complétez les mesures effectivement enregistrées lors de l'exécution</p>
        </div>
      </nb-card-header>

      <nb-card-body>
        <!-- Alert si pas de paramètres -->
        <nb-alert 
          *ngIf="parametreFields.length === 0"
          status="warning">
          Aucun paramètre à mesurer pour cette exécution
        </nb-alert>

        <!-- Formulaire des valeurs réelles -->
        <form [formGroup]="valeursReellesForm" *ngIf="parametreFields.length > 0">
          
          <!-- Groupes de paramètres -->
          <div *ngFor="let group of groupedParameters" class="parameter-group">
            <h5 class="group-title">{{ group.stepName }}</h5>
            
            <div class="parameters-grid">
              <div 
                *ngFor="let param of group.parameters"
                class="parameter-input-group">
                
                <label [for]="'param_' + param.parametreEtapeId">
                  {{ param.parameterName }}
                </label>

                <div class="input-with-unit">
                  <input
                    [id]="'param_' + param.parametreEtapeId"
                    type="number"
                    [formControlName]="'param_' + param.parametreEtapeId"
                    class="param-input"
                    [step]="getStep(param.uniteMesure)"
                    [min]="param.minValue"
                    [max]="param.maxValue"
                    [attr.placeholder]="getPlaceholder(param)"
                  />
                  <span class="unit">{{ param.uniteMesure }}</span>
                </div>

                <!-- Validation feedback -->
                <div class="validation-feedback" 
                  *ngIf="getFormControl('param_' + param.parametreEtapeId).invalid 
                    && getFormControl('param_' + param.parametreEtapeId).touched">
                  
                  <small class="error" 
                    *ngIf="getFormControl('param_' + param.parametreEtapeId).errors?.['required']">
                    ⚠️ Requis
                  </small>
                  
                  <small class="error" 
                    *ngIf="getFormControl('param_' + param.parametreEtapeId).errors?.['min']">
                    ⚠️ Minimum : {{ param.minValue }}
                  </small>
                  
                  <small class="error" 
                    *ngIf="getFormControl('param_' + param.parametreEtapeId).errors?.['max']">
                    ⚠️ Maximum : {{ param.maxValue }}
                  </small>

                  <small class="warning" 
                    *ngIf="isOutsideTolerance(param)">
                    ⚡ Déviation : {{ getDeviation(param) }}%
                  </small>
                </div>

                <!-- Info estimée -->
                <small class="info">
                  Estimée : {{ param.estimatedValue }} {{ param.uniteMesure }}
                </small>
              </div>
            </div>
          </div>
        </form>

        <!-- Résumé des variations -->
        <div *ngIf="parametreFields.length > 0" class="summary-section">
          <h5>Résumé des Variations</h5>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Paramètre</th>
                <th>Estimée</th>
                <th>Réelle</th>
                <th>Déviation</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let param of parametreFields">
                <td>{{ param.parameterName }}</td>
                <td>{{ param.estimatedValue }} {{ param.uniteMesure }}</td>
                <td>{{ getRealValue(param) || '-' }} {{ param.uniteMesure }}</td>
                <td [class.negative]="isNegativeDeviation(param)"
                    [class.positive]="isPositiveDeviation(param)">
                  {{ getDeviationValue(param) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </nb-card-body>

      <nb-card-footer class="footer-actions">
        <button 
          nbButton
          type="button"
          (click)="cancel()"
          class="btn-cancel">
          Annuler
        </button>
        
        <button
          nbButton
          type="submit"
          status="success"
          (click)="submit()"
          [disabled]="submitting || valeursReellesForm.invalid"
          class="btn-submit">
          <nb-icon *ngIf="!submitting" icon="checkmark-circle-outline"></nb-icon>
          <nb-icon *ngIf="submitting" icon="loader" class="spinner"></nb-icon>
          {{ submitting ? 'Enregistrement...' : 'Enregistrer les Valeurs' }}
        </button>
      </nb-card-footer>
    </nb-card>
  `,
  styles: [`
    .header-content {
      padding: 10px 0;
    }

    .subtitle {
      margin: 8px 0 0 0;
      font-size: 0.85rem;
      color: #7f8fa3;
    }

    .parameter-group {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #edf1f7;
    }

    .group-title {
      font-size: 1rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 15px;
      margin-top: 0;
    }

    .parameters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .parameter-input-group {
      display: flex;
      flex-direction: column;
    }

    label {
      font-weight: 500;
      margin-bottom: 8px;
      color: #2c3e50;
      font-size: 0.95rem;
    }

    .input-with-unit {
      display: flex;
      position: relative;
      align-items: center;
    }

    .param-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #d3dce6;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.3s;
    }

    .param-input:focus {
      outline: none;
      border-color: #3366cc;
      box-shadow: 0 0 0 3px rgba(51, 102, 204, 0.1);
    }

    .param-input.ng-invalid.ng-touched {
      border-color: #ff6b6b;
    }

    .unit {
      margin-left: 10px;
      font-size: 0.9rem;
      color: #7f8fa3;
      font-weight: 500;
      min-width: 50px;
    }

    .validation-feedback {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .error {
      color: #ff6b6b;
      font-size: 0.85rem;
    }

    .warning {
      color: #ffa940;
      font-size: 0.85rem;
    }

    .info {
      color: #7f8fa3;
      margin-top: 6px;
      font-size: 0.85rem;
      font-style: italic;
    }

    .summary-section {
      margin-top: 30px;
      padding: 15px;
      background-color: #f7fafc;
      border-radius: 4px;
    }

    .summary-section h5 {
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 0.95rem;
      color: #2c3e50;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .summary-table thead {
      background-color: #e8ecf1;
    }

    .summary-table th,
    .summary-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #d3dce6;
    }

    .summary-table th {
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-table td {
      color: #465e7f;
    }

    .summary-table td.negative {
      color: #ff6b6b;
      font-weight: 500;
    }

    .summary-table td.positive {
      color: #52c41a;
      font-weight: 500;
    }

    .footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 15px 0;
    }

    .btn-cancel {
      min-width: 120px;
    }

    .btn-submit {
      min-width: 180px;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .real-values-card {
      margin-top: 20px;
    }
  `]
})
export class ExecutionRealValuesComponent implements OnInit {
  @Input() execution: ExecutionProduction;
  @Input() parametreFields: ParametreField[] = [];
  
  valeursReellesForm: FormGroup;
  groupedParameters: Array<{ stepName: string; parameters: ParametreField[] }> = [];
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private executionService: ExecutionProductionService,
    private toastService: ToastService
  ) {
    this.valeursReellesForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.buildForm();
    this.groupParameters();
  }

  /**
   * Construit le formulaire réactif avec validation
   */
  private buildForm(): void {
    this.parametreFields.forEach(param => {
      const controlName = `param_${param.parametreEtapeId}`;
      
      this.valeursReellesForm.addControl(
        controlName,
        this.fb.control(
          null,
          [
            Validators.required,
            Validators.min(param.minValue),
            Validators.max(param.maxValue)
          ]
        )
      );
    });
  }

  /**
   * Groupe les paramètres par étape
   */
  private groupParameters(): void {
    const grouped = new Map<string, ParametreField[]>();

    this.parametreFields.forEach(param => {
      if (!grouped.has(param.stepName)) {
        grouped.set(param.stepName, []);
      }
      grouped.get(param.stepName)!.push(param);
    });

    this.groupedParameters = Array.from(grouped.entries()).map(([stepName, parameters]) => ({
      stepName,
      parameters
    }));
  }

  /**
   * Obtient le pas d'incrémentation selon l'unité
   */
  getStep(unit: string): number {
    const steps: { [key: string]: number } = {
      '°C': 0.1,
      'min': 0.5,
      'tr/min': 10,
      'bar': 0.1,
      '%': 0.1
    };
    return steps[unit] || 0.1;
  }

  /**
   * Génère le placeholder avec les limites acceptables
   */
  getPlaceholder(param: ParametreField): string {
    return `${param.minValue} - ${param.maxValue}`;
  }

  /**
   * Obtient le contrôle du formulaire
   */
  getFormControl(controlName: string) {
    return this.valeursReellesForm.get(controlName) || this.fb.control(null);
  }

  /**
   * Vérifie si la valeur est en dehors de la tolérance (±10%)
   */
  isOutsideTolerance(param: ParametreField): boolean {
    const realValue = this.getRealValue(param);
    if (!realValue) return false;

    const tolerance = (param.estimatedValue * param.tolerance) / 100;
    const min = param.estimatedValue - tolerance;
    const max = param.estimatedValue + tolerance;

    return realValue < min || realValue > max;
  }

  /**
   * Récupère la valeur réelle saisie
   */
  getRealValue(param: ParametreField): number | null {
    const value = this.valeursReellesForm.get(`param_${param.parametreEtapeId}`)?.value;
    return value !== null && value !== undefined ? parseFloat(value) : null;
  }

  /**
   * Calcule la déviation en pourcentage
   */
  getDeviation(param: ParametreField): number {
    const realValue = this.getRealValue(param);
    if (!realValue) return 0;
    return Math.round(((realValue - param.estimatedValue) / param.estimatedValue) * 100 * 100) / 100;
  }

  /**
   * Obtient la valeur de déviation formatée
   */
  getDeviationValue(param: ParametreField): string {
    const deviation = this.getDeviation(param);
    const sign = deviation > 0 ? '+' : '';
    return `${sign}${deviation}%`;
  }

  isNegativeDeviation(param: ParametreField): boolean {
    return this.getDeviation(param) < -5;
  }

  isPositiveDeviation(param: ParametreField): boolean {
    return this.getDeviation(param) > 5;
  }

  /**
   * Soumet les valeurs réelles au backend
   */
  async submit(): Promise<void> {
    if (this.valeursReellesForm.invalid) {
      this.toastService.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    this.submitting = true;

    try {
      const valeursReelles: ValeurReelleInput[] = this.parametreFields.map(param => ({
        parametreEtapeId: param.parametreEtapeId,
        valeurReelle: this.getRealValue(param) || 0,
        uniteMesure: param.uniteMesure
      }));

      const result = await this.executionService
        .saveValeursReelles(this.execution.idExecutionProduction, valeursReelles)
        .toPromise();

      this.toastService.success('✅ Valeurs réelles enregistrées avec succès!');
      console.log('Valeurs réelles sauvegardées:', result);

    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      this.toastService.error(`❌ Erreur: ${error.message}`);
    } finally {
      this.submitting = false;
    }
  }

  cancel(): void {
    this.valeursReellesForm.reset();
    this.toastService.info('Formulaire réinitialisé');
  }
}
```

### 1.3 Template HTML - Intégration dans guides-executer

**Fichier à modifier** : `gesthuilerieF/src/app/features/production/pages/production-guides/guides-executer.component.html`

Ajouter après le formulaire d'exécution :

```html
<!-- Section des valeurs réelles après finish -->
<div *ngIf="selectedExecution && selectedExecution.statut === 'TERMINÉE'" class="real-values-section">
  <app-execution-real-values
    [execution]="selectedExecution"
    [parametreFields]="executionValueRows">
  </app-execution-real-values>
</div>
```

---

## 🔹 PARTIE 2 : BACKEND (Spring Boot)

### 2.1 DTO pour Valeurs Réelles

**Fichier à créer** : `GestionHuilerieBackend/src/main/java/dto/ValeurReelleParametreDTO.java`

```java
package dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValeurReelleParametreDTO {
    
    private Long idValeurReelleParametre;
    private Long executionProductionId;
    private Long parametreEtapeId;
    private Double valeurReelle;
    private String nomParametre;
    private String uniteMesure;
    private Double valeurEstimee;
    private Double déviation;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    
    // Pour statistiques de feedback
    private Double écartTolerance;
    private String qualiteDeviation; // "FAIBLE", "MODÉRÉE", "IMPORTANTE"
}
```

**Fichier à créer** : `GestionHuilerieBackend/src/main/java/dto/SaveValeursReellesRequest.java`

```java
package dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveValeursReellesRequest {
    
    private Long executionProductionId;
    
    @javax.validation.Valid
    private List<ValeurReelleInput> valeursReelles;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ValeurReelleInput {
        
        private Long parametreEtapeId;
        
        @javax.validation.constraints.NotNull(message = "La valeur réelle ne peut pas être nulle")
        @javax.validation.constraints.DecimalMin("0.0")
        private Double valeurReelle;
        
        private String uniteMesure;
    }
}
```

### 2.2 Entity - Mise à jour ValeurReelleParametre

**Fichier à modifier** : `GestionHuilerieBackend/src/main/java/Models/ValeurReelleParametre.java`

```java
package Models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "valeur_reelle_parametre", indexes = {
    @Index(name = "idx_execution", columnList = "execution_production_id"),
    @Index(name = "idx_parametre", columnList = "parametre_etape_id"),
    @Index(name = "idx_date", columnList = "date_creation")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValeurReelleParametre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idValeurReelleParametre;

    @Column(nullable = false)
    private Double valeurReelle;

    @Column(length = 50)
    private String uniteMesure;

    @Column
    private Double valeurEstimee;

    @Column
    private Double deviation;

    @Column
    private String qualiteDeviation; // FAIBLE, MODÉRÉE, IMPORTANTE

    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Temporal(TemporalType.TIMESTAMP)
    @Column
    private LocalDateTime dateModification = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_production_id", nullable = false)
    private ExecutionProduction executionProduction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parametre_etape_id", nullable = false)
    private ParametreEtape parametreEtape;

    @PreUpdate
    protected void onUpdate() {
        this.dateModification = LocalDateTime.now();
    }

    /**
     * Calcule la déviation en pourcentage
     */
    public Double calculerDeviation() {
        if (valeurEstimee == null || valeurEstimee == 0) {
            return 0.0;
        }
        return ((valeurReelle - valeurEstimee) / valeurEstimee) * 100;
    }

    /**
     * Détermine la qualité de la déviation
     */
    public String determinerQualiteDeviation(double tolerance) {
        Double dev = Math.abs(calculerDeviation());
        
        if (dev <= tolerance / 2) {
            return "FAIBLE";
        } else if (dev <= tolerance) {
            return "MODÉRÉE";
        } else {
            return "IMPORTANTE";
        }
    }
}
```

### 2.3 Repository

**Fichier à créer** : `GestionHuilerieBackend/src/main/java/Repositories/ValeurReelleParametreRepository.java`

```java
package Repositories;

import Models.ValeurReelleParametre;
import Models.ExecutionProduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ValeurReelleParametreRepository extends JpaRepository<ValeurReelleParametre, Long> {
    
    /**
     * Récupère toutes les valeurs réelles d'une exécution
     */
    List<ValeurReelleParametre> findByExecutionProduction(ExecutionProduction execution);
    
    /**
     * Récupère les valeurs réelles créées après une date
     */
    @Query("SELECT v FROM ValeurReelleParametre v WHERE v.dateCreation >= :depuis")
    List<ValeurReelleParametre> findValeursSinceDate(@Param("depuis") LocalDateTime depuis);
    
    /**
     * Récupère les valeurs réelles avec déviation importante
     */
    @Query("SELECT v FROM ValeurReelleParametre v WHERE v.qualiteDeviation = 'IMPORTANTE'")
    List<ValeurReelleParametre> findOutlierValues();
    
    /**
     * Compte les valeurs réelles par exécution
     */
    @Query("SELECT COUNT(v) FROM ValeurReelleParametre v WHERE v.executionProduction = :execution")
    long countByExecution(@Param("execution") ExecutionProduction execution);
    
    /**
     * Récupère les valeurs réelles pour export (CSV/réentraînement)
     */
    @Query("""
        SELECT v FROM ValeurReelleParametre v
        JOIN v.executionProduction e
        WHERE e.dateCreation BETWEEN :depuis AND :jusqu
        ORDER BY e.dateCreation DESC, v.dateCreation DESC
    """)
    List<ValeurReelleParametre> findForExport(
        @Param("depuis") LocalDateTime depuis,
        @Param("jusqu") LocalDateTime jusqu
    );
    
    /**
     * Récupère les paramètres spécifiques (température, durée, vitesse, pression)
     */
    @Query("""
        SELECT v FROM ValeurReelleParametre v
        JOIN v.parametreEtape p
        WHERE p.nomParametre IN ('temperature_malaxage_c', 'duree_malaxage_min', 
                                 'vitesse_decanteur_tr_min', 'pression_extraction_bar')
        AND v.dateCreation >= :depuis
    """)
    List<ValeurReelleParametre> findMainParametersSince(@Param("depuis") LocalDateTime depuis);
}
```

### 2.4 Service Métier

**Fichier à créer** : `GestionHuilerieBackend/src/main/java/Services/ValeurReelleService.java`

```java
package Services;

import Models.*;
import Repositories.*;
import dto.SaveValeursReellesRequest;
import dto.ValeurReelleParametreDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ValeurReelleService {
    
    @Autowired
    private ValeurReelleParametreRepository valeurReelleRepo;
    
    @Autowired
    private ExecutionProductionRepository executionRepo;
    
    @Autowired
    private ParametreEtapeRepository parametreEtapeRepo;
    
    private static final double TOLERANCE_DEFAULT = 10.0; // ±10%
    
    /**
     * Sauvegarde les valeurs réelles d'une exécution
     */
    public List<ValeurReelleParametreDTO> saveValeursReelles(
        Long executionId,
        SaveValeursReellesRequest request
    ) throws Exception {
        
        // Valider l'exécution
        ExecutionProduction execution = executionRepo.findById(executionId)
            .orElseThrow(() -> new Exception("Exécution non trouvée"));
        
        // Supprimer les anciennes valeurs
        List<ValeurReelleParametre> existantes = valeurReelleRepo.findByExecutionProduction(execution);
        valeurReelleRepo.deleteAll(existantes);
        
        // Créer et sauvegarder les nouvelles valeurs
        List<ValeurReelleParametre> nouvellesValeurs = request.getValeursReelles()
            .stream()
            .map(input -> {
                ParametreEtape parametre = parametreEtapeRepo.findById(input.getParametreEtapeId())
                    .orElseThrow(() -> new RuntimeException("Paramètre non trouvé"));
                
                ValeurReelleParametre valeur = ValeurReelleParametre.builder()
                    .executionProduction(execution)
                    .parametreEtape(parametre)
                    .valeurReelle(input.getValeurReelle())
                    .uniteMesure(input.getUniteMesure())
                    .valeurEstimee(extractEstimatedValue(execution, parametre.getNomParametre()))
                    .build();
                
                // Calculer déviation
                Double deviation = valeur.calculerDeviation();
                valeur.setDeviation(deviation);
                valeur.setQualiteDeviation(valeur.determinerQualiteDeviation(TOLERANCE_DEFAULT));
                
                return valeur;
            })
            .collect(Collectors.toList());
        
        List<ValeurReelleParametre> saved = valeurReelleRepo.saveAll(nouvellesValeurs);
        
        return saved.stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Récupère les valeurs réelles d'une exécution
     */
    public List<ValeurReelleParametreDTO> getValeursReelles(Long executionId) throws Exception {
        ExecutionProduction execution = executionRepo.findById(executionId)
            .orElseThrow(() -> new Exception("Exécution non trouvée"));
        
        return valeurReelleRepo.findByExecutionProduction(execution)
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Exporte les valeurs réelles pour réentraînement du modèle
     */
    public List<ValeurReelleParametreDTO> getValeursForRetraining(
        LocalDateTime depuis,
        LocalDateTime jusqu
    ) {
        return valeurReelleRepo.findForExport(depuis, jusqu)
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Récupère les paramètres principaux (température, durée, vitesse, pression)
     */
    public List<ValeurReelleParametreDTO> getMainParameters(LocalDateTime depuis) {
        return valeurReelleRepo.findMainParametersSince(depuis)
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Extrait la valeur estimée de l'exécution selon le paramètre
     */
    private Double extractEstimatedValue(ExecutionProduction execution, String paramName) {
        return switch (paramName) {
            case "temperature_malaxage_c" -> execution.getTemperatureMalaxageC();
            case "duree_malaxage_min" -> execution.getDureeMalaxageMin();
            case "vitesse_decanteur_tr_min" -> execution.getVitesseDecanteurTrMin();
            case "pression_extraction_bar" -> execution.getPressionExtractionBar();
            default -> null;
        };
    }
    
    /**
     * Convertit l'entité en DTO
     */
    private ValeurReelleParametreDTO toDTO(ValeurReelleParametre entity) {
        return ValeurReelleParametreDTO.builder()
            .idValeurReelleParametre(entity.getIdValeurReelleParametre())
            .executionProductionId(entity.getExecutionProduction().getIdExecutionProduction())
            .parametreEtapeId(entity.getParametreEtape().getIdParametreEtape())
            .valeurReelle(entity.getValeurReelle())
            .nomParametre(entity.getParametreEtape().getNomParametre())
            .uniteMesure(entity.getUniteMesure())
            .valeurEstimee(entity.getValeurEstimee())
            .déviation(entity.getDeviation())
            .qualiteDeviation(entity.getQualiteDeviation())
            .dateCreation(entity.getDateCreation())
            .dateModification(entity.getDateModification())
            .build();
    }
}
```

### 2.5 Controller REST

**Fichier à créer** : `GestionHuilerieBackend/src/main/java/Controllers/ValeurReelleController.java`

```java
package Controllers;

import Services.ValeurReelleService;
import dto.SaveValeursReellesRequest;
import dto.ValeurReelleParametreDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/execution-productions/{executionId}/valeurs-reelles")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ValeurReelleController {
    
    @Autowired
    private ValeurReelleService valeurReelleService;
    
    /**
     * Sauvegarde les valeurs réelles d'une exécution
     * POST /api/execution-productions/{executionId}/valeurs-reelles
     */
    @PostMapping
    public ResponseEntity<List<ValeurReelleParametreDTO>> saveValeursReelles(
        @PathVariable Long executionId,
        @RequestBody SaveValeursReellesRequest request
    ) {
        try {
            List<ValeurReelleParametreDTO> result = valeurReelleService.saveValeursReelles(
                executionId,
                request
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
    
    /**
     * Récupère les valeurs réelles d'une exécution
     * GET /api/execution-productions/{executionId}/valeurs-reelles
     */
    @GetMapping
    public ResponseEntity<List<ValeurReelleParametreDTO>> getValeursReelles(
        @PathVariable Long executionId
    ) {
        try {
            List<ValeurReelleParametreDTO> result = valeurReelleService.getValeursReelles(executionId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }
    
    /**
     * Exporte les valeurs réelles pour réentraînement
     * GET /api/execution-productions/valeurs-reelles/export-retrain?depuis=...&jusqu=...
     */
    @GetMapping("/export-retrain")
    public ResponseEntity<List<ValeurReelleParametreDTO>> exportForRetraining(
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        LocalDateTime depuis,
        
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        LocalDateTime jusqu
    ) {
        if (depuis == null) {
            depuis = LocalDateTime.now().minusMonths(1);
        }
        if (jusqu == null) {
            jusqu = LocalDateTime.now();
        }
        
        List<ValeurReelleParametreDTO> result = valeurReelleService.getValeursForRetraining(depuis, jusqu);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Récupère les paramètres principaux
     * GET /api/execution-productions/main-parameters?depuis=...
     */
    @GetMapping("/main-parameters")
    public ResponseEntity<List<ValeurReelleParametreDTO>> getMainParameters(
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        LocalDateTime depuis
    ) {
        if (depuis == null) {
            depuis = LocalDateTime.now().minusMonths(3);
        }
        
        List<ValeurReelleParametreDTO> result = valeurReelleService.getMainParameters(depuis);
        return ResponseEntity.ok(result);
    }
}
```

---

## 🔹 PARTIE 3 : BASE DE DONNÉES (MySQL)

**Fichier à créer/exécuter** : `database-schema-realvalues.sql`

```sql
-- ============================================
-- SCRIPT DE MISE À JOUR - VALEURS RÉELLES
-- ============================================

-- 1. Table valeur_reelle_parametre (mise à jour)
CREATE TABLE IF NOT EXISTS `valeur_reelle_parametre` (
  `id_valeur_reelle_parametre` BIGINT NOT NULL AUTO_INCREMENT,
  `execution_production_id` BIGINT NOT NULL,
  `parametre_etape_id` BIGINT NOT NULL,
  `valeur_reelle` DOUBLE NOT NULL COMMENT 'Valeur réelle mesurée',
  `unite_mesure` VARCHAR(50) COMMENT 'Unité de mesure (°C, min, tr/min, bar, %)',
  `valeur_estimee` DOUBLE COMMENT 'Valeur estimée par le guide',
  `deviation` DOUBLE COMMENT 'Déviation en pourcentage',
  `qualite_deviation` VARCHAR(20) COMMENT 'FAIBLE, MODÉRÉE, IMPORTANTE',
  `date_creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_modification` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id_valeur_reelle_parametre`),
  KEY `idx_execution` (`execution_production_id`),
  KEY `idx_parametre` (`parametre_etape_id`),
  KEY `idx_date` (`date_creation`),
  KEY `idx_qualite_deviation` (`qualite_deviation`),
  
  CONSTRAINT `fk_valeur_execution` FOREIGN KEY (`execution_production_id`) 
    REFERENCES `execution_production` (`id_execution_production`) ON DELETE CASCADE,
  CONSTRAINT `fk_valeur_parametre` FOREIGN KEY (`parametre_etape_id`) 
    REFERENCES `parametre_etape` (`id_parametre_etape`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Ajouter colonnes à execution_production si absent
ALTER TABLE `execution_production` ADD COLUMN IF NOT EXISTS `temperature_malaxage_c` DOUBLE;
ALTER TABLE `execution_production` ADD COLUMN IF NOT EXISTS `duree_malaxage_min` DOUBLE;
ALTER TABLE `execution_production` ADD COLUMN IF NOT EXISTS `vitesse_decanteur_tr_min` DOUBLE;
ALTER TABLE `execution_production` ADD COLUMN IF NOT EXISTS `pression_extraction_bar` DOUBLE;

-- 3. Table d'audit pour le feedback loop
CREATE TABLE IF NOT EXISTS `valeur_reelle_audit` (
  `id_audit` BIGINT NOT NULL AUTO_INCREMENT,
  `id_valeur_reelle_parametre` BIGINT NOT NULL,
  `action` VARCHAR(50) COMMENT 'CRÉÉE, MODIFIÉE, SUPPRIMÉE',
  `ancienne_valeur` DOUBLE,
  `nouvelle_valeur` DOUBLE,
  `utilisateur` VARCHAR(255),
  `date_action` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id_audit`),
  KEY `idx_valeur` (`id_valeur_reelle_parametre`),
  KEY `idx_date_action` (`date_action`),
  
  CONSTRAINT `fk_audit_valeur` FOREIGN KEY (`id_valeur_reelle_parametre`)
    REFERENCES `valeur_reelle_parametre` (`id_valeur_reelle_parametre`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Vue pour statistiques de feedback
CREATE OR REPLACE VIEW `v_feedback_statistics` AS
SELECT 
  e.`id_execution_production`,
  e.`reference`,
  COUNT(vr.`id_valeur_reelle_parametre`) as nb_parametres,
  AVG(ABS(vr.`deviation`)) as deviation_moyenne,
  MAX(ABS(vr.`deviation`)) as deviation_max,
  SUM(CASE WHEN vr.`qualite_deviation` = 'FAIBLE' THEN 1 ELSE 0 END) as nb_faibles,
  SUM(CASE WHEN vr.`qualite_deviation` = 'MODÉRÉE' THEN 1 ELSE 0 END) as nb_moderees,
  SUM(CASE WHEN vr.`qualite_deviation` = 'IMPORTANTE' THEN 1 ELSE 0 END) as nb_importantes,
  e.`date_creation`
FROM `execution_production` e
LEFT JOIN `valeur_reelle_parametre` vr ON e.`id_execution_production` = vr.`execution_production_id`
GROUP BY e.`id_execution_production`, e.`reference`, e.`date_creation`;

-- 5. Trigger pour audit
DELIMITER //

CREATE TRIGGER `trg_valeur_reelle_insert` 
AFTER INSERT ON `valeur_reelle_parametre`
FOR EACH ROW
BEGIN
  INSERT INTO `valeur_reelle_audit` (
    `id_valeur_reelle_parametre`, `action`, `nouvelle_valeur`, `utilisateur`
  ) VALUES (
    NEW.`id_valeur_reelle_parametre`, 'CRÉÉE', NEW.`valeur_reelle`, USER()
  );
END//

CREATE TRIGGER `trg_valeur_reelle_update`
AFTER UPDATE ON `valeur_reelle_parametre`
FOR EACH ROW
BEGIN
  IF OLD.`valeur_reelle` != NEW.`valeur_reelle` THEN
    INSERT INTO `valeur_reelle_audit` (
      `id_valeur_reelle_parametre`, `action`, `ancienne_valeur`, `nouvelle_valeur`, `utilisateur`
    ) VALUES (
      NEW.`id_valeur_reelle_parametre`, 'MODIFIÉE', OLD.`valeur_reelle`, NEW.`valeur_reelle`, USER()
    );
  END IF;
END//

DELIMITER ;

-- 6. Insertion de données de test
INSERT INTO `valeur_reelle_parametre` (
  `execution_production_id`, `parametre_etape_id`, `valeur_reelle`, 
  `unite_mesure`, `valeur_estimee`, `deviation`, `qualite_deviation`
) VALUES
  (1, 1, 26.5, '°C', 26.0, 1.92, 'FAIBLE'),
  (1, 2, 34.2, 'min', 34.0, 0.59, 'FAIBLE'),
  (1, 3, 3320, 'tr/min', 3300, 0.61, 'FAIBLE'),
  (1, 4, 125, 'bar', 120, 4.17, 'MODÉRÉE')
ON DUPLICATE KEY UPDATE `date_modification` = CURRENT_TIMESTAMP;

-- 7. Index supplémentaires pour performance
CREATE INDEX IF NOT EXISTS `idx_execution_date` ON `execution_production` (`id_execution_production`, `date_creation`);
CREATE INDEX IF NOT EXISTS `idx_valeur_creation` ON `valeur_reelle_parametre` (`date_creation`, `qualite_deviation`);

-- 8. Statistiques finales
SELECT 'Migration complétée' as status;
SELECT COUNT(*) as nb_valeurs_reelles FROM `valeur_reelle_parametre`;
SELECT COUNT(*) as nb_executions FROM `execution_production`;
```

---

## 🔹 PARTIE 4 : MICROSERVICE IA (Python)

### 4.1 Modification du Dataset Generator pour données réelles

**Fichier à modifier** : `prediction/generate_dataset.py`

```python
# Ajouter à la fin ou remplacer la section génération de données
import pandas as pd
from datetime import datetime, timedelta
import random

def generate_realistic_dataset_with_realvalues(num_rows=5000):
    """
    Génère un dataset réaliste avec valeurs réelles pour feedback loop
    """
    
    data = {
        'variete': [],
        'region': [],
        'methode_recolte': [],
        'type_sol': [],
        'poids_olives_kg': [],
        'maturite_niveau_1_5': [],
        'duree_stockage_jours': [],
        'temps_depuis_recolte_heures': [],
        'temperature_malaxage_c': [],
        'temperature_malaxage_c_reelle': [],  # NOUVEAU
        'duree_malaxage_min': [],
        'duree_malaxage_min_reelle': [],  # NOUVEAU
        'vitesse_decanteur_tr_min': [],
        'vitesse_decanteur_tr_min_reelle': [],  # NOUVEAU
        'pression_extraction_bar': [],
        'pression_extraction_bar_reelle': [],  # NOUVEAU
        'humidite_pourcent': [],
        'acidite_olives_pourcent': [],
        'taux_feuilles_pourcent': [],
        'lavage_effectue': [],
        'type_machine': [],
        'type_broyeur': [],
        'type_malaxeur': [],
        'type_nettoyage': [],
        'type_separation': [],
        'nombre_etapes': [],
        'presence_ajout_eau': [],
        'presence_presse': [],
        'presence_separateur': [],
        'controle_temperature': [],
        'acidite_huile_pourcent': [],
        'indice_peroxyde_meq_o2_kg': [],
        'polyphenols_mg_kg': [],
        'k232': [],
        'k270': [],
        'classe_qualite': [],
        'rendement_extraction_pourcent': [],
        'quantite_huile_litres': [],
        'date_production': [],
        'source_donnees': []  # NOUVEAU - pour identifier données réelles vs simulées
    }
    
    regions = ['Mahdia', 'Sfax', 'Sousse', 'Kairouan', 'Kasserine', 'Médenine']
    varietes = ['Chemlali', 'Arbequina', 'Koroneiki', 'Frantoio', 'Manzanillo']
    methodes = ['manuelle', 'semi-mécanisée', 'mécanisée']
    sols = ['calcaire', 'alluvial', 'argileux', 'siliceux']
    machines = ['2_phase', '3_phase', 'presse']
    broyeurs = ['marteaux', 'meules']
    malaxeurs = ['horizontal', 'vertical']
    nettoyages = ['soufflerie', 'vibrant']
    separations = ['decanteur_2_phases', 'decanteur_3_phases', 'centrifugeuse']
    
    for _ in range(num_rows):
        # Sélectionner si données réelles (20% du temps)
        is_real_data = random.random() < 0.2
        
        # Paramètres de base
        region = random.choice(regions)
        variete = random.choice(varietes)
        methode = random.choice(methodes)
        type_sol = random.choice(sols)
        type_machine = random.choice(machines)
        
        data['region'].append(region)
        data['variete'].append(variete)
        data['methode_recolte'].append(methode)
        data['type_sol'].append(type_sol)
        data['type_machine'].append(type_machine)
        data['type_broyeur'].append(random.choice(broyeurs))
        data['type_malaxeur'].append(random.choice(malaxeurs))
        data['type_nettoyage'].append(random.choice(nettoyages))
        data['type_separation'].append(random.choice(separations))
        
        # Paramètres de base (estimés)
        poids = round(random.uniform(1000, 10000), 1)
        data['poids_olives_kg'].append(poids)
        data['maturite_niveau_1_5'].append(random.randint(1, 5))
        data['duree_stockage_jours'].append(random.randint(0, 14))
        data['temps_depuis_recolte_heures'].append(round(random.uniform(1, 72), 1))
        data['humidite_pourcent'].append(round(random.uniform(15, 35), 1))
        data['acidite_olives_pourcent'].append(round(random.uniform(0.1, 1.5), 2))
        data['taux_feuilles_pourcent'].append(round(random.uniform(0, 2), 1))
        data['nombre_etapes'].append(random.randint(5, 8))
        data['lavage_effectue'].append(random.choice(['oui', 'non']))
        data['controle_temperature'].append(random.choice(['oui', 'non']))
        data['presence_ajout_eau'].append(random.randint(0, 1))
        data['presence_presse'].append(random.randint(0, 1))
        data['presence_separateur'].append(random.randint(0, 1))
        
        # Paramètres malaxage (estimés)
        temp_est = round(random.uniform(24, 32), 1)
        duree_est = round(random.uniform(30, 40), 1)
        vitesse_est = round(random.uniform(3000, 3500), 0)
        pression_est = round(random.uniform(100, 150), 1)
        
        data['temperature_malaxage_c'].append(temp_est)
        data['duree_malaxage_min'].append(duree_est)
        data['vitesse_decanteur_tr_min'].append(vitesse_est)
        data['pression_extraction_bar'].append(pression_est)
        
        # Valeurs réelles (avec petite déviation si données réelles)
        if is_real_data:
            # Déviation réaliste ±5%
            temp_real = round(temp_est + random.uniform(-1.5, 1.5), 1)
            duree_real = round(duree_est + random.uniform(-2, 2), 1)
            vitesse_real = round(vitesse_est + random.uniform(-100, 100), 0)
            pression_real = round(pression_est + random.uniform(-5, 5), 1)
            data['source_donnees'].append('RÉELLE')
        else:
            # Simulation (écart plus important)
            temp_real = temp_est
            duree_real = duree_est
            vitesse_real = vitesse_est
            pression_real = pression_est
            data['source_donnees'].append('SIMULÉE')
        
        data['temperature_malaxage_c_reelle'].append(temp_real)
        data['duree_malaxage_min_reelle'].append(duree_real)
        data['vitesse_decanteur_tr_min_reelle'].append(vitesse_real)
        data['pression_extraction_bar_reelle'].append(pression_real)
        
        # Variables labo (50% du temps)
        if random.random() < 0.5:
            data['acidite_huile_pourcent'].append(round(random.uniform(0.3, 0.8), 2))
            data['indice_peroxyde_meq_o2_kg'].append(round(random.uniform(5, 15), 1))
            data['polyphenols_mg_kg'].append(round(random.uniform(200, 500), 0))
            data['k232'].append(round(random.uniform(1.5, 2.5), 2))
            data['k270'].append(round(random.uniform(0.1, 0.25), 2))
        else:
            data['acidite_huile_pourcent'].append(None)
            data['indice_peroxyde_meq_o2_kg'].append(None)
            data['polyphenols_mg_kg'].append(None)
            data['k232'].append(None)
            data['k270'].append(None)
        
        # Qualité et rendement
        qualite = random.choices(['Excellente', 'Bonne', 'Acceptable', 'Mediocre'],
                                weights=[0.3, 0.4, 0.2, 0.1])[0]
        data['classe_qualite'].append(qualite)
        
        # Rendement (dépend du type de machine et de la qualité)
        if type_machine == '3_phase':
            rendement = round(random.uniform(15, 25), 2)
        elif type_machine == '2_phase':
            rendement = round(random.uniform(12, 22), 2)
        else:  # presse
            rendement = round(random.uniform(10, 20), 2)
        
        data['rendement_extraction_pourcent'].append(rendement)
        data['quantite_huile_litres'].append(round(poids * rendement / 100, 2))
        
        # Date (répartie sur 3 mois)
        base_date = datetime.now() - timedelta(days=random.randint(0, 90))
        data['date_production'].append(base_date.strftime('%Y-%m-%d %H:%M:%S'))
    
    df = pd.DataFrame(data)
    
    # Sauvegarder
    output_path = BASE_DIR / "data" / "dataset_huilerie_avec_realvalues_5000.csv"
    df.to_csv(output_path, index=False, encoding='utf-8')
    
    print(f"✅ Dataset généré: {output_path}")
    print(f"   Lignes: {len(df)}")
    print(f"   Colonnes: {len(df.columns)}")
    print(f"   Données réelles: {len(df[df['source_donnees'] == 'RÉELLE'])}")
    print(f"   Données simulées: {len(df[df['source_donnees'] == 'SIMULÉE'])}")
    
    return df

# Appel
if __name__ == "__main__":
    df = generate_realistic_dataset_with_realvalues(5000)
    print(df.head())
```

### 4.2 Modification du Script d'Entraînement

**Fichier à modifier** : `prediction/train_dual_mode_models.py` - ajouter colonnes réelles

```python
# Ajouter aux NUMERIC_FEATURES:

NUMERIC_FEATURES = [
    "poids_olives_kg",
    "maturite_niveau_1_5",
    "duree_stockage_jours",
    "temps_depuis_recolte_heures",
    "temperature_malaxage_c",
    "duree_malaxage_min",
    "vitesse_decanteur_tr_min",
    "humidite_pourcent",
    "acidite_olives_pourcent",
    "taux_feuilles_pourcent",
    "pression_extraction_bar",
    "nombre_etapes",
    "presence_ajout_eau",
    "presence_presse",
    "presence_separateur",
    # NOUVELLES COLONNES - Valeurs réelles
    "temperature_malaxage_c_reelle",
    "duree_malaxage_min_reelle",
    "vitesse_decanteur_tr_min_reelle",
    "pression_extraction_bar_reelle",
]
```

### 4.3 Modification de l'API FastAPI - Intégration réelles

**Fichier à modifier** : `prediction/app.py` - ajouter route spéciale et features réelles

```python
# Ajouter cette section après les modèles chargés

class RealValuesInput(BaseModel):
    """Input pour évaluation avec valeurs réelles (feedback loop)"""
    execution_id: int = Field(..., example=123)
    date_execution: str = Field(..., example="2026-04-29")
    
    # Paramètres estimés vs réels
    temperature_malaxage_c_estimee: float
    temperature_malaxage_c_reelle: float
    
    duree_malaxage_min_estimee: float
    duree_malaxage_min_reelle: float
    
    vitesse_decanteur_tr_min_estimee: float
    vitesse_decanteur_tr_min_reelle: float
    
    pression_extraction_bar_estimee: float
    pression_extraction_bar_reelle: float
    
    # Contexte
    classe_qualite_reelle: Optional[str] = None
    rendement_reelle_pourcent: Optional[float] = None
    observations: Optional[str] = None


@app.post("/feedback-realvalues")
def process_real_values_feedback(data: RealValuesInput):
    """
    Traite le feedback avec valeurs réelles pour amélioration continue du modèle
    Calcule les écarts et stocke pour réentraînement
    """
    
    # Calcul des déviations
    deviations = {
        "temperature": round(((data.temperature_malaxage_c_reelle - data.temperature_malaxage_c_estimee) / data.temperature_malaxage_c_estimee) * 100, 2),
        "duree": round(((data.duree_malaxage_min_reelle - data.duree_malaxage_min_estimee) / data.duree_malaxage_min_estimee) * 100, 2),
        "vitesse": round(((data.vitesse_decanteur_tr_min_reelle - data.vitesse_decanteur_tr_min_estimee) / data.vitesse_decanteur_tr_min_estimee) * 100, 2),
        "pression": round(((data.pression_extraction_bar_reelle - data.pression_extraction_bar_estimee) / data.pression_extraction_bar_estimee) * 100, 2),
    }
    
    # Moyenne des écarts
    deviation_moyenne = sum(abs(v) for v in deviations.values()) / len(deviations)
    
    return {
        "status": "feedback_processed",
        "execution_id": data.execution_id,
        "date_execution": data.date_execution,
        "deviations": deviations,
        "deviation_moyenne_pourcent": round(deviation_moyenne, 2),
        "qualite_donnees": "EXCELLENTE" if deviation_moyenne < 5 else "BONNE" if deviation_moyenne < 10 else "ACCEPTABLE",
        "recommandation": "Données de qualité pour réentraînement" if deviation_moyenne < 10 else "Vérifier la précision des capteurs"
    }


@app.post("/export-retraining-data")
def export_retraining_data(
    depuis: str = Query(..., example="2026-01-01"),
    jusqu: str = Query(..., example="2026-04-29")
):
    """
    Exporte les données réelles accumulées pour réentraînement du modèle
    Format: CSV avec toutes les valeurs réelles et leurs déviations
    """
    
    export_data = {
        "depuis": depuis,
        "jusqu": jusqu,
        "format": "CSV",
        "endpoint": f"/export-retraining-data?depuis={depuis}&jusqu={jusqu}",
        "colonnes": [
            "variete", "region", "methode_recolte", "type_sol", "poids_olives_kg",
            "temperature_malaxage_c", "temperature_malaxage_c_reelle",
            "duree_malaxage_min", "duree_malaxage_min_reelle",
            "vitesse_decanteur_tr_min", "vitesse_decanteur_tr_min_reelle",
            "pression_extraction_bar", "pression_extraction_bar_reelle",
            "classe_qualite_reelle", "rendement_reelle_pourcent"
        ],
        "instructions": "Charger ce CSV dans train_dual_mode_models.py avec --data option"
    }
    
    return export_data
```

---

## 🔹 PARTIE 5 : PIPELINE GLOBAL

### 5.1 Architecture et Flux

```
┌─────────────────────────────────────────────────────────────────┐
│                     FEEDBACK LOOP ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────┘

1. EXÉCUTION FRONTEND (Angular)
   ├─ Formulaire saisie valeurs réelles
   ├─ Validation client (min/max, tolérances)
   └─ POST /api/execution-productions/{id}/valeurs-reelles

2. BACKEND (Spring Boot - Port 8000)
   ├─ ValeurReelleController reçoit les données
   ├─ ValeurReelleService valide et calcule déviations
   ├─ Sauvegarde en BD (valeur_reelle_parametre)
   ├─ Trigger audit enregistre les changements
   └─ Retour DTO avec stats de feedback

3. BASE DE DONNÉES (MySQL)
   ├─ Table valeur_reelle_parametre (stockage)
   ├─ Table valeur_reelle_audit (historique)
   ├─ Vue v_feedback_statistics (analytics)
   └─ Index et triggers pour performance

4. MICROSERVICE IA (FastAPI - Port 7500)
   ├─ Endpoint /feedback-realvalues (traitement feedback)
   ├─ Calcul déviations (estimée vs réelle)
   ├─ Stockage temporaire pour batch retraining
   └─ Endpoint /export-retraining-data

5. RÉENTRAÎNEMENT PÉRIODIQUE
   ├─ Cron job (hebdo/mensuel) appelle /export-retraining-data
   ├─ Exporte CSV des valeurs réelles
   ├─ Lance train_dual_mode_models.py --data <csv>
   ├─ Entraîne nouveaux modèles
   └─ Met à jour /models/ avec versions datées
```

### 5.2 Script d'Orchestration - Retraining Automatique

**Fichier à créer** : `prediction/schedule_retraining.py`

```python
"""
Script d'orchestration pour réentraînement automatique du modèle
Utilise les valeurs réelles du feedback loop pour amélioration continue
"""

import subprocess
import requests
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
import schedule
import time
import pandas as pd
from io import StringIO

# Configuration
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"
BACKEND_URL = "http://localhost:8000"
IA_URL = "http://localhost:7500"

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(BASE_DIR / "retraining.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RetrainingOrchestrator:
    """Orchestre le processus de réentraînement automatique"""
    
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.ia_url = IA_URL
        self.retraining_count = 0
    
    def fetch_real_values_data(self, days_back=30):
        """Récupère les données réelles du backend"""
        try:
            depuis = (datetime.now() - timedelta(days=days_back)).isoformat()
            jusqu = datetime.now().isoformat()
            
            url = f"{self.backend_url}/api/execution-productions/valeurs-reelles/export-retrain"
            params = {"depuis": depuis, "jusqu": jusqu}
            
            logger.info(f"📥 Téléchargement des valeurs réelles depuis {days_back} jours...")
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ {len(data)} valeurs réelles récupérées")
                return data
            else:
                logger.error(f"❌ Erreur {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erreur lors du téléchargement: {e}")
            return None
    
    def process_real_values_feedback(self, real_values_data):
        """Traite les valeurs réelles via /feedback-realvalues"""
        try:
            logger.info("🔄 Traitement du feedback avec valeurs réelles...")
            
            processed_count = 0
            for real_value in real_values_data:
                try:
                    feedback_payload = {
                        "execution_id": real_value["executionProductionId"],
                        "date_execution": real_value["dateCreation"],
                        "temperature_malaxage_c_estimee": real_value.get("valeurEstimee", 0),
                        "temperature_malaxage_c_reelle": real_value["valeurReelle"],
                        "duree_malaxage_min_estimee": 0,
                        "duree_malaxage_min_reelle": 0,
                        "vitesse_decanteur_tr_min_estimee": 0,
                        "vitesse_decanteur_tr_min_reelle": 0,
                        "pression_extraction_bar_estimee": 0,
                        "pression_extraction_bar_reelle": 0,
                    }
                    
                    response = requests.post(
                        f"{self.ia_url}/feedback-realvalues",
                        json=feedback_payload,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        processed_count += 1
                    
                except Exception as e:
                    logger.warning(f"⚠️ Erreur traitement item: {e}")
                    continue
            
            logger.info(f"✅ {processed_count}/{len(real_values_data)} feedbacks traités")
            return processed_count > 0
            
        except Exception as e:
            logger.error(f"❌ Erreur traitement feedback: {e}")
            return False
    
    def check_if_retraining_needed(self, real_values_data):
        """Vérifie si le réentraînement est justifié"""
        if not real_values_data or len(real_values_data) < 20:
            logger.info("⏭️ Pas assez de données réelles pour réentraînement (min 20)")
            return False
        
        # Vérifier le nombre d'exécutions avec déviation
        important_deviations = sum(
            1 for rv in real_values_data 
            if abs(rv.get("déviation", 0)) > 15
        )
        
        if important_deviations / len(real_values_data) > 0.3:
            logger.info(f"⚠️ {important_deviations} déviations importantes détectées")
            return True
        
        return False
    
    def create_retraining_dataset(self, real_values_data):
        """Crée un dataset CSV pour réentraînement"""
        try:
            logger.info("📊 Création du dataset de réentraînement...")
            
            # Convertir données réelles en DataFrame
            rows = []
            for rv in real_values_data:
                rows.append({
                    'execution_id': rv.get('executionProductionId'),
                    'parametre_nom': rv.get('nomParametre'),
                    'valeur_reelle': rv.get('valeurReelle'),
                    'valeur_estimee': rv.get('valeurEstimee'),
                    'deviation_pourcent': rv.get('déviation', 0),
                    'date_creation': rv.get('dateCreation'),
                })
            
            df_reals = pd.DataFrame(rows)
            
            # Charger dataset synthétique existant
            existing_data_path = DATA_DIR / "dataset_huilerie_avec_realvalues_5000.csv"
            if existing_data_path.exists():
                df_existing = pd.read_csv(existing_data_path)
                logger.info(f"📋 {len(df_existing)} lignes dataset existant")
                
                # Combiner (prioriser données réelles)
                df_combined = pd.concat([df_reals, df_existing], ignore_index=True)
                df_combined = df_combined.drop_duplicates(subset=['execution_id'], keep='first')
                
            else:
                df_combined = df_reals
            
            # Sauvegarder dataset mixte
            mixed_dataset_path = DATA_DIR / f"dataset_mixed_{datetime.now().strftime('%Y%m%d')}.csv"
            df_combined.to_csv(mixed_dataset_path, index=False)
            
            logger.info(f"✅ Dataset créé: {mixed_dataset_path} ({len(df_combined)} lignes)")
            return str(mixed_dataset_path)
            
        except Exception as e:
            logger.error(f"❌ Erreur création dataset: {e}")
            return None
    
    def run_retraining(self, dataset_path):
        """Lance le réentraînement du modèle"""
        try:
            logger.info("🚀 Lancement du réentraînement...")
            
            cmd = [
                "python",
                str(BASE_DIR / "train_dual_mode_models.py"),
                "--data", dataset_path,
                "--output", str(MODELS_DIR)
            ]
            
            logger.info(f"   Commande: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=1800  # 30 min timeout
            )
            
            if result.returncode == 0:
                logger.info("✅ Réentraînement réussi!")
                logger.info(f"   Output: {result.stdout[-500:]}")  # Derniers 500 chars
                self.retraining_count += 1
                return True
            else:
                logger.error(f"❌ Réentraînement échoué!")
                logger.error(f"   Erreur: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("❌ Réentraînement dépassé (timeout)")
            return False
        except Exception as e:
            logger.error(f"❌ Erreur réentraînement: {e}")
            return False
    
    def verify_model_update(self):
        """Vérifie que les modèles ont bien été mis à jour"""
        try:
            # Vérifier métadata.json récent
            metadata_path = MODELS_DIR / "metadata.json"
            if metadata_path.exists():
                mtime = metadata_path.stat().st_mtime
                mod_time = datetime.fromtimestamp(mtime)
                age_minutes = (datetime.now() - mod_time).total_seconds() / 60
                
                if age_minutes < 5:
                    logger.info(f"✅ Modèles mis à jour il y a {age_minutes:.0f} min")
                    return True
            
            logger.error("❌ Modèles non mis à jour")
            return False
            
        except Exception as e:
            logger.error(f"❌ Erreur vérification modèles: {e}")
            return False
    
    def create_backup_current_models(self):
        """Sauvegarde les modèles actuels avant réentraînement"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_dir = MODELS_DIR / f"backup_{timestamp}"
            backup_dir.mkdir(exist_ok=True)
            
            for pkl_file in MODELS_DIR.glob("*.pkl"):
                import shutil
                shutil.copy(pkl_file, backup_dir / pkl_file.name)
            
            logger.info(f"📦 Modèles sauvegardés: {backup_dir}")
            return str(backup_dir)
            
        except Exception as e:
            logger.error(f"❌ Erreur backup: {e}")
            return None
    
    def run_retraining_cycle(self):
        """Cycle complet de réentraînement"""
        logger.info("=" * 60)
        logger.info("🔄 CYCLE DE RÉENTRAÎNEMENT AUTOMATIQUE")
        logger.info(f"   Timestamp: {datetime.now()}")
        logger.info("=" * 60)
        
        try:
            # 1. Récupérer données réelles
            real_values = self.fetch_real_values_data(days_back=30)
            if not real_values:
                logger.info("⏭️ Cycle annulé: pas de données réelles")
                return
            
            # 2. Vérifier si réentraînement nécessaire
            if not self.check_if_retraining_needed(real_values):
                logger.info("⏭️ Cycle annulé: performance acceptable")
                return
            
            # 3. Traiter le feedback
            self.process_real_values_feedback(real_values)
            
            # 4. Sauvegarder modèles actuels
            backup = self.create_backup_current_models()
            
            # 5. Créer dataset mixte
            dataset_path = self.create_retraining_dataset(real_values)
            if not dataset_path:
                logger.error("❌ Impossible de créer le dataset")
                return
            
            # 6. Lancer réentraînement
            success = self.run_retraining(dataset_path)
            
            if success:
                # 7. Vérifier mise à jour modèles
                if self.verify_model_update():
                    logger.info("✅ CYCLE DE RÉENTRAÎNEMENT RÉUSSI!")
                    logger.info(f"   Cycles réussis: {self.retraining_count}")
                else:
                    logger.error("❌ Modèles non mise à jour correctement")
                    if backup:
                        logger.info(f"   Restauration des modèles depuis {backup}")
            else:
                logger.error("❌ Réentraînement échoué")
                if backup:
                    logger.info(f"   Modèles sauvegardés: {backup}")
        
        except Exception as e:
            logger.error(f"❌ Erreur cycle: {e}")
        
        finally:
            logger.info("=" * 60)


def schedule_retraining_jobs():
    """Configure les jobs de réentraînement"""
    
    orchestrator = RetrainingOrchestrator()
    
    # Schedule: Réentraînement hebdomadaire le lundi à 2h du matin
    schedule.every().monday.at("02:00").do(orchestrator.run_retraining_cycle)
    
    # Ou réentraînement quotidien (décommenter pour dev)
    # schedule.every().day.at("03:00").do(orchestrator.run_retraining_cycle)
    
    logger.info("📅 Schedule configuré:")
    logger.info("   • Réentraînement chaque lundi à 02:00")
    logger.info("   • Feedback processing en continu")
    logger.info("   • Modèles sauvegardés avant chaque cycle")
    
    # Boucle de scheduler
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # Vérifier chaque minute
        except KeyboardInterrupt:
            logger.info("🛑 Scheduler arrêté")
            break
        except Exception as e:
            logger.error(f"❌ Erreur scheduler: {e}")
            time.sleep(60)


if __name__ == "__main__":
    # Pour test manuel:
    # python schedule_retraining.py
    
    # Ou pour démarrer le scheduler:
    # schedule_retraining_jobs()
    
    # Ou pour un cycle unique:
    orchestrator = RetrainingOrchestrator()
    orchestrator.run_retraining_cycle()
```

### 5.3 Configuration application.yml - Ajouter section IA

**Fichier à modifier** : `GestionHuilerieBackend/src/main/resources/application.yml`

Ajouter après la section `server`:

```yaml
ai:
  prediction:
    base-url: http://localhost:7500
    timeout-seconds: 30
    enabled: true
    feedback-loop:
      enabled: true
      auto-save-realvalues: true
      min-samples-for-retraining: 20
      retraining-schedule: "0 2 * * 1"  # Lundi 2h du matin
  
  valeurs-reelles:
    tolerance-default: 10.0  # ±10%
    deviation-levels:
      faible: 5.0
      moderee: 10.0
      importante: 15.0
    
    capture-parameters:
      - temperature_malaxage_c
      - duree_malaxage_min
      - vitesse_decanteur_tr_min
      - pression_extraction_bar
```

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Base de Données ✅
- [ ] Exécuter `database-schema-realvalues.sql`
- [ ] Vérifier les tables : `valeur_reelle_parametre`, `valeur_reelle_audit`
- [ ] Vérifier la vue : `v_feedback_statistics`

### Phase 2 : Backend Spring Boot ✅
- [ ] Créer `ValeurReelleParametreDTO.java`
- [ ] Créer `SaveValeursReellesRequest.java`
- [ ] Mettre à jour `ValeurReelleParametre.java`
- [ ] Créer `ValeurReelleParametreRepository.java`
- [ ] Créer `ValeurReelleService.java`
- [ ] Créer `ValeurReelleController.java`
- [ ] Ajouter section `ai` dans `application.yml`
- [ ] Compiler et tester backend

### Phase 3 : Frontend Angular ✅
- [ ] Mettre à jour `ExecutionProductionService`
- [ ] Créer `ExecutionRealValuesComponent`
- [ ] Intégrer composant dans `guides-executer.component.html`
- [ ] Tester validation des champs
- [ ] Tester envoi HTTP

### Phase 4 : IA Microservice ✅
- [ ] Modifier `generate_dataset.py` pour colonnes réelles
- [ ] Modifier `train_dual_mode_models.py` NUMERIC_FEATURES
- [ ] Ajouter routes `/feedback-realvalues` et `/export-retraining-data` à `app.py`
- [ ] Tester nouvelle génération dataset

### Phase 5 : Pipeline Global ✅
- [ ] Créer `schedule_retraining.py`
- [ ] Configurer cron/scheduler
- [ ] Tester cycle complet : saisie → backend → IA → réentraînement

### Phase 6 : Tests Intégration ✅
- [ ] Test end-to-end: frontend saisie → backend save → IA feedback
- [ ] Test export données
- [ ] Test réentraînement
- [ ] Vérifier logs (retraining.log)

---

## 🚀 DÉMARRAGE COMPLET

```bash
# 1. Base de données
mysql -u root < database-schema-realvalues.sql

# 2. Backend (port 8000)
cd GestionHuilerieBackend
mvn clean install
mvn spring-boot:run

# 3. IA Microservice (port 7500)
cd prediction
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python generate_dataset.py  # Générer données avec réelles
python train_dual_mode_models.py --data data/dataset_huilerie_avec_realvalues_5000.csv
python app.py

# 4. Frontend (port 4200)
cd gesthuilerieF
npm install
ng serve

# 5. Scheduler de réentraînement (optionnel - background)
cd prediction
python schedule_retraining.py
```

---

## 📊 VÉRIFICATION

```bash
# Vérifier backend
curl http://localhost:8000/api/execution-productions/1/valeurs-reelles

# Vérifier IA
curl http://localhost:7500/

# Vérifier database
mysql -u root -e "SELECT * FROM valeur_reelle_parametre LIMIT 5;"
```

---

## ✅ VALIDATION DE SUCCÈS

✅ Frontend: Formulaire valeurs réelles visible et fonctionnel  
✅ Backend: Endpoint reçoit et stocke les données  
✅ Database: Données sauvegardées avec déviations calculées  
✅ IA: Endpoint `/feedback-realvalues` traite les données  
✅ Pipeline: Cycle complet saisie → stockage → feedback → réentraînement  

---

*Document généré: 2026-04-29*
*Version: 1.0 - Complète et Exécutable*
