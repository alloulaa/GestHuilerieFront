
/**
 * Configuration des guides de machines avec leurs étapes et paramètres
 * Utilisé pour afficher dynamiquement les étapes et paramètres dans la popup de prédiction
 */

export interface MachineGuideStep {
  order: number;
  name: string;
  parameters: string[];
}

export interface MachineGuide {
  type: 'presse' | '2_phase' | '3_phase';
  label: string;
  steps: MachineGuideStep[];
  requiredParameters: string[];
  optionalParameters: string[];
  description: string;
}

export const MACHINE_GUIDES: Record<string, MachineGuide> = {
  '3_phase': {
    type: '3_phase',
    label: 'Guide 3 phases (décanteur 3 phases)',
    description: 'Ajout d\'eau obligatoire (étape 5), séparateur obligatoire. Produit des margines en grande quantité. Meilleur rendement volumique.',
    steps: [
      { order: 1, name: 'Réception', parameters: [] },
      { order: 2, name: 'Nettoyage / Lavage', parameters: [] },
      { order: 3, name: 'Broyage', parameters: [] },
      { order: 4, name: 'Malaxeur double cuve (opt.)', parameters: ['temperature_malaxage_c', 'duree_malaxage_min'] },
      { order: 5, name: 'Ajout d\'eau', parameters: ['presence_ajout_eau'] },
      { order: 6, name: 'Décanteur 3 phases + Séparateur vertical', parameters: ['vitesse_decanteur_tr_min', 'presence_separateur'] },
      { order: 7, name: 'Stockage', parameters: [] },
    ],
    requiredParameters: [
      'variete',
      'region',
      'poids_olives_kg',
      'maturite_niveau_1_5',
      'taux_feuilles_pourcent',
      'acidite_olives_pourcent',
      'temps_depuis_recolte_heures',
      'duree_stockage_jours',
      'temperature_malaxage_c',
      'duree_malaxage_min',
      'vitesse_decanteur_tr_min',
      'humidite_pourcent',
      'lavage_effectue',
      'type_machine',
      'type_broyeur',
      'type_malaxeur',
      'type_nettoyage',
      'type_separation',
      'type_extracteur',
      'controle_temperature',
      'nombre_etapes',
      'presence_ajout_eau',
      'presence_separateur',
      'methode_recolte',
      'type_sol',
    ],
    optionalParameters: [
      'acidite_huile_pourcent',
      'indice_peroxyde_meq_o2_kg',
      'polyphenols_mg_kg',
      'k232',
      'k270',
    ],
  },
  '2_phase': {
    type: '2_phase',
    label: 'Guide 2 phases (décanteur 2 phases)',
    description: 'PAS d\'ajout d\'eau, séparateur facultatif. Une étape de moins. Grignons plus humide mais moins de margines. Polyphénols mieux préservés. Vitesse de décanteur légèrement plus basse (3000 vs 3200).',
    steps: [
      { order: 1, name: 'Réception', parameters: [] },
      { order: 2, name: 'Nettoyage', parameters: [] },
      { order: 3, name: 'Broyage', parameters: [] },
      { order: 4, name: 'Malaxeur double cuve (opt.)', parameters: ['temperature_malaxage_c', 'duree_malaxage_min'] },
      { order: 5, name: 'Décanteur 2 phases + Séparateur optionnel', parameters: ['vitesse_decanteur_tr_min', 'presence_separateur'] },
      { order: 6, name: 'Stockage', parameters: [] },
    ],
    requiredParameters: [
      'variete',
      'region',
      'poids_olives_kg',
      'maturite_niveau_1_5',
      'taux_feuilles_pourcent',
      'acidite_olives_pourcent',
      'temps_depuis_recolte_heures',
      'duree_stockage_jours',
      'temperature_malaxage_c',
      'duree_malaxage_min',
      'vitesse_decanteur_tr_min',
      'humidite_pourcent',
      'lavage_effectue',
      'type_machine',
      'type_broyeur',
      'type_malaxeur',
      'type_nettoyage',
      'type_separation',
      'type_extracteur',
      'controle_temperature',
      'nombre_etapes',
      'presence_ajout_eau',
      'presence_separateur',
      'methode_recolte',
      'type_sol',
    ],
    optionalParameters: [
      'acidite_huile_pourcent',
      'indice_peroxyde_meq_o2_kg',
      'polyphenols_mg_kg',
      'k232',
      'k270',
    ],
  },
  'presse': {
    type: 'presse',
    label: 'Guide presse (extraction traditionnelle)',
    description: 'Pas de centrifugeuse, extraction par pression mécanique + gravité. Méthode la plus lente, souvent artisanale. Polyphénols mieux préservés.',
    steps: [
      { order: 1, name: 'Réception', parameters: [] },
      { order: 2, name: 'Lavage', parameters: [] },
      { order: 3, name: 'Broyage à la meule', parameters: [] },
      { order: 4, name: 'Malaxeur double cuve (opt.)', parameters: ['temperature_malaxage_c', 'duree_malaxage_min'] },
      { order: 5, name: 'Extraction + Décantation naturelle', parameters: ['pression_extraction_bar', 'presence_presse'] },
      { order: 6, name: 'Stockage', parameters: [] },
    ],
    requiredParameters: [
      'variete',
      'region',
      'poids_olives_kg',
      'maturite_niveau_1_5',
      'taux_feuilles_pourcent',
      'acidite_olives_pourcent',
      'temps_depuis_recolte_heures',
      'duree_stockage_jours',
      'temperature_malaxage_c',
      'duree_malaxage_min',
      'pression_extraction_bar',
      'humidite_pourcent',
      'lavage_effectue',
      'type_machine',
      'type_broyeur',
      'type_malaxeur',
      'type_nettoyage',
      'type_separation',
      'type_extracteur',
      'controle_temperature',
      'nombre_etapes',
      'methode_recolte',
      'type_sol',
    ],
    optionalParameters: [
      'acidite_huile_pourcent',
      'indice_peroxyde_meq_o2_kg',
      'polyphenols_mg_kg',
      'k232',
      'k270',
    ],
  },
};

/**
 * Paramètres qui changent d'affichage selon le type de machine
 * key = nom du champ, value = { label, fieldType, visibleIn }
 */
export const MACHINE_GUIDE_FIELDS: Record<string, {
  label: string;
  fieldType: 'input' | 'select' | 'range';
  min?: number;
  max?: number;
  step?: string;
  visibleIn: ('2_phase' | '3_phase' | 'presse')[];
  options?: string[];
  placeholder?: string;
}> = {
  'vitesse_decanteur_tr_min': {
    label: 'Vitesse décanteur (tr/min)',
    fieldType: 'input',
    min: 3000,
    max: 3400,
    visibleIn: ['2_phase', '3_phase'],
  },
  'presence_ajout_eau': {
    label: 'Ajout d\'eau',
    fieldType: 'select',
    visibleIn: ['2_phase', '3_phase'],
    options: ['Non', 'Oui'],
  },
  'presence_separateur': {
    label: 'Présence séparateur',
    fieldType: 'select',
    visibleIn: ['2_phase', '3_phase'],
    options: ['Non', 'Oui'],
  },
  'pression_extraction_bar': {
    label: 'Pression extraction (bar)',
    fieldType: 'input',
    min: 50,
    max: 350,
    visibleIn: ['presse'],
  },
  'presence_presse': {
    label: 'Présence presse',
    fieldType: 'select',
    visibleIn: [],
    options: ['Non', 'Oui'],
  },
  'temperature_malaxage_c': {
    label: 'Température malaxage (°C)',
    fieldType: 'input',
    min: 24,
    max: 27,
    step: '0.5',
    visibleIn: ['2_phase', '3_phase', 'presse'],
  },
  'duree_malaxage_min': {
    label: 'Durée malaxage (min)',
    fieldType: 'input',
    min: 25,
    max: 40,
    visibleIn: ['2_phase', '3_phase', 'presse'],
  },
};

/**
 * Obtient le guide pour un type de machine
 */
export function getMachineGuide(machineType: string): MachineGuide | null {
  return MACHINE_GUIDES[machineType] || null;
}

/**
 * Obtient les paramètres visibles pour un type de machine
 */
export function getVisibleFields(machineType: string): Record<string, any> {
  const visible: Record<string, any> = {};
  for (const [fieldName, fieldConfig] of Object.entries(MACHINE_GUIDE_FIELDS)) {
    if (fieldConfig.visibleIn.includes(machineType as any)) {
      visible[fieldName] = fieldConfig;
    }
  }
  return visible;
}

/**
 * Vérifie si un paramètre doit être visible pour un type de machine
 */
export function isFieldVisibleForMachine(fieldName: string, machineType: string): boolean {
  const field = MACHINE_GUIDE_FIELDS[fieldName];
  return field ? field.visibleIn.includes(machineType as any) : false;
}
