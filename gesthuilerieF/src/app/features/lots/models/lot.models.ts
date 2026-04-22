export interface LotOlives {
  idLot: number;
  reference?: string;
  varieteOlive: string;
  maturite: string;
  origine: string;
  dateRecolte: string;
  dateReception: string;
  fournisseurNom?: string;
  fournisseurCIN?: string;
  dureeStockageAvantBroyage: number;
  quantiteInitiale: number;
  quantiteRestante: number;
  matierePremiereId: number;
  matierePremiereReference?: string;
  campagneId: number;
  huilerieId?: number;
  huilerieNom?: string;
}

export interface AnalyseLaboratoire {
  idAnalyse: number;
  reference?: string;
  acidite: number;
  indicePeroxyde: number;
  k232: number;
  k270: number;
  classeQualiteFinale: string;
  dateAnalyse: string;
  lotId: number;
}
export interface TraceabilityEvent {
  date: string;
  etape: 'LOT_OLIVES' | 'PESEE' | 'PRODUCTION' | 'PRODUIT_FINAL' | 'STOCK';
  description: string;
  reference: string;
}

export interface LotTraceability {
  lotId: number;
  varieteOlive: string;
  origine: string;
  quantiteInitiale: number;
  quantiteRestante: number;
  pesees?: {
    idPesee: number;
    date: string;
    pesee: number;
  }[];
  arrivages?: {
    idLotArrivage: number;
    date: string;
    pesee: number;
  }[];
  analyses: {
    idAnalyse: number;
    date: string;
    acidite: number;
    indicePeroxyde: number;
    k232: number;
    k270: number;
    classeQualiteFinale: string;
  }[];
  cycleVie: TraceabilityEvent[];
}