export interface MachineTypeInfo {
    key: string;
    label: string;
    description: string;
    rendement: string;
    qualite: string;
    ajoutEau: boolean;
    type: string;
    etapes: string[];
    caracteristiques: string[];
    impactPrediction: string;
}

export const MACHINE_TYPE_DATA: Record<string, MachineTypeInfo> = {
    '3_phase': {
        key: '3_phase',
        label: 'Centrifugation 3 phases',
        description: 'Système continu industriel, le plus utilisé en Tunisie. Séparation en 3 flux : huile, eau végétale, grignons.',
        rendement: 'Élevé (~20%)',
        qualite: 'Moyenne à bonne',
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
        impactPrediction:
            'Le rendement est généralement le plus élevé (~20%). La qualité dépend fortement de la température de malaxage et de la durée de stockage. Le lavage à l\'eau réduit l\'acidité mais dilue les polyphénols.',
    },
    '2_phase': {
        key: '2_phase',
        label: 'Centrifugation 2 phases',
        description: 'Système moderne avancé, moins répandu en Tunisie mais présent. Pas d\'ajout d\'eau, meilleure qualité.',
        rendement: 'Moyen',
        qualite: 'Élevée',
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
        impactPrediction:
            'Rendement légèrement plus faible que 3 phases, mais qualité supérieure avec plus de polyphénols. Le fait de ne pas ajouter d\'eau préserve mieux les arômes.',
    },
    'presse': {
        key: 'presse',
        label: 'Presse hydraulique',
        description: 'Système traditionnel utilisé dans les petites huileries tunisiennes. Extraction discontinue, goût authentique.',
        rendement: 'Faible',
        qualite: 'Variable',
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
        impactPrediction:
            'Rendement faible et qualité instable. Le broyage à la meule et le malaxage manuel introduisent plus de variabilité. La décantation naturelle est sensible à la température ambiante.',
    },
};

