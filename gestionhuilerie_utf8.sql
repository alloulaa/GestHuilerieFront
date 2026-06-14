-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: gestionhuilerie
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `administrateur`
--

DROP TABLE IF EXISTS `administrateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `administrateur` (
  `id_utilisateur` bigint(20) NOT NULL,
  `entreprise_id_admin` bigint(20) NOT NULL,
  PRIMARY KEY (`id_utilisateur`),
  UNIQUE KEY `UK44tpalrodl9ytqk2c2n3deju1` (`entreprise_id_admin`),
  CONSTRAINT `FKdib6ntq8vwh62bdimb3w32xki` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateur` (`id_utilisateur`),
  CONSTRAINT `FKggsidf5g9yf7t7ifpqec5k7sv` FOREIGN KEY (`entreprise_id_admin`) REFERENCES `entreprise` (`id_entreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administrateur`
--

LOCK TABLES `administrateur` WRITE;
/*!40000 ALTER TABLE `administrateur` DISABLE KEYS */;
INSERT INTO `administrateur` VALUES (1,1);
/*!40000 ALTER TABLE `administrateur` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analyse_laboratoire`
--

DROP TABLE IF EXISTS `analyse_laboratoire`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analyse_laboratoire` (
  `id_analyse` bigint(20) NOT NULL AUTO_INCREMENT,
  `acidite_huile_pourcent` double DEFAULT NULL,
  `date_analyse` varchar(255) DEFAULT NULL,
  `indice_peroxyde_meq_o2_kg` double DEFAULT NULL,
  `k232` double DEFAULT NULL,
  `k270` double DEFAULT NULL,
  `polyphenols_mg_kg` double DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `lot_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_analyse`),
  UNIQUE KEY `UKauftcdplhc9o41psn6750p1sx` (`lot_id`),
  CONSTRAINT `FKgm49rmfni4udndy59c6ri40w7` FOREIGN KEY (`lot_id`) REFERENCES `lot_olives` (`id_lot`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analyse_laboratoire`
--

LOCK TABLES `analyse_laboratoire` WRITE;
/*!40000 ALTER TABLE `analyse_laboratoire` DISABLE KEYS */;
INSERT INTO `analyse_laboratoire` VALUES (1,0.18,'2026-06-09',7,1.5,0.1,450,'AL01',3),(2,0.6,'2026-06-09',8,2.1,0.18,250,'AL02',4),(3,0.18,'2026-06-10',7,1.5,0.1,450,'AL03',13);
/*!40000 ALTER TABLE `analyse_laboratoire` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campagne_olives`
--

DROP TABLE IF EXISTS `campagne_olives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campagne_olives` (
  `id_campagne` bigint(20) NOT NULL AUTO_INCREMENT,
  `annee` varchar(255) NOT NULL,
  `date_debut` varchar(255) DEFAULT NULL,
  `date_fin` varchar(255) DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `huilerie_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_campagne`),
  UNIQUE KEY `UK9ty5pnudb88ddlxnkg67odakn` (`reference`),
  KEY `FKs8t2iqfuwiums9vdl56spk7hy` (`huilerie_id`),
  CONSTRAINT `FKs8t2iqfuwiums9vdl56spk7hy` FOREIGN KEY (`huilerie_id`) REFERENCES `huilerie` (`id_huilerie`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campagne_olives`
--

LOCK TABLES `campagne_olives` WRITE;
/*!40000 ALTER TABLE `campagne_olives` DISABLE KEYS */;
INSERT INTO `campagne_olives` VALUES (2,'2025','2025-10-23','2026-02-28','CP02',1),(4,'2024','2024-10-22','2025-02-27','CP04',1);
/*!40000 ALTER TABLE `campagne_olives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employe`
--

DROP TABLE IF EXISTS `employe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employe` (
  `id_employe` bigint(20) DEFAULT NULL,
  `id_utilisateur` bigint(20) NOT NULL,
  `huilerie_id_emp` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_utilisateur`),
  KEY `FK24v5ii6k1yah62wr4t60axy3a` (`huilerie_id_emp`),
  CONSTRAINT `FK24v5ii6k1yah62wr4t60axy3a` FOREIGN KEY (`huilerie_id_emp`) REFERENCES `huilerie` (`id_huilerie`),
  CONSTRAINT `FKejqi2vsm7p30774s5rkfnridf` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateur` (`id_utilisateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employe`
--

LOCK TABLES `employe` WRITE;
/*!40000 ALTER TABLE `employe` DISABLE KEYS */;
INSERT INTO `employe` VALUES (2,2,1);
/*!40000 ALTER TABLE `employe` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entreprise`
--

DROP TABLE IF EXISTS `entreprise`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `entreprise` (
  `id_entreprise` bigint(20) NOT NULL AUTO_INCREMENT,
  `adresse` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `nom` varchar(255) DEFAULT NULL,
  `telephone` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_entreprise`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entreprise`
--

LOCK TABLES `entreprise` WRITE;
/*!40000 ALTER TABLE `entreprise` DISABLE KEYS */;
INSERT INTO `entreprise` VALUES (1,'Manouba','4ina@gmail.com','4ina','71203620');
/*!40000 ALTER TABLE `entreprise` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `etape_production`
--

DROP TABLE IF EXISTS `etape_production`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `etape_production` (
  `id_etape_production` bigint(20) NOT NULL AUTO_INCREMENT,
  `code_etape` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `ordre` int(11) NOT NULL,
  `guide_production_id` bigint(20) NOT NULL,
  `machine_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_etape_production`),
  KEY `FKngcreaesaqqyx3hatkg732wao` (`guide_production_id`),
  KEY `FKq4f7nnim5sxsqcf7a73bto8s8` (`machine_id`),
  CONSTRAINT `FKngcreaesaqqyx3hatkg732wao` FOREIGN KEY (`guide_production_id`) REFERENCES `guide_production` (`id_guide_production`),
  CONSTRAINT `FKq4f7nnim5sxsqcf7a73bto8s8` FOREIGN KEY (`machine_id`) REFERENCES `machine` (`id_machine`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `etape_production`
--

LOCK TABLES `etape_production` WRITE;
/*!40000 ALTER TABLE `etape_production` DISABLE KEYS */;
INSERT INTO `etape_production` VALUES (1,'reception','R├®ception des olives et contr├┤le initial de la mati├¿re premi├¿re.','R├®ception',1,1,NULL),(2,'nettoyage_lavage','Nettoyage et lavage des olives avant transformation.','Nettoyage / Lavage',2,1,5),(3,'broyage','Broyage de la mati├¿re premi├¿re avant malaxage.','Broyage',3,1,1),(4,'malaxage','Homog├®n├®isation de la p├óte avec contr├┤le de temp├®rature et dur├®e.','Malaxage',4,1,2),(5,'ajout_eau','Ajout d\'eau n├®cessaire au proc├®d├® 3 phases.','Ajout d\'eau',5,1,6),(6,'decanteur_3_phases_separateur','Extraction et s├®paration par d├®canteur 3 phases suivi d\'un s├®parateur vertical.','D├®canteur 3 phases + S├®parateur vertical',6,1,4),(7,'stockage','Stockage de l\'huile obtenue dans des conditions adapt├®es.','Stockage',7,1,7),(8,'reception','R├®ception des olives et contr├┤le initial de la mati├¿re premi├¿re.','R├®ception',1,2,NULL),(9,'nettoyage','Nettoyage des olives avant transformation.','Nettoyage',2,2,5),(10,'broyage','Broyage de la mati├¿re premi├¿re avant malaxage.','Broyage',3,2,1),(11,'malaxage','Homog├®n├®isation de la p├óte avec contr├┤le de temp├®rature et dur├®e.','Malaxage',4,2,2),(12,'decanteur_2_phases_separateur','Extraction et s├®paration par d├®canteur 2 phases sans ajout d\'eau, avec s├®parateur optionnel selon la qualit├® obtenue.','D├®canteur 2 phases + S├®parateur optionnel',5,2,10),(13,'stockage','Stockage de l\'huile obtenue dans des conditions adapt├®es.','Stockage',6,2,7);
/*!40000 ALTER TABLE `etape_production` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `execution_production`
--

DROP TABLE IF EXISTS `execution_production`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `execution_production` (
  `id_execution_production` bigint(20) NOT NULL AUTO_INCREMENT,
  `controle_temperature` bit(1) DEFAULT NULL,
  `date_debut` varchar(255) DEFAULT NULL,
  `date_fin_prevue` varchar(255) DEFAULT NULL,
  `date_fin_reelle` varchar(255) DEFAULT NULL,
  `observations` varchar(255) DEFAULT NULL,
  `reference` varchar(255) NOT NULL,
  `rendement` double DEFAULT NULL,
  `statut` varchar(255) NOT NULL,
  `guide_production_id` bigint(20) NOT NULL,
  `lot_olives_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_execution_production`),
  UNIQUE KEY `UKjvhjk2kg19xwqcw2y7mmjvyt2` (`reference`),
  KEY `FKmeshbjvxaes4lyw7m9rawx1c8` (`guide_production_id`),
  KEY `FK9fgw77gskwnvnob4fa4cub5x0` (`lot_olives_id`),
  CONSTRAINT `FK9fgw77gskwnvnob4fa4cub5x0` FOREIGN KEY (`lot_olives_id`) REFERENCES `lot_olives` (`id_lot`),
  CONSTRAINT `FKmeshbjvxaes4lyw7m9rawx1c8` FOREIGN KEY (`guide_production_id`) REFERENCES `guide_production` (`id_guide_production`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `execution_production`
--

LOCK TABLES `execution_production` WRITE;
/*!40000 ALTER TABLE `execution_production` DISABLE KEYS */;
INSERT INTO `execution_production` VALUES (1,'','2026-06-05','2026-06-06','2026-06-05','execution de guide 3 phase','EXE-LO01-G1-M5-20260605231641386',18.32,'TERMINEE',1,1),(2,'','2026-06-05','2026-06-06','2026-06-05','guide 3 phase','EXE-LO04-G1-M5-20260605233341461',19.79,'TERMINEE',1,4),(3,'','2026-06-09','2026-06-10','2026-06-09','test','EXE-LO02-G1-M5-20260609130611468',16.49,'TERMINEE',1,2),(4,'\0','2026-06-09','2026-06-10','2026-06-09','test','EXE-LO03-G1-M5-20260609132933323',18.32,'TERMINEE',1,3),(5,'','2026-06-09','2026-06-10','2026-06-09','test','EXE-LO05-G1-M5-20260609133958451',19.85,'TERMINEE',1,5),(6,'','2026-06-09','2026-06-10','2026-06-09','test','EXE-LO06-G1-M5-20260609134202047',19.85,'TERMINEE',1,6),(7,'','2026-06-09','2026-06-10','2026-06-09','test','EXE-LO07-G1-M5-20260609134332700',18.32,'TERMINEE',1,7),(8,'\0','2026-06-09','2026-06-10','2026-06-09','test','EXE-LO08-G1-M5-20260609142350089',18.32,'TERMINEE',1,8),(12,'','2026-06-10','2026-06-11','2026-06-10','test','EXE-LO12-G1-M5-20260610140402527',18.32,'TERMINEE',1,12),(13,'','2026-06-10','2026-06-11',NULL,'test','EXE-LO13-G1-M5-20260610145238633',NULL,'EN_COURS',1,13);
/*!40000 ALTER TABLE `execution_production` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fournisseur`
--

DROP TABLE IF EXISTS `fournisseur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fournisseur` (
  `id_fournisseur` bigint(20) NOT NULL AUTO_INCREMENT,
  `cin` varchar(255) NOT NULL,
  `nom` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_fournisseur`),
  UNIQUE KEY `UKp4le0e7xc0uqcxge0sawids7h` (`cin`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fournisseur`
--

LOCK TABLES `fournisseur` WRITE;
/*!40000 ALTER TABLE `fournisseur` DISABLE KEYS */;
INSERT INTO `fournisseur` VALUES (1,'123456789','Moez Smeti'),(2,'122456789','Fathi Smida');
/*!40000 ALTER TABLE `fournisseur` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guide_production`
--

DROP TABLE IF EXISTS `guide_production`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `guide_production` (
  `id_guide_production` bigint(20) NOT NULL AUTO_INCREMENT,
  `date_creation` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `type_machine` varchar(255) NOT NULL,
  `huilerie_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_guide_production`),
  UNIQUE KEY `UKdbuq3vdui95foprn92qp2ii1a` (`reference`),
  KEY `FK19wxgw32srw4p5426w82wfemd` (`huilerie_id`),
  CONSTRAINT `FK19wxgw32srw4p5426w82wfemd` FOREIGN KEY (`huilerie_id`) REFERENCES `huilerie` (`id_huilerie`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guide_production`
--

LOCK TABLES `guide_production` WRITE;
/*!40000 ALTER TABLE `guide_production` DISABLE KEYS */;
INSERT INTO `guide_production` VALUES (1,'2026-06-05','guide de machine 3 phase','guide 3 phase','GP01','3_phase',1),(2,'2026-06-05','guide de machine 2 phase','guide 2 phase','GP02','2_phase',1);
/*!40000 ALTER TABLE `guide_production` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `huilerie`
--

DROP TABLE IF EXISTS `huilerie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `huilerie` (
  `id_huilerie` bigint(20) NOT NULL AUTO_INCREMENT,
  `active` bit(1) DEFAULT NULL,
  `capacite_production` int(11) DEFAULT NULL,
  `certification` varchar(255) DEFAULT NULL,
  `localisation` varchar(255) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `entreprise_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_huilerie`),
  UNIQUE KEY `uk_huilerie_nom` (`nom`),
  KEY `FK6lxie70n87jisvfj9ga3j5fwf` (`entreprise_id`),
  CONSTRAINT `FK6lxie70n87jisvfj9ga3j5fwf` FOREIGN KEY (`entreprise_id`) REFERENCES `entreprise` (`id_entreprise`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `huilerie`
--

LOCK TABLES `huilerie` WRITE;
/*!40000 ALTER TABLE `huilerie` DISABLE KEYS */;
INSERT INTO `huilerie` VALUES (1,'',500000,'ISO','Nabeul','Olivia','Artisanale',1);
/*!40000 ALTER TABLE `huilerie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lot_olives`
--

DROP TABLE IF EXISTS `lot_olives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lot_olives` (
  `id_lot` bigint(20) NOT NULL AUTO_INCREMENT,
  `acidite_olives_pourcent` double DEFAULT NULL,
  `bon_pesee_pdf_path` varchar(255) DEFAULT NULL,
  `date_reception` varchar(255) DEFAULT NULL,
  `date_recolte` varchar(255) DEFAULT NULL,
  `duree_stockage_avant_broyage` int(11) DEFAULT NULL,
  `humidite_pourcent` double DEFAULT NULL,
  `lavage_effectue` varchar(255) DEFAULT NULL,
  `maturite` varchar(255) DEFAULT NULL,
  `methode_recolte` varchar(255) DEFAULT NULL,
  `origine` varchar(255) DEFAULT NULL,
  `pesee` double DEFAULT NULL,
  `quantite_initiale` double DEFAULT NULL,
  `quantite_restante` double DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `region` varchar(255) DEFAULT NULL,
  `taux_feuilles_pourcent` double DEFAULT NULL,
  `temps_depuis_recolte_heures` int(11) DEFAULT NULL,
  `type_sol` varchar(255) DEFAULT NULL,
  `variete` varchar(255) DEFAULT NULL,
  `campagne_id` bigint(20) NOT NULL,
  `fournisseur_id` bigint(20) DEFAULT NULL,
  `huilerie_id` bigint(20) DEFAULT NULL,
  `matiere_premiere_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_lot`),
  UNIQUE KEY `UKe12qqum22imabxjowbj5qylp0` (`reference`),
  KEY `FKdc5p6f7rm7hut99vh64ct2dsn` (`fournisseur_id`),
  CONSTRAINT `FKdc5p6f7rm7hut99vh64ct2dsn` FOREIGN KEY (`fournisseur_id`) REFERENCES `fournisseur` (`id_fournisseur`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lot_olives`
--

LOCK TABLES `lot_olives` WRITE;
/*!40000 ALTER TABLE `lot_olives` DISABLE KEYS */;
INSERT INTO `lot_olives` VALUES (1,0.2,'generated/bons-pesee/bon-pesee-LO01.pdf','2026-06-05','2026-01-04T05:00',0,10,'Oui','2','manuelle','Bizerte',5000,5000,0,'LO01','Nord',2,5,'argileux','Chetoui',2,1,1,1),(2,0.2,'generated/bons-pesee/bon-pesee-LO02.pdf','2026-06-05','2026-02-15T05:30',4,11,'Oui','2','manuelle','Tunis',5000,5000,0,'LO02','Nord',2,26,'argileux','Chetoui',2,1,1,1),(3,0.2,'generated/bons-pesee/bon-pesee-LO03.pdf','2026-06-05','2026-02-27T05:35',4,12,'Oui','2','mecanique','Mahdia',6000,6000,0,'LO03','Centre',3,2,'argileux','Chemlali',2,2,1,1),(4,0.3,'generated/bons-pesee/bon-pesee-LO04.pdf','2026-06-05','2026-02-02T07:00',0,16,'Oui','4','mecanique','Bizerte',5000,5000,0,'LO04','Nord',0.5,6,'calcaire','Chemlali',2,1,1,1),(5,0.5,'generated/bons-pesee/bon-pesee-LO05.pdf','2026-06-09','2026-02-10T06:00',0,16,'Oui','4','manuelle','Bizerte',6000,6000,0,'LO05','Nord',0.5,2,'argileux','Chetoui',2,1,1,1),(6,0.2,'generated/bons-pesee/bon-pesee-LO06.pdf','2026-06-09','2026-02-09T06:00',0,10,'Oui','5','semi-mecanique','Bizerte',6000,6000,0,'LO06','Nord',0.5,2875,'argileux','Chetoui',2,1,1,1),(7,0.1,'generated/bons-pesee/bon-pesee-LO07.pdf','2026-06-09','2026-02-10T06:00',0,10,'Oui','5','manuelle','Bizerte',3000,3000,0,'LO07','Nord',0.4,1,'argileux','Chetoui',2,1,1,1),(8,0.2,'generated/bons-pesee/bon-pesee-LO08.pdf','2026-06-09','2026-02-10T05:00',0,10,'Oui','5','manuelle','Bizerte',3000,3000,0,'LO08','Nord',2,3,'argileux','Chetoui',2,1,1,1),(9,0.2,'generated/bons-pesee/bon-pesee-LO09.pdf','2026-06-10','2026-02-15T06:00',0,10,'Oui','5','mecanique','Bizerte',5000,5000,0,'LO09','Centre',2,1,'argileux','Chetoui',2,1,1,1),(10,0.2,'generated/bons-pesee/bon-pesee-LO10.pdf','2026-06-10','2026-02-19T06:00',0,10,'Oui','5','manuelle','Bizerte',3000,3000,0,'LO10','Nord',2,3,'argileux','Chetoui',2,1,1,1),(11,0.2,'generated/bons-pesee/bon-pesee-LO11.pdf','2026-06-10','2026-02-14T05:00',0,10,'Oui','5','manuelle','Bizerte',5000,5000,0,'LO11','Nord',2,3,'argileux','Chetoui',2,1,1,1),(12,0.2,'generated/bons-pesee/bon-pesee-LO12.pdf','2026-06-10','2026-02-17T06:00',0,10,'Oui','5','manuelle','Bizerte',3000,3000,0,'LO12','Centre',2,2,'argileux','Chetoui',2,1,1,1),(13,0.2,'generated/bons-pesee/bon-pesee-LO13.pdf','2026-06-10','2026-02-10T06:00',0,12,'Oui','2','mecanique','Bizerte',6000,6000,0,'LO13','Centre',3,2,'argileux','Chemlali',2,1,1,1);
/*!40000 ALTER TABLE `lot_olives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine`
--

DROP TABLE IF EXISTS `machine`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `machine` (
  `id_machine` bigint(20) NOT NULL AUTO_INCREMENT,
  `capacite` int(11) DEFAULT NULL,
  `categorie_machine` varchar(255) DEFAULT NULL,
  `etat_machine` varchar(255) DEFAULT NULL,
  `nom_machine` varchar(255) DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `type_machine` varchar(255) DEFAULT NULL,
  `huilerie_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_machine`),
  UNIQUE KEY `UKrwc4ysfgi3rc8nws96lianqyt` (`reference`),
  KEY `FK7awy44m6t3cr5bieg6mcn7rj6` (`huilerie_id`),
  CONSTRAINT `FK7awy44m6t3cr5bieg6mcn7rj6` FOREIGN KEY (`huilerie_id`) REFERENCES `huilerie` (`id_huilerie`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine`
--

LOCK TABLES `machine` WRITE;
/*!40000 ALTER TABLE `machine` DISABLE KEYS */;
INSERT INTO `machine` VALUES (1,110000,'broyage','EN_SERVICE','Broyeur B-01','MC01','marteaux',1),(2,120000,'malaxage','EN_SERVICE','Malaxeur M-01','MC02','horizontal',1),(3,150000,'extraction','EN_SERVICE','Extracteur E-01','MC03','centrifugation_3_phases',1),(4,110000,'separation','EN_SERVICE','Separateur S-01','MC04','decanteur_3_phases',1),(5,10000,'nettoyage','EN_SERVICE','Nettoyeur N-01','MC05','laveuse_eau',1),(6,120000,'ajout_eau','EN_SERVICE','Systeme injection d\'eau','MC06','systeme_injection_eau',1),(7,500000,'stockage','EN_SERVICE','Cuve inox','MC07','cuve_inox',1),(9,160000,'extraction','EN_SERVICE','Extracteur E-02','MC09','centrifugation_2_phases',1),(10,120000,'separation','EN_SERVICE','Separateur S-02','MC10','decanteur_2_phases',1);
/*!40000 ALTER TABLE `machine` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matiere_premiere`
--

DROP TABLE IF EXISTS `matiere_premiere`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `matiere_premiere` (
  `id_matiere_premiere` bigint(20) NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `nom` varchar(255) DEFAULT NULL,
  `reference` varchar(255) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `unite_mesure` varchar(255) DEFAULT NULL,
  `huilerie_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_matiere_premiere`),
  UNIQUE KEY `UKi7g03id651f2rn7yicrvudnar` (`reference`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matiere_premiere`
--

LOCK TABLES `matiere_premiere` WRITE;
/*!40000 ALTER TABLE `matiere_premiere` DISABLE KEYS */;
INSERT INTO `matiere_premiere` VALUES (1,'-','Olive','MP01','Olive noir','kg',1),(2,'-','Olive','MP02','Olive vert','kg',1);
/*!40000 ALTER TABLE `matiere_premiere` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module`
--

DROP TABLE IF EXISTS `module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `module` (
  `id_module` bigint(20) NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) NOT NULL,
  PRIMARY KEY (`id_module`),
  UNIQUE KEY `uk_module_nom` (`nom`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module`
--

LOCK TABLES `module` WRITE;
/*!40000 ALTER TABLE `module` DISABLE KEYS */;
INSERT INTO `module` VALUES (3,'CAMPAGNE_OLIVES'),(12,'COMPTES_PROFILS'),(1,'DASHBOARD'),(10,'DASHBOARD_ADMIN'),(4,'GUIDE_PRODUCTION'),(11,'HUILERIES'),(9,'LOTS_TRA├çABILITE'),(5,'MACHINES'),(6,'MATIERES_PREMIERES'),(2,'RECEPTION'),(7,'STOCK'),(8,'STOCK_MOUVEMENT');
/*!40000 ALTER TABLE `module` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametre_etape`
--

DROP TABLE IF EXISTS `parametre_etape`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parametre_etape` (
  `id_parametre_etape` bigint(20) NOT NULL AUTO_INCREMENT,
  `code_parametre` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `unite_mesure` varchar(255) DEFAULT NULL,
  `valeur_estime` varchar(255) DEFAULT NULL,
  `etape_production_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_parametre_etape`),
  KEY `FKn33lu4fe47o1yqh5rurykmyv5` (`etape_production_id`),
  CONSTRAINT `FKn33lu4fe47o1yqh5rurykmyv5` FOREIGN KEY (`etape_production_id`) REFERENCES `etape_production` (`id_etape_production`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametre_etape`
--

LOCK TABLES `parametre_etape` WRITE;
/*!40000 ALTER TABLE `parametre_etape` DISABLE KEYS */;
INSERT INTO `parametre_etape` VALUES (1,'temperature_malaxage_c','Temperature de malaxage','Temperature de malaxage','C','26',4),(2,'duree_malaxage_min','Duree de malaxage','Duree de malaxage','min','35',4),(3,'presence_eau','Pr├®sence eau','presence_eau','bool','1',5),(4,'vitesse_decanteur_tr_min','Vitesse du decanteur 3 phases','Vitesse du decanteur','tr/min','3200',6),(5,'presence_separateur','1 = separateur obligatoire','Presence separateur','bool','1',6),(6,'temperature_malaxage_c','Temperature de malaxage','Temperature de malaxage','C','25',11),(7,'duree_malaxage_min','Duree de malaxage','Duree de malaxage','min','35',11),(8,'vitesse_decanteur_tr_min','Vitesse du decanteur 2 phases','Vitesse du decanteur','tr/min','3200',12),(9,'presence_eau','Pr├®sence eau','presence_eau','bool','0',12),(10,'presence_separateur','0 ou 1 selon configuration','Presence separateur','bool','0',12);
/*!40000 ALTER TABLE `parametre_etape` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `expires_at` datetime(6) NOT NULL,
  `token` varchar(255) NOT NULL,
  `used` bit(1) NOT NULL,
  `utilisateur_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK71lqwbwtklmljk3qlsugr1mig` (`token`),
  KEY `idx_password_reset_tokens_utilisateur_id` (`utilisateur_id`),
  CONSTRAINT `FKeibiibmif85i859utr8rl5vf` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateur` (`id_utilisateur`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,'2026-06-05 16:01:42.000000','ed509042-bf03-4fcc-b2e7-9473e915b266','',2);
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permission`
--

DROP TABLE IF EXISTS `permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permission` (
  `id_privilege` bigint(20) NOT NULL AUTO_INCREMENT,
  `can_create` bit(1) NOT NULL,
  `can_delete` bit(1) NOT NULL,
  `can_executed` bit(1) NOT NULL,
  `can_read` bit(1) NOT NULL,
  `can_update` bit(1) NOT NULL,
  `date_creation` datetime(6) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `module_id` bigint(20) NOT NULL,
  `profil_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_privilege`),
  UNIQUE KEY `uk_permission_profil_module` (`profil_id`,`module_id`),
  KEY `idx_permission_profil_id` (`profil_id`),
  KEY `idx_permission_module_id` (`module_id`),
  CONSTRAINT `FKrblidv8pvif32dp9fe2f0i9pp` FOREIGN KEY (`profil_id`) REFERENCES `profil` (`id_profil`),
  CONSTRAINT `FKtnix0mh61fpm4o7cb7n3a5uj7` FOREIGN KEY (`module_id`) REFERENCES `module` (`id_module`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permission`
--

LOCK TABLES `permission` WRITE;
/*!40000 ALTER TABLE `permission` DISABLE KEYS */;
INSERT INTO `permission` VALUES (1,'','','','','','2026-06-04 19:13:14.000000',NULL,1,1),(2,'','','','','','2026-06-04 19:13:14.000000',NULL,2,1),(3,'','','','','','2026-06-04 19:13:14.000000',NULL,3,1),(4,'','','','','','2026-06-04 19:13:14.000000',NULL,4,1),(5,'','','','','','2026-06-04 19:13:14.000000',NULL,5,1),(6,'','','','','','2026-06-04 19:13:14.000000',NULL,6,1),(7,'','','','','','2026-06-04 19:13:14.000000',NULL,7,1),(8,'','','','','','2026-06-04 19:13:14.000000',NULL,8,1),(9,'','','','','','2026-06-04 19:13:14.000000',NULL,9,1),(10,'','','','','','2026-06-04 19:13:14.000000',NULL,10,1),(11,'','','','','','2026-06-04 19:13:14.000000',NULL,11,1),(12,'','','','','','2026-06-04 19:13:14.000000',NULL,12,1),(13,'\0','\0','\0','','\0','2026-06-04 19:13:14.000000',NULL,1,2),(14,'','','','','','2026-06-04 19:13:14.000000',NULL,2,2),(15,'','','\0','','','2026-06-04 19:13:14.000000',NULL,3,2),(16,'','','','','','2026-06-04 19:13:14.000000',NULL,4,2),(17,'\0','\0','\0','','\0','2026-06-04 19:13:14.000000',NULL,5,2),(18,'','','\0','','','2026-06-04 19:13:14.000000',NULL,6,2),(19,'','','\0','','','2026-06-04 19:13:14.000000',NULL,7,2),(20,'','','\0','','','2026-06-04 19:13:14.000000',NULL,8,2),(21,'','','\0','','','2026-06-04 19:13:14.000000',NULL,9,2),(22,'\0','\0','\0','\0','\0','2026-06-04 19:13:14.000000',NULL,10,2),(23,'\0','\0','\0','\0','\0','2026-06-04 19:13:14.000000',NULL,11,2),(24,'\0','\0','\0','\0','\0','2026-06-04 19:13:14.000000',NULL,12,2);
/*!40000 ALTER TABLE `permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prediction`
--

DROP TABLE IF EXISTS `prediction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `prediction` (
  `id_prediction` bigint(20) NOT NULL AUTO_INCREMENT,
  `date_creation` varchar(255) NOT NULL,
  `mode_prediction` varchar(50) NOT NULL,
  `probabilite_qualite` double DEFAULT NULL,
  `qualite_predite` varchar(100) DEFAULT NULL,
  `quantite_huile_recalculee_litres` double DEFAULT NULL,
  `rendement_predit_pourcent` double DEFAULT NULL,
  `execution_production_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_prediction`),
  KEY `FKj6tsqot6di22fojhgt55y7x0g` (`execution_production_id`),
  CONSTRAINT `FKj6tsqot6di22fojhgt55y7x0g` FOREIGN KEY (`execution_production_id`) REFERENCES `execution_production` (`id_execution_production`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prediction`
--

LOCK TABLES `prediction` WRITE;
/*!40000 ALTER TABLE `prediction` DISABLE KEYS */;
INSERT INTO `prediction` VALUES (1,'2026-06-05T23:16:46.3154272','no_lab',0.5709,'Extra Vierge',1051.58,19.26,1),(2,'2026-06-05T23:33:43.4538112','no_lab',0.5247,'Extra Vierge',1083.89,19.86,2),(3,'2026-06-09T13:06:15.6523257','no_lab',0.471,'Vierge',963.11,17.64,3),(4,'2026-06-09T13:29:37.3075233','with_lab',0.85,'Extra Vierge',1231.21,18.8,4),(5,'2026-06-09T13:40:15.1577931','no_lab',0.4571,'Extra Vierge',1267.95,19.36,5),(6,'2026-06-09T13:42:04.7014801','no_lab',0.6209,'Extra Vierge',1331.79,20.33,6),(7,'2026-06-09T13:43:34.5391273','no_lab',0.6291,'Extra Vierge',664.24,20.28,7),(8,'2026-06-09T14:23:58.9715255','no_lab',0.5964,'Extra Vierge',669.23,20.43,8),(9,'2026-06-10T13:10:35.5605076','no_lab',0.5808,'Extra Vierge',1122.71,20.57,9),(10,'2026-06-10T13:37:25.8432662','no_lab',0.5681,'Extra Vierge',673.16,20.55,10),(11,'2026-06-10T13:52:57.9517817','no_lab',0.5808,'Extra Vierge',1122.71,20.57,11),(12,'2026-06-10T14:04:04.761245','no_lab',0.5988,'Extra Vierge',662.85,20.24,12),(13,'2026-06-10T14:52:41.4831958','with_lab',0.8716,'Extra Vierge',1286.5,19.64,13);
/*!40000 ALTER TABLE `prediction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produit_final`
--

DROP TABLE IF EXISTS `produit_final`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `produit_final` (
  `id_produit` bigint(20) NOT NULL AUTO_INCREMENT,
  `date_production` varchar(255) DEFAULT NULL,
  `nom_produit` varchar(255) DEFAULT NULL,
  `qualite` varchar(255) DEFAULT NULL,
  `quantite_produite` double DEFAULT NULL,
  `reference` varchar(255) NOT NULL,
  `rendement` double DEFAULT NULL,
  `execution_production_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_produit`),
  UNIQUE KEY `UK7cdn25ccec1pdyh0c8ndvdewn` (`reference`),
  KEY `FKq12xc6sk9sem5coy8jg2ygjjl` (`execution_production_id`),
  CONSTRAINT `FKq12xc6sk9sem5coy8jg2ygjjl` FOREIGN KEY (`execution_production_id`) REFERENCES `execution_production` (`id_execution_production`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produit_final`
--

LOCK TABLES `produit_final` WRITE;
/*!40000 ALTER TABLE `produit_final` DISABLE KEYS */;
INSERT INTO `produit_final` VALUES (1,'2026-06-06','Huile Chetoui','vierge',1000,'PF01',18.32,1),(2,'2026-06-06','Huile Chemlali','extra vierge',1080,'PF02',19.79,2),(3,'2026-06-10','Huile Chetoui','vierge',1300,'PF03',19.85,5),(4,'2026-06-10','Huile Chetoui','vierge',1300,'PF04',19.85,6),(5,'2026-06-10','Huile Chemlali','vierge',1200,'PF05',18.32,4),(6,'2026-06-10','Huile Chetoui','vierge',600,'PF06',18.32,7),(7,'2026-06-10','Huile Chetoui','vierge',900,'PF07',16.49,3),(8,'2026-06-10','Huile Chetoui','vierge',600,'PF08',18.32,8),(9,'2026-06-11','Huile Chetoui','vierge',1119.99,'PF09',20.52,9),(10,'2026-06-11','Huile Chetoui','extra vierge',600,'PF10',18.32,10),(11,'2026-06-11','Huile Chetoui','vierge',1120,'PF11',20.52,11),(12,'2026-06-10T13:04:29','Huile Chetoui','extra vierge',600,'PF12',18.32,12);
/*!40000 ALTER TABLE `produit_final` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profil`
--

DROP TABLE IF EXISTS `profil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profil` (
  `id_profil` bigint(20) NOT NULL AUTO_INCREMENT,
  `date_creation` datetime(6) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  PRIMARY KEY (`id_profil`),
  UNIQUE KEY `uk_profil_nom` (`nom`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profil`
--

LOCK TABLES `profil` WRITE;
/*!40000 ALTER TABLE `profil` DISABLE KEYS */;
INSERT INTO `profil` VALUES (1,'2026-06-04 19:13:14.000000','Acces total','ADMIN'),(2,'2026-06-04 19:13:14.000000','Acces operations metier','RESPONSABLE_PRODUCTION');
/*!40000 ALTER TABLE `profil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `expires_at` datetime(6) NOT NULL,
  `revoked` bit(1) NOT NULL,
  `token` varchar(255) NOT NULL,
  `utilisateur_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKghpmfn23vmxfu3spu3lfg4r2d` (`token`),
  KEY `idx_refresh_tokens_utilisateur_id` (`utilisateur_id`),
  CONSTRAINT `FKq2qrsiqa8xfqkhsxr5tuqt9ai` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateur` (`id_utilisateur`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (1,'2026-06-11 20:00:42.000000','\0','0d1180bf-2f95-4854-b532-5fcc0147547f',1),(2,'2026-06-12 14:34:00.000000','\0','6fd0f377-15e0-4554-9714-0b0a8bb28069',1),(3,'2026-06-12 15:26:36.000000','\0','a2bf570c-457c-464a-8fb4-82333e0aa0af',1),(4,'2026-06-12 15:27:50.000000','','01ad2318-b4a9-42a5-93e5-1e5cc070d8b9',2),(5,'2026-06-12 15:32:36.000000','\0','1002f2e4-4858-49b9-a524-1089b27b7971',2),(6,'2026-06-12 22:41:35.000000','\0','80f8b417-531a-484a-9574-d4bed1dfbf11',2),(7,'2026-06-16 10:16:20.000000','\0','1815137a-6fc7-4f62-96d9-52f5ced413f7',1),(8,'2026-06-17 13:06:02.000000','\0','aca3def1-8d7a-45e2-8455-b5c58a897688',1),(9,'2026-06-17 13:07:37.000000','\0','bfa6df26-7c15-4ad7-8a53-b844b579f327',2),(10,'2026-06-19 13:58:12.000000','\0','7dcba405-a8e5-48c8-af09-ed07cfce8cc5',1);
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock`
--

DROP TABLE IF EXISTS `stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock` (
  `id_stock` bigint(20) NOT NULL AUTO_INCREMENT,
  `quantite_disponible` double DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `type_stock` varchar(255) DEFAULT NULL,
  `variete` varchar(255) DEFAULT NULL,
  `lot_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_stock`),
  KEY `FKahn3gfs4jg4dh0cfjmmq66xtq` (`lot_id`),
  CONSTRAINT `FKahn3gfs4jg4dh0cfjmmq66xtq` FOREIGN KEY (`lot_id`) REFERENCES `lot_olives` (`id_lot`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock`
--

LOCK TABLES `stock` WRITE;
/*!40000 ALTER TABLE `stock` DISABLE KEYS */;
INSERT INTO `stock` VALUES (1,0,'ST01','Olive noir','chetoui',12),(2,0,'ST02','Olive noir','chemlali',13);
/*!40000 ALTER TABLE `stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movement`
--

DROP TABLE IF EXISTS `stock_movement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_movement` (
  `id_stock_movement` bigint(20) NOT NULL AUTO_INCREMENT,
  `commentaire` varchar(255) DEFAULT NULL,
  `date_mouvement` varchar(255) DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `type_mouvement` enum('AJUSTEMENT','ENTREE','TRANSFERT') DEFAULT NULL,
  `lot_id` bigint(20) DEFAULT NULL,
  `stock_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_stock_movement`),
  KEY `FKkd9a4774f6adw0i0q6xy4tgpv` (`lot_id`),
  KEY `FKs3qeghgdh1ye5iecin4v9jsjk` (`stock_id`),
  CONSTRAINT `FKkd9a4774f6adw0i0q6xy4tgpv` FOREIGN KEY (`lot_id`) REFERENCES `lot_olives` (`id_lot`),
  CONSTRAINT `FKs3qeghgdh1ye5iecin4v9jsjk` FOREIGN KEY (`stock_id`) REFERENCES `stock` (`id_stock`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movement`
--

LOCK TABLES `stock_movement` WRITE;
/*!40000 ALTER TABLE `stock_movement` DISABLE KEYS */;
INSERT INTO `stock_movement` VALUES (1,'Arrivage lot LO01','2026-06-05','MS01','ENTREE',1,1),(2,'Arrivage lot LO02','2026-06-05','MS02','ENTREE',2,1),(3,'Arrivage lot LO03','2026-06-05','MS03','ENTREE',3,2),(4,'Transfert automatique lors de l\'execution EXE-LO01-G1-M5-20260605231641386','2026-06-05','MS04','TRANSFERT',1,1),(5,'Arrivage lot LO04','2026-06-05','MS05','ENTREE',4,2),(6,'Transfert automatique lors de l\'execution EXE-LO04-G1-M5-20260605233341461','2026-06-05','MS06','TRANSFERT',4,2),(7,'Transfert automatique lors de l\'execution EXE-LO02-G1-M5-20260609130611468','2026-06-09','MS07','TRANSFERT',2,1),(8,'Transfert automatique lors de l\'execution EXE-LO03-G1-M5-20260609132933323','2026-06-09','MS08','TRANSFERT',3,2),(9,'Arrivage lot LO05','2026-06-09','MS09','ENTREE',5,1),(10,'Transfert automatique lors de l\'execution EXE-LO05-G1-M5-20260609133958451','2026-06-09','MS10','TRANSFERT',5,1),(11,'Arrivage lot LO06','2026-06-09','MS11','ENTREE',6,1),(12,'Transfert automatique lors de l\'execution EXE-LO06-G1-M5-20260609134202047','2026-06-09','MS12','TRANSFERT',6,1),(13,'Arrivage lot LO07','2026-06-09','MS13','ENTREE',7,1),(14,'Transfert automatique lors de l\'execution EXE-LO07-G1-M5-20260609134332700','2026-06-09','MS14','TRANSFERT',7,1),(15,'Arrivage lot LO08','2026-06-09','MS15','ENTREE',8,1),(16,'Transfert automatique lors de l\'execution EXE-LO08-G1-M5-20260609142350089','2026-06-09','MS16','TRANSFERT',8,1),(17,'Arrivage lot LO09','2026-06-10','MS17','ENTREE',9,1),(18,'Transfert automatique lors de l\'execution EXE-LO09-G5-M5-20260610131033659','2026-06-10','MS18','TRANSFERT',9,1),(19,'Arrivage lot LO10','2026-06-10','MS19','ENTREE',10,1),(20,'Transfert automatique lors de l\'execution EXE-LO10-G5-M5-20260610133718763','2026-06-10','MS20','TRANSFERT',10,1),(21,'Arrivage lot LO11','2026-06-10','MS21','ENTREE',11,1),(22,'Transfert automatique lors de l\'execution EXE-LO11-G5-M5-20260610135254579','2026-06-10','MS22','TRANSFERT',11,1),(23,'Arrivage lot LO12','2026-06-10','MS23','ENTREE',12,1),(24,'Transfert automatique lors de l\'execution EXE-LO12-G1-M5-20260610140402527','2026-06-10','MS24','TRANSFERT',12,1),(25,'Arrivage lot LO13','2026-06-10','MS25','ENTREE',13,2),(26,'Transfert automatique lors de l\'execution EXE-LO13-G1-M5-20260610145238633','2026-06-10','MS26','TRANSFERT',13,2);
/*!40000 ALTER TABLE `stock_movement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utilisateur`
--

DROP TABLE IF EXISTS `utilisateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `utilisateur` (
  `id_utilisateur` bigint(20) NOT NULL AUTO_INCREMENT,
  `actif` enum('ACTIF','INACTIF') NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified` bit(1) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `prenom` varchar(255) NOT NULL,
  `telephone` varchar(255) DEFAULT NULL,
  `verification_token` varchar(255) DEFAULT NULL,
  `verification_token_expires_at` datetime(6) DEFAULT NULL,
  `profil_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_utilisateur`),
  UNIQUE KEY `UKrma38wvnqfaf66vvmi57c71lo` (`email`),
  UNIQUE KEY `UKhtdd6m7831984elvqeip9u78a` (`verification_token`),
  KEY `idx_utilisateur_id` (`id_utilisateur`),
  KEY `FKssvnc79lcj8l1hwgm230fiuh7` (`profil_id`),
  CONSTRAINT `FKssvnc79lcj8l1hwgm230fiuh7` FOREIGN KEY (`profil_id`) REFERENCES `profil` (`id_profil`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utilisateur`
--

LOCK TABLES `utilisateur` WRITE;
/*!40000 ALTER TABLE `utilisateur` DISABLE KEYS */;
INSERT INTO `utilisateur` VALUES (1,'ACTIF','admin@default.com','','$2a$10$msp./iTLx6SWwVJLFavh9ud5eCQ6ukFgj22I5kCNgk0r43/IEmwLi','Admin','Syst├¿me',NULL,'87d60a2f-5ff7-4b34-a73b-b1b8eb333fa2','2026-06-05 19:15:03.000000',1),(2,'ACTIF','takwasmati00@gmail.com','','$2a$10$ti2zROBuMEQLDFeEU2eWheaYyJh62b/1enjqVcBNskE6oxZfclSUm','takwa','smati','51304582','7984da26-7bd5-4c1c-837a-28e19b43bd8c','2026-06-06 15:27:50.000000',2);
/*!40000 ALTER TABLE `utilisateur` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `valeur_reelle_parametre`
--

DROP TABLE IF EXISTS `valeur_reelle_parametre`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `valeur_reelle_parametre` (
  `id_valeur_reelle_parametre` bigint(20) NOT NULL AUTO_INCREMENT,
  `date_creation` datetime(6) DEFAULT NULL,
  `date_modification` datetime(6) DEFAULT NULL,
  `deviation` double DEFAULT NULL,
  `qualite_deviation` varchar(255) DEFAULT NULL,
  `valeur_reelle` double NOT NULL,
  `execution_production_id` bigint(20) NOT NULL,
  `parametre_etape_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id_valeur_reelle_parametre`),
  KEY `FKaoim1v7qmeesyv3gjudk2d03` (`execution_production_id`),
  KEY `FKix44cxx4m626tfiw4eqyjx89v` (`parametre_etape_id`),
  CONSTRAINT `FKaoim1v7qmeesyv3gjudk2d03` FOREIGN KEY (`execution_production_id`) REFERENCES `execution_production` (`id_execution_production`),
  CONSTRAINT `FKix44cxx4m626tfiw4eqyjx89v` FOREIGN KEY (`parametre_etape_id`) REFERENCES `parametre_etape` (`id_parametre_etape`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `valeur_reelle_parametre`
--

LOCK TABLES `valeur_reelle_parametre` WRITE;
/*!40000 ALTER TABLE `valeur_reelle_parametre` DISABLE KEYS */;
INSERT INTO `valeur_reelle_parametre` VALUES (1,'2026-06-05 23:46:14.000000','2026-06-05 23:46:14.000000',0,'FAIBLE',26,1,1),(2,'2026-06-05 23:46:14.000000','2026-06-05 23:46:14.000000',0,'FAIBLE',35,1,2),(3,'2026-06-05 23:46:14.000000','2026-06-05 23:46:14.000000',0,'FAIBLE',1,1,3),(4,'2026-06-05 23:46:14.000000','2026-06-05 23:46:14.000000',-3.125,'FAIBLE',3100,1,4),(5,'2026-06-05 23:46:14.000000','2026-06-05 23:46:14.000000',0,'FAIBLE',1,1,5),(6,'2026-06-05 23:48:35.000000','2026-06-05 23:48:35.000000',0,'FAIBLE',26,2,1),(7,'2026-06-05 23:48:35.000000','2026-06-05 23:48:35.000000',5.714285714285714,'FAIBLE',37,2,2),(8,'2026-06-05 23:48:35.000000','2026-06-05 23:48:35.000000',0,'FAIBLE',1,2,3),(9,'2026-06-05 23:48:35.000000','2026-06-05 23:48:35.000000',-3.125,'FAIBLE',3100,2,4),(10,'2026-06-05 23:48:35.000000','2026-06-05 23:48:35.000000',0,'FAIBLE',1,2,5),(11,'2026-06-09 12:58:09.000000','2026-06-09 12:58:09.000000',-100,'IMPORTANTE',0,5,1),(12,'2026-06-09 12:58:09.000000','2026-06-09 12:58:09.000000',0,'FAIBLE',35,5,2),(13,'2026-06-09 12:58:09.000000','2026-06-09 12:58:09.000000',-100,'IMPORTANTE',0,5,3),(14,'2026-06-09 12:58:09.000000','2026-06-09 12:58:09.000000',0,'FAIBLE',3200,5,4),(15,'2026-06-09 12:58:09.000000','2026-06-09 12:58:09.000000',-100,'IMPORTANTE',0,5,5),(16,'2026-06-09 12:59:43.000000','2026-06-09 12:59:43.000000',0,'FAIBLE',26,6,1),(17,'2026-06-09 12:59:44.000000','2026-06-09 12:59:44.000000',0,'FAIBLE',35,6,2),(18,'2026-06-09 12:59:44.000000','2026-06-09 12:59:44.000000',-100,'IMPORTANTE',0,6,3),(19,'2026-06-09 12:59:44.000000','2026-06-09 12:59:44.000000',0,'FAIBLE',3200,6,4),(20,'2026-06-09 12:59:44.000000','2026-06-09 12:59:44.000000',-100,'IMPORTANTE',0,6,5),(21,'2026-06-09 13:06:02.000000','2026-06-09 13:06:02.000000',0,'FAIBLE',26,4,1),(22,'2026-06-09 13:06:03.000000','2026-06-09 13:06:03.000000',0,'FAIBLE',35,4,2),(23,'2026-06-09 13:06:03.000000','2026-06-09 13:06:03.000000',-100,'IMPORTANTE',0,4,3),(24,'2026-06-09 13:06:03.000000','2026-06-09 13:06:03.000000',0,'FAIBLE',3200,4,4),(25,'2026-06-09 13:06:03.000000','2026-06-09 13:06:03.000000',-100,'IMPORTANTE',0,4,5),(26,'2026-06-09 13:18:52.000000','2026-06-09 13:18:52.000000',0,'FAIBLE',26,7,1),(27,'2026-06-09 13:18:52.000000','2026-06-09 13:18:52.000000',0,'FAIBLE',35,7,2),(28,'2026-06-09 13:18:52.000000','2026-06-09 13:18:52.000000',-100,'IMPORTANTE',0,7,3),(29,'2026-06-09 13:18:52.000000','2026-06-09 13:18:52.000000',0,'FAIBLE',3200,7,4),(30,'2026-06-09 13:18:52.000000','2026-06-09 13:18:52.000000',-100,'IMPORTANTE',0,7,5),(31,'2026-06-09 13:22:42.000000','2026-06-09 13:22:42.000000',0,'FAIBLE',26,3,1),(32,'2026-06-09 13:22:42.000000','2026-06-09 13:22:42.000000',0,'FAIBLE',35,3,2),(33,'2026-06-09 13:22:42.000000','2026-06-09 13:22:42.000000',-100,'IMPORTANTE',0,3,3),(34,'2026-06-09 13:22:42.000000','2026-06-09 13:22:42.000000',0,'FAIBLE',3200,3,4),(35,'2026-06-09 13:22:42.000000','2026-06-09 13:22:42.000000',-100,'IMPORTANTE',0,3,5),(36,'2026-06-09 13:33:44.000000','2026-06-09 13:33:44.000000',0,'FAIBLE',26,8,1),(37,'2026-06-09 13:33:45.000000','2026-06-09 13:33:45.000000',0,'FAIBLE',35,8,2),(38,'2026-06-09 13:33:45.000000','2026-06-09 13:33:45.000000',0,'FAIBLE',1,8,3),(39,'2026-06-09 13:33:45.000000','2026-06-09 13:33:45.000000',0,'FAIBLE',3200,8,4),(40,'2026-06-09 13:33:45.000000','2026-06-09 13:33:45.000000',0,'FAIBLE',1,8,5),(56,'2026-06-10 13:04:29.000000','2026-06-10 13:04:29.000000',0,'FAIBLE',26,12,1),(57,'2026-06-10 13:04:29.000000','2026-06-10 13:04:29.000000',0,'FAIBLE',35,12,2),(58,'2026-06-10 13:04:29.000000','2026-06-10 13:04:29.000000',0,'FAIBLE',1,12,3),(59,'2026-06-10 13:04:29.000000','2026-06-10 13:04:29.000000',0,'FAIBLE',3200,12,4),(60,'2026-06-10 13:04:29.000000','2026-06-10 13:04:29.000000',-100,'IMPORTANTE',0,12,5);
/*!40000 ALTER TABLE `valeur_reelle_parametre` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-12 20:06:06
