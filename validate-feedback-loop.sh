#!/bin/bash

# ============================================
# SCRIPT DE VALIDATION - FEEDBACK LOOP
# ============================================
# Vérifie que tous les composants sont correctement installés
# Usage: bash validate-feedback-loop.sh

echo "=========================================="
echo "🔍 VALIDATION - FEEDBACK LOOP"
echo "=========================================="
echo ""

PASS=0
FAIL=0

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function check_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASS++))
}

function check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAIL++))
}

function check_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ========================================
# 1. VÉRIFICATIONS BASE DE DONNÉES
# ========================================
echo ""
echo "1️⃣  BASE DE DONNÉES (MySQL)"
echo "=========================================="

if command -v mysql &> /dev/null; then
    check_success "MySQL client installé"
    
    # Vérifier tables
    if mysql -u root -e "DESCRIBE gestionhuilerie.valeur_reelle_parametre" &> /dev/null; then
        check_success "Table valeur_reelle_parametre existe"
    else
        check_fail "Table valeur_reelle_parametre manquante (Exécuter: mysql -u root < database-schema-realvalues.sql)"
    fi
    
    if mysql -u root -e "DESCRIBE gestionhuilerie.valeur_reelle_audit" &> /dev/null; then
        check_success "Table valeur_reelle_audit existe"
    else
        check_fail "Table valeur_reelle_audit manquante"
    fi
    
    if mysql -u root -e "SHOW VIEWS FROM gestionhuilerie LIKE 'v_feedback_statistics'" &> /dev/null; then
        check_success "Vue v_feedback_statistics existe"
    else
        check_fail "Vue v_feedback_statistics manquante"
    fi
else
    check_fail "MySQL client non trouvé (Installer: apt-get install mysql-client)"
fi

# ========================================
# 2. VÉRIFICATIONS BACKEND
# ========================================
echo ""
echo "2️⃣  BACKEND (Spring Boot)"
echo "=========================================="

if [ -f "GestionHuilerieBackend/src/main/java/dto/SaveValeursReellesRequest.java" ]; then
    check_success "SaveValeursReellesRequest.java existe"
else
    check_fail "SaveValeursReellesRequest.java manquant"
fi

if [ -f "GestionHuilerieBackend/src/main/java/Repositories/ValeurReelleParametreRepository.java" ]; then
    check_success "ValeurReelleParametreRepository.java existe"
else
    check_fail "ValeurReelleParametreRepository.java manquant"
fi

if [ -f "GestionHuilerieBackend/src/main/java/Services/ValeurReelleService.java" ]; then
    check_success "ValeurReelleService.java existe"
else
    check_fail "ValeurReelleService.java manquant"
fi

if [ -f "GestionHuilerieBackend/src/main/java/Controllers/ValeurReelleController.java" ]; then
    check_success "ValeurReelleController.java existe"
else
    check_fail "ValeurReelleController.java manquant"
fi

# Vérifier application.yml
if grep -q "ai:" GestionHuilerieBackend/src/main/resources/application.yml; then
    check_success "Section [ai] dans application.yml"
else
    check_warning "Section [ai] non trouvée dans application.yml (Ajouter manuellement)"
fi

# Vérifier Maven
if command -v mvn &> /dev/null; then
    check_success "Maven installé"
    
    # Essayer compiler
    if cd GestionHuilerieBackend && mvn compile &> /dev/null; then
        check_success "Backend compile sans erreurs"
        cd ..
    else
        check_fail "Backend a des erreurs de compilation (Exécuter: cd GestionHuilerieBackend && mvn clean install)"
    fi
else
    check_warning "Maven non trouvé (Installer pour compiler le backend)"
fi

# Vérifier si backend tourne
if curl -s http://localhost:8000/actuator/health &> /dev/null; then
    check_success "Backend tourne (port 8000)"
else
    check_warning "Backend ne répond pas (Lancer: mvn spring-boot:run)"
fi

# ========================================
# 3. VÉRIFICATIONS FRONTEND
# ========================================
echo ""
echo "3️⃣  FRONTEND (Angular)"
echo "=========================================="

if [ -f "gesthuilerieF/src/app/features/production/services/execution-production.service.ts" ]; then
    check_success "execution-production.service.ts existe"
    
    if grep -q "saveValeursReelles" gesthuilerieF/src/app/features/production/services/execution-production.service.ts; then
        check_success "Méthode saveValeursReelles() implémentée"
    else
        check_fail "Méthode saveValeursReelles() manquante (Ajouter à service)"
    fi
else
    check_fail "execution-production.service.ts manquant"
fi

if [ -f "gesthuilerieF/src/app/features/production/pages/production-guides/execution-real-values.component.ts" ]; then
    check_success "execution-real-values.component.ts existe"
else
    check_fail "execution-real-values.component.ts manquant"
fi

if [ -f "gesthuilerieF/src/app/features/production/pages/production-guides/guides-executer.component.html" ]; then
    if grep -q "app-execution-real-values" gesthuilerieF/src/app/features/production/pages/production-guides/guides-executer.component.html; then
        check_success "Component intégré dans HTML"
    else
        check_warning "Component non intégré dans guides-executer.component.html (Ajouter <app-execution-real-values>)"
    fi
else
    check_fail "guides-executer.component.html manquant"
fi

# Vérifier Node/npm
if command -v npm &> /dev/null; then
    check_success "npm installé"
    
    if [ -f "gesthuilerieF/node_modules/@angular/core/package.json" ]; then
        check_success "Angular dependencies installées"
    else
        check_warning "Angular dependencies non installées (Exécuter: cd gesthuilerieF && npm install)"
    fi
else
    check_warning "npm non trouvé (Installer Node.js)"
fi

# Vérifier si frontend tourne
if curl -s http://localhost:4200 &> /dev/null; then
    check_success "Frontend tourne (port 4200)"
else
    check_warning "Frontend ne répond pas (Lancer: cd gesthuilerieF && ng serve)"
fi

# ========================================
# 4. VÉRIFICATIONS MICROSERVICE IA
# ========================================
echo ""
echo "4️⃣  MICROSERVICE IA (FastAPI)"
echo "=========================================="

if [ -f "prediction/app.py" ]; then
    check_success "app.py existe"
    
    if grep -q "feedback-realvalues" prediction/app.py; then
        check_success "Route /feedback-realvalues implémentée"
    else
        check_fail "Route /feedback-realvalues manquante (Ajouter à app.py)"
    fi
    
    if grep -q "export-retraining-data" prediction/app.py; then
        check_success "Route /export-retraining-data implémentée"
    else
        check_fail "Route /export-retraining-data manquante (Ajouter à app.py)"
    fi
else
    check_fail "app.py manquant"
fi

if [ -f "prediction/train_dual_mode_models.py" ]; then
    check_success "train_dual_mode_models.py existe"
    
    if grep -q "temperature_malaxage_c_reelle" prediction/train_dual_mode_models.py; then
        check_success "Colonnes réelles dans NUMERIC_FEATURES"
    else
        check_warning "Colonnes réelles non trouvées (Ajouter à NUMERIC_FEATURES)"
    fi
else
    check_fail "train_dual_mode_models.py manquant"
fi

if [ -f "prediction/schedule_retraining.py" ]; then
    check_success "schedule_retraining.py existe"
else
    check_fail "schedule_retraining.py manquant"
fi

if [ -f "prediction/models/metadata.json" ]; then
    check_success "Modèles trouvés"
else
    check_warning "Modèles non trouvés (Exécuter: python train_dual_mode_models.py)"
fi

# Vérifier Python
if command -v python &> /dev/null; then
    check_success "Python installé"
    
    # Vérifier venv
    if [ -d "prediction/.venv" ]; then
        check_success "Virtual env exists"
    else
        check_warning "Virtual env non trouvé (Créer: cd prediction && python -m venv .venv)"
    fi
else
    check_fail "Python non trouvé"
fi

# Vérifier si IA tourne
if curl -s http://localhost:7500/ &> /dev/null; then
    check_success "IA tourne (port 7500)"
else
    check_warning "IA ne répond pas (Lancer: cd prediction && python app.py)"
fi

# ========================================
# 5. VÉRIFICATIONS DOCUMENTS
# ========================================
echo ""
echo "5️⃣  DOCUMENTATION"
echo "=========================================="

if [ -f "IMPLEMENTATION_FEEDBACK_LOOP.md" ]; then
    check_success "IMPLEMENTATION_FEEDBACK_LOOP.md existe"
else
    check_fail "IMPLEMENTATION_FEEDBACK_LOOP.md manquant"
fi

if [ -f "QUICKSTART_FEEDBACK_LOOP.md" ]; then
    check_success "QUICKSTART_FEEDBACK_LOOP.md existe"
else
    check_fail "QUICKSTART_FEEDBACK_LOOP.md manquant"
fi

if [ -f "LIVRABLE_FEEDBACK_LOOP.md" ]; then
    check_success "LIVRABLE_FEEDBACK_LOOP.md existe"
else
    check_fail "LIVRABLE_FEEDBACK_LOOP.md manquant"
fi

if [ -f "database-schema-realvalues.sql" ]; then
    check_success "database-schema-realvalues.sql existe"
else
    check_fail "database-schema-realvalues.sql manquant"
fi

# ========================================
# RÉSUMÉ
# ========================================
echo ""
echo "=========================================="
echo "📊 RÉSUMÉ DE VALIDATION"
echo "=========================================="
echo -e "${GREEN}Réussi : $PASS${NC}"
echo -e "${RED}Échoué : $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 VALIDATION RÉUSSIE! Système prêt pour deployment${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  $FAIL problèmes détectés. Voir ci-dessus${NC}"
    exit 1
fi
