export interface MachineTypeInfo {
    key: string;
    label: string;
    description: string;
    ajoutEau?: boolean;
    type?: string;
    etapes?: string[];
    caracteristiques: string[];
    categorie?: string;
    etapeAssociee?: string;
}

export const MACHINE_TYPE_DATA: Record<string, MachineTypeInfo> = {
    // ==================== BROYAGE ====================
    'marteaux': {
        key: 'marteaux',
        label: 'Broyeur à marteaux',
        description: 'Broyeur à marteaux rapide et efficace, utilisé dans les systèmes continus (2 et 3 phases). Vitesse élevée, pâte fine et homogène.',
        categorie: 'broyage',
        caracteristiques: [
            'Extraction rapide en systèmes continus',
            'Vitesse de rotation élevée (2000-3000 tr/min)',
            'Pâte fine et homogène',
            'Consommation électrique modérée',
            'Idéal pour centrifugation 2 ou 3 phases',
            'Chauffage de la pâte par friction',
        ],
    },
    'disques': {
        key: 'disques',
        label: 'Broyeur à disques',
        description: 'Broyeur avec plateau mobile et plateau fixe, moins courant. Produit une pâte plus grossière que le broyeur à marteaux.',
        categorie: 'broyage',
        caracteristiques: [
            'Fonctionnement par écrasement/cisaillement',
            'Vitesse modérée (500-1000 tr/min)',
            'Pâte plus grossière',
            'Moins de chauffage que marteaux',
            'Moins utilisé en Tunisie',
            'Qualité particulière pour pressage',
        ],
    },
    'meules': {
        key: 'meules',
        label: 'Broyeur à meules',
        description: 'Broyeur traditionnel avec meules en pierre. Très lent, utilisé dans les systèmes de pressage traditionnel pour préserver la qualité.',
        categorie: 'broyage',
        caracteristiques: [
            'Vitesse très lente (100-200 tr/min)',
            'Pâte très grossière et naturelle',
            'Minimal chauffage (qualité préservée)',
            'Traditionnel pour presse hydraulique',
            'Rendement faible mais qualité élevée',
            'Goût authentique préservé',
        ],
    },

    // ==================== MALAXAGE ====================
    'horizontal': {
        key: 'horizontal',
        label: 'Malaxeur horizontal',
        description: 'Malaxeur avec axe horizontal. Régulation thermique moyenne. Utilisé dans les systèmes continus pour mélanger la pâte.',
        categorie: 'malaxage',
        caracteristiques: [
            'Axe de rotation horizontal',
            'Durée: 25-45 minutes',
            'Température: 25-32°C (continu)',
            'Régulation thermique modérée',
            'Capacité standard pour systèmes continus',
            'Mélange régulier de la pâte',
        ],
    },
    'vertical': {
        key: 'vertical',
        label: 'Malaxeur vertical',
        description: 'Malaxeur avec axe vertical. Meilleure régulation thermique, efficacité supérieure. Système plus moderne et performant.',
        categorie: 'malaxage',
        caracteristiques: [
            'Axe de rotation vertical',
            'Durée: 25-45 minutes',
            'Température: 25-32°C',
            'Régulation thermique optimale',
            'Mélange plus homogène',
            'Rendement d\'extraction amélioré',
            'Système moderne preferred',
        ],
    },
    'malaxeur double cuve': {
        key: 'malaxeur double cuve',
        label: 'Malaxeur double cuve',
        description: 'Malaxeur avec deux cuves permettant un traitement discontinu ou semi-continu. Flexibilité maximale pour différents volumes.',
        categorie: 'malaxage',
        caracteristiques: [
            'Double capacité de traitement',
            'Fonctionnement semi-continu possible',
            'Adaptation à différents volumes',
            'Durée de malaxage: 25-45 min par cuve',
            'Régulation thermique double',
            'Flexibilité opérationnelle',
            'Investissement plus élevé',
        ],
    },

    // ==================== EXTRACTION ====================
    'centrifugation_3_phases': {
        key: 'centrifugation_3_phases',
        label: 'Centrifugation 3 phases',
        description: 'Système continu industriel, le plus utilisé en Tunisie. Séparation en 3 flux : huile, eau végétale, grignons.',
        ajoutEau: true,
        type: 'Continu',
        categorie: 'extraction',
        etapes: [
            '1. Réception des olives — pesée du lot, tri rapide, stockage temporaire (max 24–48h)',
            '2. Nettoyage + lavage — élimination feuilles (soufflerie), lavage à eau',
            '3. Broyage (crusher) — broyeur à marteaux, olives → pâte (pulpe + noyaux + huile)',
            '4. Malaxage — 25–45 min, température 25–32°C (regrouper gouttes d\'huile)',
            '5. Ajout d\'eau — eau ajoutée pour faciliter séparation',
            '6. Décanteur centrifuge (horizontal) — séparation en 3 flux : huile, eau végétale, grignons',
            '7. Séparateur vertical — élimine eau restante, purification finale',
            '8. Stockage — cuves inox, sans lumière / oxygène',
        ],
        caracteristiques: [
            'Extraction continue',
            'Ajout d\'eau obligatoire',
            'Séparation en 3 flux',
            'Rendement élevé (95-98%)',
            'Température contrôlée (< 27°C recommandé)',
            'Systématique en Tunisie',
            'Débit: 2-5 tonnes/heure',
        ],
    },
    'centrifugation_2_phases': {
        key: 'centrifugation_2_phases',
        label: 'Centrifugation 2 phases',
        description: 'Système moderne avancé, moins répandu en Tunisie mais présent. Pas d\'ajout d\'eau, meilleure qualité.',
        ajoutEau: false,
        type: 'Continu',
        categorie: 'extraction',
        etapes: [
            '1. Réception des olives — pesée du lot, tri rapide',
            '2. Nettoyage + lavage — élimination feuilles, lavage à eau',
            '3. Broyage (crusher) — broyeur à marteaux, olives → pâte',
            '4. Malaxage — 25–45 min, température 25–32°C',
            '5. Décanteur 2 phases (sans eau) — séparation : huile + grignons humides',
            '6. Séparation finale — éventuellement pas nécessaire selon machine',
            '7. Stockage — cuves inox, sans lumière / oxygène',
        ],
        caracteristiques: [
            'Extraction continue',
            'PAS d\'ajout d\'eau',
            'Séparation en 2 flux',
            'Plus de polyphénols conservés',
            'Meilleure qualité d\'huile',
            'Rendement légèrement inférieur (90-95%)',
            'Débit: 2-5 tonnes/heure',
        ],
    },
    'presse_hydraulique': {
        key: 'presse_hydraulique',
        label: 'Presse hydraulique',
        description: 'Système traditionnel utilisé dans les petites huileries tunisiennes. Extraction discontinue, goût authentique.',
        ajoutEau: false,
        type: 'Discontinu',
        categorie: 'extraction',
        etapes: [
            '1. Réception des olives',
            '2. Lavage',
            '3. Broyage (meule en pierre) — très lent, pâte plus grossière',
            '4. Malaxage — souvent manuel ou semi-automatique',
            '5. Pressage hydraulique — pâte dans filtres (scourtins), pression 200–400 bar',
            '6. Décantation naturelle — séparation par gravité, plusieurs heures',
            '7. Stockage',
        ],
        caracteristiques: [
            'Extraction discontinue',
            'PAS d\'ajout d\'eau',
            'Broyage meule en pierre (lent)',
            'Goût traditionnel préservé',
            'Pression 200–400 bar',
            'Cycle de 4-8 heures par batch',
            'Rendement modéré (70-85%)',
        ],
    },

    // ==================== SEPARATION ====================
    'decanteur_3_phases': {
        key: 'decanteur_3_phases',
        label: 'Décanteur 3 phases',
        description: 'Centrifugeuse horizontale pour extraction 3 phases. Sépare simultanément huile, eau végétale et grignons.',
        categorie: 'separation',
        caracteristiques: [
            'Séparation en 3 flux simultanés',
            'Fonctionne avec ajout d\'eau',
            'Vitesse de rotation: 2500-3500 tr/min',
            'Récupération huile: très élevée',
            'Débit: 3-5 tonnes/heure',
            'Efficacité thermale haute',
            'Maintenance régulière requise',
        ],
    },
    'decanteur_2_phases': {
        key: 'decanteur_2_phases',
        label: 'Décanteur 2 phases',
        description: 'Centrifugeuse horizontale sans ajout d\'eau. Sépare huile et grignons, préservant mieux la qualité.',
        categorie: 'separation',
        caracteristiques: [
            'Séparation en 2 flux',
            'Pas d\'ajout d\'eau requis',
            'Vitesse de rotation: 2500-3500 tr/min',
            'Polyphénols préservés',
            'Débit: 3-5 tonnes/heure',
            'Qualité d\'huile supérieure',
            'Moins de sous-produits aqueux',
        ],
    },
    'separateur_vertical': {
        key: 'separateur_vertical',
        label: 'Séparateur vertical',
        description: 'Centrifugeuse verticale pour purification finale. Élimine l\'eau résiduelle de l\'huile en dernier étage.',
        categorie: 'separation',
        caracteristiques: [
            'Séparation verticale (dernière étape)',
            'Purification de l\'huile',
            'Élimination eau résiduelle',
            'Vitesse: 3000+ tr/min',
            'Capacité: 500-1500 L/heure',
            'Améliore clarté et conservation',
            'Utilisé après décanteur horizontal',
        ],
    },

    // ==================== STOCKAGE ====================
    'cuve_inox': {
        key: 'cuve_inox',
        label: 'Cuve inox',
        description: 'Cuve de stockage en acier inoxydable. Matériel premium pour conservation optimale de l\'huile.',
        categorie: 'stockage',
        caracteristiques: [
            'Matériau: Acier inoxydable (304 ou 316)',
            'Résistance à la corrosion excellente',
            'Sans lumière/opaque recommandé',
            'Conservation longue durée possible',
            'Nettoyage facile',
            'Coût plus élevé',
            'Durée de vie: 15-20+ ans',
        ],
    },
    'cuve_fibre': {
        key: 'cuve_fibre',
        label: 'Cuve fibre',
        description: 'Cuve de stockage en fibre de verre. Bonne alternative économique pour conservation courte à moyenne.',
        categorie: 'stockage',
        caracteristiques: [
            'Matériau: Fibre de verre résine',
            'Résistance chimique bonne',
            'Coût modéré',
            'Conservation court-moyen terme',
            'Poids léger, facile à manipuler',
            'Nettoyage régulier recommandé',
            'Durée de vie: 10-15 ans',
        ],
    },

    // ==================== NETTOYAGE ====================
    'soufflerie': {
        key: 'soufflerie',
        label: 'Soufflerie (ventilateur)',
        description: 'Équipement de nettoyage par ventilation. Élimine les feuilles et matières légères avant le lavage.',
        categorie: 'nettoyage',
        etapeAssociee: 'nettoyage_lavage',
        caracteristiques: [
            'Élimination des feuilles par air comprimé',
            'Première étape de nettoyage',
            'Technologie simple et efficace',
            'Consommation air: 50-100 m³/h',
            'Rendement nettoyage: 80-90%',
            'Maintenance faible',
            'Coût d\'installation réduit',
        ],
    },
    'laveuse_eau': {
        key: 'laveuse_eau',
        label: 'Laveuse à eau',
        description: 'Équipement de nettoyage par immersion et brassage à l\'eau. Élimine les impuretés et poussières après soufflerie.',
        categorie: 'nettoyage',
        etapeAssociee: 'nettoyage_lavage',
        caracteristiques: [
            'Nettoyage par immersion dans l\'eau',
            'Brassage mécanique des olives',
            'Élimination de 90-95% des impuretés',
            'Consommation eau: 10-20 L par 100 kg olives',
            'Débit traitement: 5-10 tonnes/heure',
            'Température eau: 10-30°C',
            'Récupération eau possible par recyclage',
        ],
    },
    'separateur_feuilles': {
        key: 'separateur_feuilles',
        label: 'Séparateur de feuilles',
        description: 'Système de tri final pour séparer feuilles et petits débris. Améliore la qualité du broyage en aval.',
        categorie: 'nettoyage',
        etapeAssociee: 'nettoyage_lavage',
        caracteristiques: [
            'Tri des feuilles et débris légers',
            'Après soufflerie et lavage',
            'Grilles de séparation ajustables',
            'Rendement séparation: 95-98%',
            'Débit: 5-15 tonnes/heure',
            'Qualité broyage améliorée',
            'Réduction matières indésirables',
        ],
    },

    // ==================== AJOUT D'EAU ====================
    'systeme_injection_eau': {
        key: 'systeme_injection_eau',
        label: 'Système d\'injection d\'eau',
        description: 'Système de distribution d\'eau pour injection contrôlée au malaxage. Essentiel pour procédé 3 phases.',
        categorie: 'ajout_eau',
        etapeAssociee: 'ajout_eau',
        caracteristiques: [
            'Injection contrôlée d\'eau chaude/tiède',
            'Température eau: 35-45°C recommandé',
            'Débit ajustable: 10-30 L/min',
            'Système de régulation automatique possible',
            'Mélange à la pâte avant décantation',
            'Facilite séparation 3 phases',
            'Améliore rendement extraction',
            'Pompe + tuyauterie + vanne dosatrice',
        ],
    },
};


