export interface MachineTypeInfo {
    key: string;
    label: string;
    description: string;
    ajoutEau: boolean;
    type: string;
    etapes: string[];
    caracteristiques: string[];
}

export const MACHINE_TYPE_DATA: Record<string, MachineTypeInfo> = {
    '3_phase': {
        key: '3_phase',
        label: 'Centrifugation 3 phases',
        description: 'Système continu industriel, le plus utilisé en Tunisie. Séparation en 3 flux : huile, eau végétale, grignons.',
        ajoutEau: true,
        type: 'Continu',
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
            'Rendement élevé',
            'Température contrôlée (< 27°C recommandé)',
        ],
    },
    '2_phase': {
        key: '2_phase',
        label: 'Centrifugation 2 phases',
        description: 'Système moderne avancé, moins répandu en Tunisie mais présent. Pas d\'ajout d\'eau, meilleure qualité.',

        ajoutEau: false,
        type: 'Continu',
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
        ],
    },
    'presse': {
        key: 'presse',
        label: 'Presse hydraulique',
        description: 'Système traditionnel utilisé dans les petites huileries tunisiennes. Extraction discontinue, goût authentique.',
        ajoutEau: false,
        type: 'Discontinu',
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
            'Goût traditionnel',
            'Pression 200–400 bar',
        ],
        
    },
};

