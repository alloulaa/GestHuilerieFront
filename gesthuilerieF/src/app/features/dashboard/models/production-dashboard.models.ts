export interface ProductionDashboardSummary {
    globalIndicators: GlobalIndicators | null;
    receptionLots: ReceptionLots | null;
    productionProcess: ProductionProcess | null;
    machines: MachinesSection | null;
    quality: QualitySection | null;
    stockMovements: StockMovementsSection | null;
}

export interface GlobalIndicators {
    executionsEnCours: number;
    executionsTermineesAujourdhui: number;
    rendementMoyenReel: number;
    rendementMoyenAujourdhui?: number;
    dailyRendements?: { date: string; rendement: number }[];
    quantiteProduitePeriode: number;
    quantiteProduiteAujourdhui?: number;
}

export interface ReceptionLots {
    matiereRecueAujourdhui: number;
    lotsRecusAujourdhui: number;
    stockUtilisable: number;
}

export interface ProductionProcess {
    ecartReelVsPreditMoyen: number;
    extractionHoraire: HourlyExtraction[];
    topOperations: OperationStatus[];
}

export interface HourlyExtraction {
    heure: string;
    quantite: number;
}

export interface OperationStatus {
    reference: string;
    statut: string;
    machine: string;
}

export interface MachinesSection {
    machinesActives: number;
    machinesInactives: number;
    chargeParMachine: MachineLoad[];
}

export interface MachineLoad {
    machine: string;
    quantite: number;
    unite: string;
    active: boolean;
}

export interface QualitySection {
    aciditeMoyenne: number;
    indicePeroxydeMoyen: number;
    humiditeMoyennePate: number;
    polyphenolsMoyen: number;
    repartitionQualiteFinale: QualityDistribution;
}

export interface QualityDistribution {
    extraVierge: number;
    vierge: number;
    lampante: number;
}

export interface StockMovementsSection {
    entreesAujourdhui: number;
    sortiesAujourdhui: number;
    transfertsAujourdhui: number;
}
