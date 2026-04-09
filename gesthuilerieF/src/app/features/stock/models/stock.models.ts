export interface Pesee {
  idPesee?: number;
  reference?: string;
  datePesee: string;
  poidsBrut: number;
  poidsTare: number;
  poidsNet: number;
  lotId: number;
  huilerieId?: number;
  bonPeseePdfPath?: string;
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
  reference?: string;
  huilerieId: number;
  typeStock: string;
  referenceId: number;
  lotReference?: string;
  quantiteDisponible: number;
}

export interface StockMovement {
  id: number;
  reference?: string;
  huilerieId: number;
  referenceId: number;
  lotReference?: string;
  quantite: number;
  commentaire: string;
  dateMouvement: string;
  typeMouvement: 'ARRIVAL' | 'DEPARTURE' | 'TRANSFER' | 'ADJUSTMENT';
}