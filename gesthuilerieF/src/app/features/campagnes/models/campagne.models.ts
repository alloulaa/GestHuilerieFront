export interface CampagneOlives {
    idCampagne?: number;
    reference?: string;
    annee?: string;
    dateDebut?: string;
    dateFin?: string;
    huilerieId?: number;
    huilerieNom?: string;
}

export interface CampagneOlivesCreate {
    annee: string;
    dateDebut?: string;
    dateFin?: string;
    huilerieId: number;
}
