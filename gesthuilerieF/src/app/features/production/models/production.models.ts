export interface GuideProduction {
    idGuideProduction: number;
    nom: string;
    reference: string;
    description: string;
    dateCreation: string;
    huilerieId: number;
    huilerieNom?: string;
    typeMachine: string;
    etapes: EtapeProduction[];
}

export interface EtapeProduction {
    idEtapeProduction?: number;
    nom: string;
    ordre: number;
    description: string;
    codeEtape?: string;
    machineId?: number;
    parametres: ParametreEtape[];
}

export interface ParametreEtape {
    idParametreEtape?: number;
    nom: string;
    codeParametre?: string;
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
    typeMachine: string;
    etapes: Array<{
        nom: string;
        ordre: number;
        description: string;
        codeEtape?: string;
        machineId?: number;
        parametres: Array<{
            nom: string;
            codeParametre?: string;
            uniteMesure: string;
            description: string;
            valeur: string;
        }>;
    }>;
}

export interface Prediction {
    idPrediction?: number;
    modePrediction: string;
    qualitePredite?: string;
    probabiliteQualite?: number;
    rendementPreditPourcent?: number;
    quantiteHuileRecalculeeLitres?: number;
    executionProductionId?: number;
    dateCreation?: string;
}

export interface ExecutionPredictionStartDTO {
    region?: string;
    methodeRecolte?: string;
    typeSol?: string;
    controleTemperature?: boolean;
    temperatureMalaxageC?: number;
    dureeMalaxageMin?: number;
    vitesseDecanteurTrMin?: number;
    humiditePourcent?: number;
    aciditeOlivesPourcent?: number;
    tauxFeuillesPourcent?: number;
    pressionExtractionBar?: number;
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
    controleTemperature?: boolean;
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
    predictions?: Prediction[];
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
    controleTemperature?: boolean;
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