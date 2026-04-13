export interface Entreprise {
  idEntreprise: number;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
}

export interface Huilerie {
  idHuilerie: number;
  nom: string;
  localisation: string;
  type: string;
  certification: string;
  capaciteProduction: number;
  entrepriseId: number;
  huilerieId?: number;
  active: boolean;
}

export interface Machine {
  idMachine: number;
  nomMachine: string;
  typeMachine: string;
  etatMachine: string;
  capacite: number;
  huilerieId: number;
  huilerieNom?: string;
}

export interface Maintenance {
  idMaintenance: number;
  dateMaintenance: string;
  type: string;
  observations: string;
  machineId: number;
}

export interface CampagneOlives {
  idCampagne: number;
  annee: String;
  dateDebut: string;
  dateFin: string;
  huilerieId: number;
}