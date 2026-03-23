export interface Pesee {
  idPesee: number;
  datePesee: string;
  poidsBrut: number;
  poidsTare: number;
  poidsNet: number;
  lotId: number;
  huilerieId: number;
}

export interface Stock {
  idStock: number;
  huilerieId: number;
  typeStock: string;
  referenceId: number;
  quantiteDisponible: number;
}

export interface StockMovement {
  id: number;
  huilerieId: number;
  referenceId: number;
  quantite: number;
  commentaire: string;
  dateMouvement: string;
  typeMouvement: 'ARRIVAL' | 'DEPARTURE' | 'TRANSFER' | 'ADJUSTMENT';
}

export interface Production {
  idProduction: number;
  dateDebut: string;
  dateFin: string;
  temperatureMalaxage: number;
  dureeMalaxage: number;
  pressionExtraction: number;
  vitesseDecanteur: number;
  rendementExtraction: number;
  machineId: number;
  huilerieId: number;
}

export interface ProductionLot {
  productionId: number;
  lotId: number;
  quantiteUtilisee: number;
}

export interface ProduitFinal {
  idProduit: number;
  nomProduit: string;
  quantiteProduite: number;
  dateProduction: string;
  productionId: number;
}

export const EXAMPLE_PESEE_JSON: Pesee[] = [
  {
    idPesee: 1,
    datePesee: '2026-03-12T09:15:00',
    poidsBrut: 12200,
    poidsTare: 1200,
    poidsNet: 11000,
    lotId: 31,
    huilerieId: 1,
  },
];

export const EXAMPLE_STOCK_MOVEMENT_JSON: StockMovement[] = [
  {
    id: 1,
    huilerieId: 1,
    typeMouvement: 'ARRIVAL',
    referenceId: 31,
    quantite: 11000,
    dateMouvement: '2026-03-12T09:20:00',
    commentaire: 'Reception lot OL-031',
  },
];
