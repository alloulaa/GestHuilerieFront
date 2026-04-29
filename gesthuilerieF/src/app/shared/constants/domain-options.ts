export const VARIETE_OPTIONS = ['Chemlali', 'Chetoui', 'Arbequina'] as const;

export const REGION_OPTIONS = ['Nord', 'Centre', 'Sud'] as const;

export const METHODE_RECOLTE_OPTIONS = ['manuelle', 'mecanique', 'semi-mecanique'] as const;

export const TYPE_SOL_OPTIONS = ['calcaire', 'argileux', 'sableux'] as const;

export const TYPE_MACHINE_OPTIONS = ['2_phase', '3_phase', 'presse'] as const;

export interface GuideStepTemplateParametre {
    codeParametre: string;
    nom: string;
    uniteMesure: string;
    description: string;
    valeur: string;
}

export interface GuideStepTemplate {
    nom: string;
    ordre: number;
    description: string;
    codeEtape: string;
    parametres: GuideStepTemplateParametre[];
}

export const buildSeparationStepForExtractionType = (extractionMachineType: string): GuideStepTemplate | null => {
    const normalized = String(extractionMachineType ?? '').trim().toLowerCase();

    if (normalized === 'centrifugation_3_phases') {
        return {
            nom: 'Décanteur 3 phases + Séparateur vertical',
            ordre: 6,
            description: 'Extraction et séparation par décanteur 3 phases suivi d\'un séparateur vertical.',
            codeEtape: 'decanteur_3_phases_separateur',
            parametres: [
                {
                    codeParametre: 'vitesse_decanteur_tr_min',
                    nom: 'Vitesse du decanteur',
                    uniteMesure: 'tr/min',
                    description: 'Vitesse du decanteur 3 phases',
                    valeur: '3200',
                },
                {
                    codeParametre: 'presence_separateur',
                    nom: 'Presence separateur',
                    uniteMesure: '',
                    description: '1 = separateur obligatoire',
                    valeur: '1',
                },
            ],
        };
    }

    if (normalized === 'centrifugation_2_phases') {
        return {
            nom: 'Décanteur 2 phases + Séparateur optionnel',
            ordre: 5,
            description: 'Extraction et séparation par décanteur 2 phases sans ajout d\'eau, avec séparateur optionnel selon la qualité obtenue.',
            codeEtape: 'decanteur_2_phases_separateur',
            parametres: [
                {
                    codeParametre: 'vitesse_decanteur_tr_min',
                    nom: 'Vitesse du decanteur',
                    uniteMesure: 'tr/min',
                    description: 'Vitesse du decanteur 2 phases',
                    valeur: '3000',
                },
                {
                    codeParametre: 'presence_ajout_eau',
                    nom: 'Presence ajout eau',
                    uniteMesure: '',
                    description: '0 = pas d\'ajout d\'eau',
                    valeur: '0',
                },
                {
                    codeParametre: 'presence_separateur',
                    nom: 'Presence separateur',
                    uniteMesure: '',
                    description: '0 ou 1 selon configuration',
                    valeur: '0',
                },
            ],
        };
    }

    if (normalized === 'presse_hydraulique') {
        return {
            nom: 'Extraction et Séparation (Décantation naturelle)',
            ordre: 5,
            description: 'Extraction par presse hydraulique suivi d\'une décantation naturelle.',
            codeEtape: 'extraction_decantation',
            parametres: [
                {
                    codeParametre: 'pression_extraction_bar',
                    nom: 'Pression d extraction',
                    uniteMesure: 'bar',
                    description: 'Pression du pressage hydraulique',
                    valeur: '2.5',
                },
                {
                    codeParametre: 'presence_presse',
                    nom: 'Presence presse',
                    uniteMesure: '',
                    description: '1 = pressage actif',
                    valeur: '1',
                },
            ],
        };
    }

    return null;
};

export const buildGuideStepTemplates = (typeMachine: string): GuideStepTemplate[] => {
    const normalizedTypeMachine = String(typeMachine ?? '').trim().toLowerCase();

    if (normalizedTypeMachine === '3_phase') {
        return [
            {
                nom: 'Réception',
                ordre: 1,
                description: 'Réception des olives et contrôle initial de la matière première.',
                codeEtape: 'reception',
                parametres: [],
            },
            {
                nom: 'Nettoyage / Lavage',
                ordre: 2,
                description: 'Nettoyage et lavage des olives avant transformation.',
                codeEtape: 'nettoyage_lavage',
                parametres: [],
            },
            {
                nom: 'Broyage',
                ordre: 3,
                description: 'Broyage de la matière première avant malaxage.',
                codeEtape: 'broyage',
                parametres: [],
            },
            {
                nom: 'Malaxage',
                ordre: 4,
                description: 'Homogénéisation de la pâte avec contrôle de température et durée.',
                codeEtape: 'malaxage',
                parametres: [
                    {
                        codeParametre: 'temperature_malaxage_c',
                        nom: 'Temperature de malaxage',
                        uniteMesure: 'C',
                        description: 'Temperature de malaxage',
                        valeur: '27',
                    },
                    {
                        codeParametre: 'duree_malaxage_min',
                        nom: 'Duree de malaxage',
                        uniteMesure: 'min',
                        description: 'Duree de malaxage',
                        valeur: '40',
                    },
                ],
            },
            {
                nom: 'Ajout d\'eau',
                ordre: 5,
                description: 'Ajout d\'eau nécessaire au procédé 3 phases.',
                codeEtape: 'ajout_eau',
                parametres: [
                    {
                        codeParametre: 'presence_ajout_eau',
                        nom: 'Presence ajout eau',
                        uniteMesure: '',
                        description: '1 = ajout d\'eau actif',
                        valeur: '1',
                    },
                ],
            },
            {
                nom: 'Décanteur 3 phases + Séparateur vertical',
                ordre: 6,
                description: 'Extraction et séparation par décanteur 3 phases suivi d\'un séparateur vertical.',
                codeEtape: 'decanteur_3_phases_separateur',
                parametres: [
                    {
                        codeParametre: 'vitesse_decanteur_tr_min',
                        nom: 'Vitesse du decanteur',
                        uniteMesure: 'tr/min',
                        description: 'Vitesse du decanteur 3 phases',
                        valeur: '3200',
                    },
                    {
                        codeParametre: 'presence_separateur',
                        nom: 'Presence separateur',
                        uniteMesure: '',
                        description: '1 = separateur obligatoire',
                        valeur: '1',
                    },
                ],
            },
            {
                nom: 'Stockage',
                ordre: 7,
                description: 'Stockage de l\'huile obtenue dans des conditions adaptées.',
                codeEtape: 'stockage',
                parametres: [],
            },
        ];
    }

    if (normalizedTypeMachine === '2_phase') {
        return [
            {
                nom: 'Réception',
                ordre: 1,
                description: 'Réception des olives et contrôle initial de la matière première.',
                codeEtape: 'reception',
                parametres: [],
            },
            {
                nom: 'Nettoyage',
                ordre: 2,
                description: 'Nettoyage des olives avant transformation.',
                codeEtape: 'nettoyage',
                parametres: [],
            },
            {
                nom: 'Broyage',
                ordre: 3,
                description: 'Broyage de la matière première avant malaxage.',
                codeEtape: 'broyage',
                parametres: [],
            },
            {
                nom: 'Malaxage ',
                ordre: 4,
                description: 'Homogénéisation de la pâte avec contrôle de température et durée.',
                codeEtape: 'malaxage',
                parametres: [
                    {
                        codeParametre: 'temperature_malaxage_c',
                        nom: 'Temperature de malaxage',
                        uniteMesure: 'C',
                        description: 'Temperature de malaxage',
                        valeur: '27',
                    },
                    {
                        codeParametre: 'duree_malaxage_min',
                        nom: 'Duree de malaxage',
                        uniteMesure: 'min',
                        description: 'Duree de malaxage',
                        valeur: '40',
                    },
                ],
            },
            {
                nom: 'Décanteur 2 phases + Séparateur optionnel',
                ordre: 5,
                description: 'Extraction et séparation par décanteur 2 phases sans ajout d\'eau, avec séparateur optionnel selon la qualité obtenue.',
                codeEtape: 'decanteur_2_phases_separateur',
                parametres: [
                    {
                        codeParametre: 'vitesse_decanteur_tr_min',
                        nom: 'Vitesse du decanteur',
                        uniteMesure: 'tr/min',
                        description: 'Vitesse du decanteur 2 phases',
                        valeur: '3000',
                    },
                    {
                        codeParametre: 'presence_ajout_eau',
                        nom: 'Presence ajout eau',
                        uniteMesure: '',
                        description: '0 = pas d\'ajout d\'eau',
                        valeur: '0',
                    },
                    {
                        codeParametre: 'presence_separateur',
                        nom: 'Presence separateur',
                        uniteMesure: '',
                        description: '0 ou 1 selon configuration',
                        valeur: '0',
                    },
                ],
            },
            {
                nom: 'Stockage',
                ordre: 6,
                description: 'Stockage de l\'huile obtenue dans des conditions adaptées.',
                codeEtape: 'stockage',
                parametres: [],
            },
        ];
    }

    if (normalizedTypeMachine === 'presse') {
        return [
            {
                nom: 'Réception',
                ordre: 1,
                description: 'Réception des olives et contrôle initial de la matière première.',
                codeEtape: 'reception',
                parametres: [],
            },
            {
                nom: 'Lavage',
                ordre: 2,
                description: 'Lavage des olives avant transformation.',
                codeEtape: 'lavage',
                parametres: [],
            },
            {
                nom: 'Broyage (meule)',
                ordre: 3,
                description: 'Broyage traditionnel par meule.',
                codeEtape: 'broyage_meule',
                parametres: [],
            },
            {
                nom: 'Malaxage',
                ordre: 4,
                description: 'Homogénéisation de la pâte avec contrôle de température et durée.',
                codeEtape: 'malaxage',
                parametres: [
                    {
                        codeParametre: 'temperature_malaxage_c',
                        nom: 'Temperature de malaxage',
                        uniteMesure: 'C',
                        description: 'Temperature de malaxage',
                        valeur: '27',
                    },
                    {
                        codeParametre: 'duree_malaxage_min',
                        nom: 'Duree de malaxage',
                        uniteMesure: 'min',
                        description: 'Duree de malaxage',
                        valeur: '40',
                    },
                ],
            },
            {
                nom: 'Extraction et Séparation (Décantation naturelle)',
                ordre: 5,
                description: 'Extraction par presse hydraulique suivi d\'une décantation naturelle.',
                codeEtape: 'extraction_decantation',
                parametres: [
                    {
                        codeParametre: 'pression_extraction_bar',
                        nom: 'Pression d extraction',
                        uniteMesure: 'bar',
                        description: 'Pression du pressage hydraulique',
                        valeur: '2.5',
                    },
                    {
                        codeParametre: 'presence_presse',
                        nom: 'Presence presse',
                        uniteMesure: '',
                        description: '1 = pressage actif',
                        valeur: '1',
                    },
                ],
            },
            {
                nom: 'Stockage',
                ordre: 6,
                description: 'Stockage de l\'huile obtenue dans des conditions adaptées.',
                codeEtape: 'stockage',
                parametres: [],
            },
        ];
    }

    return [];
};
