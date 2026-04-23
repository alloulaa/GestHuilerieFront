# TODO - Extraction valeur_reelle dans table dédiée

## Backend (Spring Boot)
- [ ] 1. Migration SQL V22 : créer table `valeur_reelle_parametre`, migrer données, supprimer colonne `valeur_reelle` de `parametre_etape`, supprimer FK `execution_production_id` de `parametre_etape`
- [ ] 2. Entité JPA `ValeurReelleParametre.java`
- [ ] 3. Repository `ValeurReelleParametreRepository.java`
- [ ] 4. Modifier `ParametreEtape.java` : supprimer `valeurReelle` et `executionProduction`, ajouter `@OneToMany` vers `ValeurReelleParametre`
- [ ] 5. Modifier `ExecutionProduction.java` : remplacer `List<ParametreEtape> parametres` par `List<ValeurReelleParametre> valeursReelles`
- [ ] 6. Modifier `ParametreEtapeDTO.java` : supprimer `valeurReelle`
- [ ] 7. Modifier `ValeurReelleParametreDTO.java` : ajouter `idValeurReelle`, `executionProductionId`, `dateCreation`
- [ ] 8. Modifier `GuideProductionService.java` : `toDTO(ParametreEtape)` sans `valeurReelle`
- [ ] 9. Modifier `ExecutionProductionService.java` : `loadValeursReelles` et `saveValeursReelles` utilisent `ValeurReelleParametre`
- [ ] 10. Modifier `ProduitFinalService.java` : adapter `loadValeursReelles` et `toDTO`

## Frontend (Angular)
- [ ] 11. Modifier `production.models.ts` : `ParametreEtape` sans `valeurReelle?`, `ValeurReelleParametre` avec `idValeurReelleParametre`, `executionProductionId`, `dateCreation`
- [ ] 12. Modifier `guides-executer.component.ts` : lecture depuis `parametre.valeursReelles` au lieu de `parametre.valeurReelle`

