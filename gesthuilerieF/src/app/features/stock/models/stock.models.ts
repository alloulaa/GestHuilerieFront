export interface Pesee {
  idPesee?: number;
  reference?: string;
  datePesee: string;
  poidsBrut: number;
  poidsTare: number;
  poidsNet: number;
  lotId: number;
  huilerieId?: number;
}

export interface ReceptionPeseeCreatePayload {
  lotId?: number | null;
  datePesee: string;
  poidsBrut: number;
  poidsTare?: number | null;
  varieteOlive?: string;
  maturite?: string;
  origine?: string;
  dateRecolte?: string;
  dateReception?: string;
  dureeStockageAvantBroyage?: number;
  matierePremiereId?: number;
  campagneAnnee?: string;
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