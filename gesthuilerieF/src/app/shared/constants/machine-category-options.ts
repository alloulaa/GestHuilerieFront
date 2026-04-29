export const MACHINE_CATEGORY_OPTIONS = [
    'broyage',
    'malaxage',
    'extraction',
    'separation',
    'nettoyage',
    'ajout_eau',
    'stockage',
    'autre',
] as const;

export const MACHINE_SUBTYPE_OPTIONS: Record<string, string[]> = {
    broyage: ['marteaux', 'disques', 'meules'],
    malaxage: ['horizontal', 'vertical', 'malaxeur double cuve'],
    extraction: ['centrifugation_2_phases', 'centrifugation_3_phases', 'presse_hydraulique'],
    separation: ['separateur_vertical', 'decanteur_2_phases', 'decanteur_3_phases'],
    nettoyage: ['soufflerie', 'laveuse_eau', 'separateur_feuilles'],
    ajout_eau: ['systeme_injection_eau'],
    stockage: ['cuve_inox', 'cuve_fibre'],
};

export type MachineCategory = typeof MACHINE_CATEGORY_OPTIONS[number];
