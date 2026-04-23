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
  poids_olives_kg?: number;
  variete?: string;
  varieteOlive?: string;
  maturite_niveau_1_5?: string;
  origine?: string;
  region?: string;
  methode_recolte?: string;
  type_sol?: string;
  temps_depuis_recolte_heures?: number;
  humidite_pourcent?: number;
  acidite_olives_pourcent?: number;
  taux_feuilles_pourcent?: number;
  lavage_effectue?: string;
  dateRecolte?: string;
  dateReception?: string;
  fournisseurNom?: string;
  fournisseurCIN?: string;
  duree_stockage_jours?: number;
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