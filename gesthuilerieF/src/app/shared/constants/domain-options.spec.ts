import { buildGuideStepTemplates } from './domain-options';

describe('buildGuideStepTemplates - Vérification des étapes de séparation', () => {

  it('3_phase: doit inclure "Décanteur 3 phases + Séparateur vertical"', () => {
    const templates = buildGuideStepTemplates('3_phase');

    const separationStep = templates.find(t => t.nom.includes('Décanteur 3 phases'));
    expect(separationStep).toBeDefined();
    expect(separationStep?.nom).toBe('Décanteur 3 phases + Séparateur vertical');
    expect(separationStep?.ordre).toBe(6);

    // Vérifier que les paramètres incluent le décanteur ET le séparateur
    const params = separationStep?.parametres.map(p => p.codeParametre) ?? [];
    expect(params).toContain('vitesse_decanteur_tr_min');
    expect(params).toContain('presence_separateur');
  });

  it('2_phase: doit inclure "Décanteur 2 phases + Séparateur optionnel"', () => {
    const templates = buildGuideStepTemplates('2_phase');

    const separationStep = templates.find(t => t.nom.includes('Décanteur 2 phases'));
    expect(separationStep).toBeDefined();
    expect(separationStep?.nom).toBe('Décanteur 2 phases + Séparateur optionnel');
    expect(separationStep?.ordre).toBe(5);

    // Vérifier les paramètres
    const params = separationStep?.parametres.map(p => p.codeParametre) ?? [];
    expect(params).toContain('vitesse_decanteur_tr_min');
    expect(params).toContain('presence_ajout_eau');
    expect(params).toContain('presence_separateur');
  });

  it('presse: doit inclure "Extraction et Séparation (Décantation naturelle)"', () => {
    const templates = buildGuideStepTemplates('presse');

    const separationStep = templates.find(t => t.nom.includes('Extraction et Séparation'));
    expect(separationStep).toBeDefined();
    expect(separationStep?.nom).toBe('Extraction et Séparation (Décantation naturelle)');
    expect(separationStep?.ordre).toBe(5);

    // Vérifier les paramètres
    const params = separationStep?.parametres.map(p => p.codeParametre) ?? [];
    expect(params).toContain('pression_extraction_bar');
    expect(params).toContain('presence_presse');
  });

  it('Tous les types: pas de "Malaxage" seul (doit être "Malaxeur double cuve (optionnel)")', () => {
    const allTypes = ['3_phase', '2_phase', 'presse'];

    allTypes.forEach(type => {
      const templates = buildGuideStepTemplates(type);
      const malaxageStep = templates.find(t => t.nom === 'Malaxage');
      const malaxeurStep = templates.find(t => t.nom === 'Malaxeur double cuve (optionnel)');

      expect(malaxageStep).toBeUndefined();
      expect(malaxeurStep).toBeDefined();
      console.log(`✓ ${type}: Malaxage correctement renommé`);
    });
  });

  it('Vérifier le nombre total d\'étapes pour chaque type', () => {
    const expected = {
      '3_phase': 7,   // Réception, Nettoyage, Broyage, Malaxeur, Ajout eau, Décanteur+Séparateur, Stockage
      '2_phase': 6,   // Réception, Nettoyage, Broyage, Malaxeur, Décanteur+Séparateur, Stockage
      'presse': 6,    // Réception, Lavage, Broyage, Malaxeur, Extraction+Décantation, Stockage
    };

    Object.entries(expected).forEach(([type, count]) => {
      const templates = buildGuideStepTemplates(type as any);
      expect(templates.length).toBe(count, `${type} devrait avoir ${count} étapes, en a ${templates.length}`);
      console.log(`✓ ${type}: ${count} étapes correctes`);
    });
  });

  it('Console log des étapes par type (pour vérification visuelle)', () => {
    const allTypes = ['3_phase', '2_phase', 'presse'];

    allTypes.forEach(type => {
      const templates = buildGuideStepTemplates(type);
      console.log(`\n=== ${type} ===`);
      templates.forEach(t => {
        console.log(`${t.ordre}. ${t.nom}`);
        if (t.parametres.length > 0) {
          console.log(`   Paramètres: ${t.parametres.map(p => p.codeParametre).join(', ')}`);
        }
      });
    });
  });
});
