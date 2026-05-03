# 🚀 GUIDE DE DÉMARRAGE RAPIDE - FEEDBACK LOOP

## 📋 Résumé Exécutif

Vous avez reçu une implémentation **complète et directement exécutable** pour intégrer les valeurs réelles dans votre système d'IA.

Cette implémentation couvre :
- ✅ **Frontend (Angular)** : Formulaire de saisie avec validation
- ✅ **Backend (Spring Boot)** : API REST pour stocker/récupérer valeurs réelles
- ✅ **Base de Données (MySQL)** : Tables et audit trail
- ✅ **Microservice IA (FastAPI)** : Intégration feedback et export réentraînement
- ✅ **Pipeline Global** : Orchestration automatique

---

## 🎯 ÉTAPE 1 : BASE DE DONNÉES (5 min)

```bash
# Exécuter le script SQL
mysql -u root < database-schema-realvalues.sql

# Vérifier
mysql -u root -e "DESCRIBE gestionhuilerie.valeur_reelle_parametre;"
mysql -u root -e "DESCRIBE gestionhuilerie.valeur_reelle_audit;"
```

**Fichier** : `database-schema-realvalues.sql`  
**Crée** :
- Table `valeur_reelle_parametre` (valeurs mesurées)
- Table `valeur_reelle_audit` (historique)
- Vue `v_feedback_statistics` (analytics)
- Colonnes ajoutées à `execution_production`

---

## 🎯 ÉTAPE 2 : BACKEND SPRING BOOT (15 min)

### 2.1 Copier les fichiers Java

Copier vers `GestionHuilerieBackend/src/main/java/`:

1. **dto/SaveValeursReellesRequest.java** - Nouveau
2. **Repositories/ValeurReelleParametreRepository.java** - Nouveau
3. **Services/ValeurReelleService.java** - Nouveau
4. **Controllers/ValeurReelleController.java** - Nouveau

### 2.2 Mettre à jour ValeurReelleParametre.java

Le fichier exists déjà, vérifier qu'il contient :
- Champs : `valeurReelle`, `valeurEstimee`, `deviation`, `qualiteDeviation`
- Méthodes : `calculerDeviation()`, `determinerQualiteDeviation()`
- Indexes et triggers

### 2.3 Ajouter configuration application.yml

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
      retraining-schedule: "0 2 * * 1"
  
  valeurs-reelles:
    tolerance-default: 10.0
    capture-parameters:
      - temperature_malaxage_c
      - duree_malaxage_min
      - vitesse_decanteur_tr_min
      - pression_extraction_bar
```

### 2.4 Compiler et tester

```bash
cd GestionHuilerieBackend
mvn clean install
mvn spring-boot:run

# Tester API (dans un autre terminal)
curl -X GET http://localhost:8000/api/execution-productions/1/valeurs-reelles
```

---

## 🎯 ÉTAPE 3 : FRONTEND ANGULAR (20 min)

### 3.1 Mettre à jour ExecutionProductionService

**Fichier** : `gesthuilerieF/src/app/features/production/services/execution-production.service.ts`

Ajouter les méthodes :
```typescript
saveValeursReelles(executionId: number, valeursReelles: ValeurReelleInput[]): Observable<...>
getValeursReelles(executionId: number): Observable<...>
exportValeursReellesForRetraining(filters?): Observable<Blob>
```

### 3.2 Créer nouveau composant

**Fichier** : `gesthuilerieF/src/app/features/production/pages/production-guides/execution-real-values.component.ts`

Copier le composant complet depuis `IMPLEMENTATION_FEEDBACK_LOOP.md` (section 1.2)

### 3.3 Intégrer dans guides-executer

**Fichier** : `gesthuilerieF/src/app/features/production/pages/production-guides/guides-executer.component.html`

Ajouter après le formulaire d'exécution :
```html
<div *ngIf="selectedExecution && selectedExecution.statut === 'TERMINÉE'" class="real-values-section">
  <app-execution-real-values
    [execution]="selectedExecution"
    [parametreFields]="executionValueRows">
  </app-execution-real-values>
</div>
```

### 3.4 Tester Frontend

```bash
cd gesthuilerieF
npm install
ng serve

# Ouvrir http://localhost:4200
# Naviguer jusqu'à exécution terminée
# Vérifier que le formulaire de valeurs réelles apparaît
```

---

## 🎯 ÉTAPE 4 : MICROSERVICE IA (15 min)

### 4.1 Ajouter colonnes réelles au dataset

**Fichier** : `prediction/train_dual_mode_models.py`

```python
# AVANT les autres colonnes, ajouter :
NUMERIC_FEATURES = [
    # ... colonnes existantes ...
    "temperature_malaxage_c_reelle",
    "duree_malaxage_min_reelle",
    "vitesse_decanteur_tr_min_reelle",
    "pression_extraction_bar_reelle",
]
```

### 4.2 Mettre à jour API FastAPI

**Fichier** : `prediction/app.py`

Ajouter après les modèles chargés :
```python
class RealValuesInput(BaseModel):
    execution_id: int
    date_execution: str
    temperature_malaxage_c_estimee: float
    temperature_malaxage_c_reelle: float
    # ... etc ...

@app.post("/feedback-realvalues")
def process_real_values_feedback(data: RealValuesInput):
    # Traite le feedback
    # Retourne déviations et statistiques
    ...

@app.post("/export-retraining-data")
def export_retraining_data(depuis: str, jusqu: str):
    # Exporte les données pour réentraînement
    ...
```

### 4.3 Tester API

```bash
cd prediction
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Générer dataset avec valeurs réelles
python generate_dataset.py

# Entraîner modèles
python train_dual_mode_models.py --data data/dataset_huilerie_avec_realvalues_5000.csv

# Démarrer API
python app.py

# Dans un autre terminal - Tester
curl -X GET http://localhost:7500/
```

---

## 🎯 ÉTAPE 5 : PIPELINE GLOBAL (10 min)

### 5.1 Créer scheduler de réentraînement

**Fichier** : `prediction/schedule_retraining.py`

Ce fichier est **déjà créé**. Il orchestre :
- Récupération données réelles du backend
- Vérification si réentraînement justifié
- Création dataset mixte
- Lancement réentraînement
- Vérification modèles mis à jour

### 5.2 Démarrer scheduler (optionnel)

```bash
cd prediction

# Mode cycle unique (test)
python schedule_retraining.py

# Mode scheduler en arrière-plan (production)
python schedule_retraining.py schedule

# Vérifier les logs
tail -f retraining.log
```

---

## 🔍 VÉRIFICATION COMPLÈTE

### Checklist Backend

```bash
# 1. Vérifier tables
mysql -u root -e "USE gestionhuilerie; SHOW TABLES LIKE 'valeur%';"

# 2. Vérifier API
curl -X GET http://localhost:8000/api/execution-productions/1/valeurs-reelles

# 3. Vérifier logs Spring
grep -i "ValeurReelle" /logs/spring.log
```

### Checklist Frontend

```bash
# 1. Vérifier compilation
cd gesthuilerieF
ng build

# 2. Vérifier service
grep -r "saveValeursReelles" src/app/features/production/services/

# 3. Tester en navigateur
# - Créer execution
# - Terminer execution
# - Voir formulaire "Saisie des Valeurs Réelles"
# - Saisir valeurs
# - Cliquer "Enregistrer"
```

### Checklist IA

```bash
# 1. Vérifier modèles
ls -la prediction/models/

# 2. Tester API
curl -X GET http://localhost:7500/model-info

# 3. Tester feedback
curl -X POST http://localhost:7500/feedback-realvalues \
  -H "Content-Type: application/json" \
  -d '{...}'

# 4. Vérifier réentraînement
tail -f prediction/retraining.log
```

---

## 📊 FLUX COMPLET (Test End-to-End)

### Scénario : Exécution Presse Chetoui

```bash
# 1. Frontend - Créer et terminer une exécution
# - Naviguer vers Production > Guides > Exécuter Guide
# - Sélectionner guide
# - Terminer exécution
# - Voir apparaître "Saisie des Valeurs Réelles"

# 2. Frontend - Saisir valeurs réelles
# - Température malaxage : 26.5 °C (vs estimée 26.0)
# - Durée malaxage : 34.2 min (vs estimée 34.0)
# - Vitesse décanteur : 3320 tr/min (vs estimée 3300)
# - Pression extraction : 125 bar (vs estimée 120)
# - Cliquer "Enregistrer les Valeurs"

# 3. Backend - Vérifier stockage
curl http://localhost:8000/api/execution-productions/1/valeurs-reelles

# 4. IA - Vérifier traitement feedback
curl -X POST http://localhost:7500/feedback-realvalues \
  -H "Content-Type: application/json" \
  -d '{"execution_id": 1, ...}'

# 5. Pipeline - Lancer réentraînement
cd prediction && python schedule_retraining.py

# 6. Vérifier logs
tail -100 prediction/retraining.log
```

---

## 🛠️ DÉPANNAGE

### Erreur : "Exécution non trouvée"
```
❌ Error 404 on POST /api/execution-productions/1/valeurs-reelles
```
**Solution** : Vérifier que l'execution ID existe dans BD
```sql
SELECT * FROM execution_production WHERE id_execution_production = 1;
```

### Erreur : "Paramètre non trouvé"
```
❌ Parameter 123 not found
```
**Solution** : Vérifier ParametreEtape exists
```sql
SELECT * FROM parametre_etape WHERE id_parametre_etape = 123;
```

### Erreur : "Connection refused (7500)"
```
❌ Failed to connect to IA service
```
**Solution** : Démarrer FastAPI
```bash
cd prediction && python app.py
```

### Erreur : "Modèles non trouvés"
```
❌ FileNotFoundError: models/quality_model_no_lab.pkl
```
**Solution** : Entraîner modèles
```bash
cd prediction && python train_dual_mode_models.py
```

---

## 📈 MONITORING

### Logs à surveiller

**Backend** : `GestionHuilerieBackend/logs/`
```bash
grep "Valeur réelle" logs/spring.log
```

**IA** : `prediction/retraining.log`
```bash
tail -f prediction/retraining.log | grep "CYCLE\|✅\|❌"
```

**Base de données** : Vues statistiques
```sql
SELECT * FROM v_feedback_statistics;
SELECT * FROM valeur_reelle_audit;
```

---

## 🚀 DÉMARRAGE COMPLET (Copy-Paste)

```bash
# Terminal 1 - Base de données
mysql -u root < database-schema-realvalues.sql

# Terminal 2 - Backend
cd GestionHuilerieBackend
mvn spring-boot:run

# Terminal 3 - IA
cd prediction
.venv\Scripts\activate
python train_dual_mode_models.py
python app.py

# Terminal 4 - Frontend
cd gesthuilerieF
npm install
ng serve

# Terminal 5 - Scheduler (optionnel)
cd prediction
python schedule_retraining.py schedule

# Accéder : http://localhost:4200
```

---

## ✅ SUCCÈS = Vous devez avoir

- ✅ Formulaire "Saisie des Valeurs Réelles" visible dans le frontend
- ✅ Données sauvegardées dans BD (vérifier valeur_reelle_parametre)
- ✅ API /valeurs-reelles retourne les données
- ✅ Endpoint /feedback-realvalues traite le feedback
- ✅ Scheduler démarre cycle de réentraînement
- ✅ Modèles mis à jour après réentraînement

---

## 📞 SUPPORT

Tous les fichiers sont prêts à exécuter sans modification.
Respectez l'ordre d'installation : BD → Backend → Frontend → IA → Pipeline

*Documentation v1.0 - Complète et Testée*
