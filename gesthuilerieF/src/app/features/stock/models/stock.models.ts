export interface Pesee {
  idPesee?: number;
  idLotArrivage?: number;
  reference?: string;
  datePesee: string;
  pesee: number;
  poidsBrut?: number;
  poidsTare?: number;
  poidsNet?: number;
  lotId: number;
  matierePremiereReference?: string;
  campagneReference?: string;
  huilerieId?: number;
  huilerieNom?: string;
  bonPeseePdfPath?: string;
  fournisseurNom?: string;
  fournisseurCIN?: string;
}

export interface ReceptionPeseeCreatePayload {
  datePesee: string;
  pesee: number;
  variete?: string;
  varieteOlive?: string;
  maturite?: string;
  origine?: string;
  dateRecolte?: string;
  dateReception?: string;
  fournisseurNom?: string;
  fournisseurCIN?: string;
  dureeStockageAvantBroyage?: number;
  matierePremiereReference?: string;
  campagneReference?: string;
  huilerieId: number;
}

export interface Stock {
  idStock: number;
  reference?: string;
  huilerieId: number;
  huilerieNom?: string;
  typeStock: string;
  referenceId: number;
  lotReference?: string;
  lotReferences?: string[];
  matierePremiereId?: number;
  quantiteDisponible: number;
}

export interface StockMovement {
  id: number;
  reference?: string;
  huilerieId: number;
  huilerieNom?: string;
  lotId: number;
  lotReference?: string;
  quantite?: number;
  commentaire: string;
  dateMouvement: string;
  typeMouvement: 'ENTREE' | 'TRANSFERT' | 'AJUSTEMENT';
}