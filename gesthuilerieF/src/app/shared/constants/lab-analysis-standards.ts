/**
 * Laboratory Analysis Standards for Tunisia (Tunisian Olive Oil Standards)
 * Based on international standards and Tunisian regulations for olive oil quality
 */

export interface LabParameterStandard {
  code: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  description: string;
  category: 'superior' | 'extra' | 'fine' | 'lampante';
}

export interface LabStandardCategory {
  category: 'superior' | 'extra' | 'fine' | 'lampante';
  label: string;
  description: string;
  parameters: LabParameterStandard[];
}

/**
 * Standard intervals for laboratory analysis parameters used in Tunisia
 * These values are based on international standards for olive oil classification
 */
export const LAB_ANALYSIS_STANDARDS: LabParameterStandard[] = [
  {
    code: 'acidite_huile_pourcent',
    label: 'Acidité de l\'huile',
    unit: '%',
    min: 0.1,
    max: 5.0,
    description: 'Huile d\'olive vierge extra (max 0.8%). Pour huile vierge fine: max 1.5%, Pour huile vierge lampante: > 1.5%',
    category: 'extra',
  },
  {
    code: 'indice_peroxyde_meq_o2_kg',
    label: 'Indice de peroxyde',
    unit: 'meq O₂/kg',
    min: 5,
    max: 40,
    description: 'Mesure du degré d\'oxydation. Max 20 meq O₂/kg pour huile vierge extra, Max 30 pour huile fine',
    category: 'extra',
  },
  {
    code: 'polyphenols_mg_kg',
    label: 'Polyphénols',
    unit: 'mg/kg',
    min: 100,
    max: 800,
    description: 'Composés antioxydants naturels. Valeur idéale: > 250 mg/kg pour une bonne qualité',
    category: 'superior',
  },
  {
    code: 'k232',
    label: 'Extinction K232',
    unit: '',
    min: 1.5,
    max: 3.5,
    description: 'Mesure de l\'absorption UV à 232 nm. Max 2.5 pour huile vierge extra, Max 2.7 pour fine',
    category: 'extra',
  },
  {
    code: 'k270',
    label: 'Extinction K270',
    unit: '',
    min: 0.1,
    max: 0.50,
    description: 'Mesure de l\'absorption UV à 270 nm (conjugated dienes). Max 0.22 pour huile vierge extra',
    category: 'extra',
  },
];

/**
 * Classification standards by quality category
 */
export const QUALITY_CATEGORIES: LabStandardCategory[] = [
  {
    category: 'superior',
    label: 'Huile d\'Olive Supérieure',
    description: 'Classification spéciale pour les huiles exceptionnelles',
    parameters: [
      {
        code: 'acidite_huile_pourcent',
        label: 'Acidité',
        unit: '%',
        min: 0.1,
        max: 0.5,
        description: 'Acidité très faible',
        category: 'superior',
      },
      {
        code: 'indice_peroxyde_meq_o2_kg',
        label: 'Peroxyde',
        unit: 'meq O₂/kg',
        min: 0,
        max: 15,
        description: 'Indice très bas',
        category: 'superior',
      },
      {
        code: 'polyphenols_mg_kg',
        label: 'Polyphénols',
        unit: 'mg/kg',
        min: 250,
        max: 800,
        description: 'Haute concentration d\'antioxydants',
        category: 'superior',
      },
      {
        code: 'k232',
        label: 'K232',
        unit: '',
        min: 0,
        max: 2.0,
        description: 'Très bonne stabilité',
        category: 'superior',
      },
      {
        code: 'k270',
        label: 'K270',
        unit: '',
        min: 0,
        max: 0.16,
        description: 'Très peu altérée',
        category: 'superior',
      },
    ],
  },
  {
    category: 'extra',
    label: 'Huile d\'Olive Vierge Extra',
    description: 'Meilleure qualité commerciale',
    parameters: [
      {
        code: 'acidite_huile_pourcent',
        label: 'Acidité',
        unit: '%',
        min: 0.1,
        max: 0.8,
        description: 'Maximum 0.8%',
        category: 'extra',
      },
      {
        code: 'indice_peroxyde_meq_o2_kg',
        label: 'Peroxyde',
        unit: 'meq O₂/kg',
        min: 0,
        max: 20,
        description: 'Maximum 20 meq O₂/kg',
        category: 'extra',
      },
      {
        code: 'polyphenols_mg_kg',
        label: 'Polyphénols',
        unit: 'mg/kg',
        min: 100,
        max: 800,
        description: 'Bonne concentration',
        category: 'extra',
      },
      {
        code: 'k232',
        label: 'K232',
        unit: '',
        min: 0,
        max: 2.5,
        description: 'Maximum 2.5',
        category: 'extra',
      },
      {
        code: 'k270',
        label: 'K270',
        unit: '',
        min: 0,
        max: 0.22,
        description: 'Maximum 0.22',
        category: 'extra',
      },
    ],
  },
  {
    category: 'fine',
    label: 'Huile d\'Olive Vierge Fine',
    description: 'Qualité commerciale bonne',
    parameters: [
      {
        code: 'acidite_huile_pourcent',
        label: 'Acidité',
        unit: '%',
        min: 0.1,
        max: 1.5,
        description: 'Maximum 1.5%',
        category: 'fine',
      },
      {
        code: 'indice_peroxyde_meq_o2_kg',
        label: 'Peroxyde',
        unit: 'meq O₂/kg',
        min: 0,
        max: 30,
        description: 'Maximum 30 meq O₂/kg',
        category: 'fine',
      },
      {
        code: 'polyphenols_mg_kg',
        label: 'Polyphénols',
        unit: 'mg/kg',
        min: 50,
        max: 800,
        description: 'Concentration acceptable',
        category: 'fine',
      },
      {
        code: 'k232',
        label: 'K232',
        unit: '',
        min: 0,
        max: 2.7,
        description: 'Maximum 2.7',
        category: 'fine',
      },
      {
        code: 'k270',
        label: 'K270',
        unit: '',
        min: 0,
        max: 0.27,
        description: 'Maximum 0.27',
        category: 'fine',
      },
    ],
  },
  {
    category: 'lampante',
    label: 'Huile d\'Olive Lampante',
    description: 'Huile défectueuse (ne peut pas être consommée directement)',
    parameters: [
      {
        code: 'acidite_huile_pourcent',
        label: 'Acidité',
        unit: '%',
        min: 1.5,
        max: 100,
        description: 'Supérieure à 1.5% (raffinée industriellement)',
        category: 'lampante',
      },
      {
        code: 'indice_peroxyde_meq_o2_kg',
        label: 'Peroxyde',
        unit: 'meq O₂/kg',
        min: 30,
        max: 100,
        description: 'Supérieur à 30 meq O₂/kg',
        category: 'lampante',
      },
      {
        code: 'polyphenols_mg_kg',
        label: 'Polyphénols',
        unit: 'mg/kg',
        min: 0,
        max: 50,
        description: 'Très basse concentration',
        category: 'lampante',
      },
      {
        code: 'k232',
        label: 'K232',
        unit: '',
        min: 2.7,
        max: 100,
        description: 'Supérieur à 2.7',
        category: 'lampante',
      },
      {
        code: 'k270',
        label: 'K270',
        unit: '',
        min: 0.27,
        max: 100,
        description: 'Supérieur à 0.27',
        category: 'lampante',
      },
    ],
  },
];

/**
 * Get standard ranges for a specific parameter
 */
export function getParameterStandard(code: string): LabParameterStandard | undefined {
  return LAB_ANALYSIS_STANDARDS.find((p) => p.code === code);
}

/**
 * Get quality category based on analysis results
 */
export function classifyOilQuality(analysis: {
  acidite_huile_pourcent: number;
  indice_peroxyde_meq_o2_kg: number;
  polyphenols_mg_kg: number;
  k232: number;
  k270: number;
}): 'superior' | 'extra' | 'fine' | 'lampante' {
  // Check if Lampante (out of Fine range)
  if (
    analysis.acidite_huile_pourcent > 1.5 ||
    analysis.indice_peroxyde_meq_o2_kg > 30 ||
    analysis.k232 > 2.7 ||
    analysis.k270 > 0.27
  ) {
    return 'lampante';
  }

  // Check if Fine (out of Extra range but within Fine)
  if (
    analysis.acidite_huile_pourcent > 0.8 ||
    analysis.indice_peroxyde_meq_o2_kg > 20 ||
    analysis.k232 > 2.5 ||
    analysis.k270 > 0.22
  ) {
    return 'fine';
  }

  // Check if Superior (best of Extra)
  if (
    analysis.acidite_huile_pourcent <= 0.5 &&
    analysis.indice_peroxyde_meq_o2_kg <= 15 &&
    analysis.polyphenols_mg_kg >= 250 &&
    analysis.k232 <= 2.0 &&
    analysis.k270 <= 0.16
  ) {
    return 'superior';
  }

  // Extra quality (default for parameters in extra range)
  if (
    analysis.acidite_huile_pourcent <= 0.8 &&
    analysis.indice_peroxyde_meq_o2_kg <= 20 &&
    analysis.polyphenols_mg_kg >= 100 &&
    analysis.k232 <= 2.5 &&
    analysis.k270 <= 0.22
  ) {
    return 'extra';
  }

  // Default to fine if some parameters are below extra threshold
  return 'fine';
}
