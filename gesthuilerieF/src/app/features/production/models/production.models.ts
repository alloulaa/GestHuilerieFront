export interface GuideProduction {
    idGuideProduction: number;
    nom: string;
    reference: string;
    description: string;
    dateCreation: string;
    huilerieId: number;
    huilerieNom?: string;
    etapes: EtapeProduction[];
}

export interface EtapeProduction {
    idEtapeProduction?: number;
    nom: string;
    ordre: number;
    description: string;
    parametres: ParametreEtape[];
}

export interface ParametreEtape {
    idParametreEtape?: number;
    nom: string;
    uniteMesure: string;
    description: string;
    valeur: string;
    valeurReelle?: string;
}

export interface GuideProductionCreateDTO {
    nom: string;
    description: string;
    dateCreation: string;
    huilerieId: number;
    etapes: Array<{
        nom: string;
        ordre: number;
        description: string;
        parametres: Array<{
            nom: string;
            uniteMesure: string;
            description: string;
            valeur: string;
        }>;
    }>;
}

export interface ExecutionProduction {
    idExecutionProduction: number;
    reference?: string;
    dateDebut: string;
    dateFinPrevue: string;
    dateFinReelle: string | null;
    statut: string;
    rendement: number;
    observations: string;
    guideProductionId: number;
    guideProductionReference?: string;
    machineId: number;
    machineNom?: string;
    lotId: number;
    lotReference?: string;
    lotVariete?: string;
    produitFinalId?: number;
    produitFinalReference?: string | null;
    produitFinalCode?: string;
    produitFinalNomProduit?: string;
    valeursReelles?: ValeurReelleParametre[];
    huilerieId?: number;
    huilerieNom?: string;
}

export interface ExecutionProductionDTO extends ExecutionProduction {
    produitFinalReference?: string | null;
}

export interface ExecutionProductionCreate {
    reference: string;
    dateDebut: string;
    dateFinPrevue: string;
    dateFinReelle: string | null;
    statut: string;
    rendement: number;
    observations: string;
    guideProductionId: number;
    machineId: number;
    lotId: number;
}

export interface ValeurReelleParametre {
    idValeurReelleParametre?: number;
    parametreEtapeId: number;
    parametreEtapeNom?: string;
    valeurEstime?: string;
    valeurReelle: string;
}