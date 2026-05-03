import { Injectable } from '@angular/core';

export interface ParameterRange {
  min: number;
  max: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class ParameterValidationService {
  // Paramètres d'exécution (olives et processus) - clé = regex pour matcher le paramètre
  private readonly executionParameters: Record<string, ParameterRange> = {
    // Olives
    'acidité olives': { min: 0.1, max: 2.5, name: 'Acidité olives' },
    humidité: { min: 10, max: 30, name: 'Humidité' },
    maturité: { min: 1, max: 5, name: 'Maturité' },
    'feuilles': { min: 0, max: 5, name: 'Feuilles' },
    // Processus
    'température': { min: 20, max: 35, name: 'Température' },
    'durée.*malaxage': { min: 20, max: 60, name: 'Durée malaxage' },
    'vitesse.*décanteur': { min: 2800, max: 3600, name: 'Vitesse décanteur' },
    'pression': { min: 50, max: 350, name: 'Pression' },
  };

  // Paramètres d'analyse (produit final)
  private readonly analysisParameters: Record<string, ParameterRange> = {
    'acidité.*huile': { min: 0.1, max: 3.5, name: 'Acidité huile' },
    'peroxyde': { min: 3, max: 30, name: 'Peroxyde' },
    'polyphénols': { min: 100, max: 800, name: 'Polyphénols' },
    'k232': { min: 1.2, max: 2.8, name: 'K232' },
    'k270': { min: 0.08, max: 0.4, name: 'K270' },
  };

  constructor() { }

  /**
   * Retourne le paramètre correspondant à une clé de recherche
   */
  private findParameterMatch(searchKey: string, parameterDict: Record<string, ParameterRange>): ParameterRange | null {
    const normalizedKey = searchKey.toLowerCase().trim();

    for (const [patternKey, range] of Object.entries(parameterDict)) {
      // Essayer d'abord une correspondance exacte (insensible à la casse)
      if (normalizedKey === patternKey.toLowerCase()) {
        return range;
      }

      // Ensuite, essayer avec une regex
      try {
        const regex = new RegExp(patternKey, 'i');
        if (regex.test(normalizedKey)) {
          return range;
        }
      } catch (e) {
        // Ignorer les erreurs de regex
      }
    }

    return null;
  }

  /**
   * Valide un paramètre d'exécution
   * @returns message d'avertissement si hors limites, null sinon
   */
  validateExecutionParameter(paramName: string, value: number | null | undefined): string | null {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }

    const range = this.findParameterMatch(paramName, this.executionParameters);
    if (!range) {
      return null;
    }

    if (value < range.min) {
      return `⚠️ ${range.name}: ${value} est inférieur au minimum (${range.min})`;
    }
    if (value > range.max) {
      return `⚠️ ${range.name}: ${value} dépasse le maximum (${range.max})`;
    }

    return null;
  }

  /**
   * Retourne l'intervalle d'un paramètre d'exécution si connu
   */
  getExecutionParameterRange(paramName: string): ParameterRange | null {
    return this.findParameterMatch(paramName, this.executionParameters);
  }

  /**
   * Valide un paramètre d'analyse
   * @returns message d'avertissement si hors limites, null sinon
   */
  validateAnalysisParameter(paramName: string, value: number | null | undefined): string | null {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }

    const range = this.findParameterMatch(paramName, this.analysisParameters);
    if (!range) {
      return null;
    }

    if (value < range.min) {
      return `⚠️ ${range.name}: ${value} est inférieur au minimum (${range.min})`;
    }
    if (value > range.max) {
      return `⚠️ ${range.name}: ${value} dépasse le maximum (${range.max})`;
    }

    return null;
  }

  /**
   * Retourne l'intervalle d'un paramètre d'analyse si connu
   */
  getAnalysisParameterRange(paramName: string): ParameterRange | null {
    return this.findParameterMatch(paramName, this.analysisParameters);
  }

  /**
   * Retourne tous les paramètres d'exécution avec leurs intervalles
   */
  getExecutionParameters(): Record<string, ParameterRange> {
    return this.executionParameters;
  }

  /**
   * Retourne tous les paramètres d'analyse avec leurs intervalles
   */
  getAnalysisParameters(): Record<string, ParameterRange> {
    return this.analysisParameters;
  }
}
