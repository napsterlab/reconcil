import { date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cabinetsTable = pgTable("cabinets", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull(),
  email: text("email").notNull(),
  planTarifaire: text("plan_tarifaire").notNull().default("decouverte"),
  dateCreation: timestamp("date_creation", { withTimezone: true }).notNull().defaultNow(),
});

export const utilisateursTable = pgTable("utilisateurs", {
  id: text("id").primaryKey(),
  cabinetId: text("cabinet_id").notNull().references(() => cabinetsTable.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  dateCreation: timestamp("date_creation", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("utilisateurs_cabinet_email_idx").on(table.cabinetId, table.email),
  index("utilisateurs_cabinet_idx").on(table.cabinetId),
]);

export const dossiersClientsTable = pgTable("dossiers_clients", {
  id: text("id").primaryKey(),
  cabinetId: text("cabinet_id").notNull().references(() => cabinetsTable.id, { onDelete: "cascade" }),
  raisonSociale: text("raison_sociale").notNull(),
  ifIce: text("if_ice").notNull(),
  secteur: text("secteur").notNull(),
  banque: text("banque").notNull(),
  actif: integer("actif").notNull().default(1),
  dateCreation: timestamp("date_creation", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dossiers_clients_cabinet_ice_idx").on(table.cabinetId, table.ifIce),
  index("dossiers_clients_cabinet_idx").on(table.cabinetId),
]);

export const importsBancairesTable = pgTable("imports_bancaires", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiersClientsTable.id, { onDelete: "cascade" }),
  fichierSource: text("fichier_source").notNull(),
  cheminStockage: text("chemin_stockage"),
  tailleOctets: integer("taille_octets"),
  typeMime: text("type_mime"),
  periode: text("periode").notNull(),
  dateImport: timestamp("date_import", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("imports_bancaires_dossier_idx").on(table.dossierId, table.dateImport)]);

export const importsComptablesTable = pgTable("imports_comptables", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiersClientsTable.id, { onDelete: "cascade" }),
  fichierSource: text("fichier_source").notNull(),
  cheminStockage: text("chemin_stockage"),
  tailleOctets: integer("taille_octets"),
  typeMime: text("type_mime"),
  periode: text("periode").notNull(),
  dateImport: timestamp("date_import", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("imports_comptables_dossier_idx").on(table.dossierId, table.dateImport)]);

export const transactionsBancairesTable = pgTable("transactions_bancaires", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull().references(() => importsBancairesTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  libelle: text("libelle").notNull(),
  statutMatching: text("statut_matching").notNull().default("unmatched"),
}, (table) => [
  index("transactions_bancaires_import_idx").on(table.importId),
  index("transactions_bancaires_statut_idx").on(table.statutMatching),
]);

export const ecrituresComptablesTable = pgTable("ecritures_comptables", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull().references(() => importsComptablesTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  libelle: text("libelle").notNull(),
  statutMatching: text("statut_matching").notNull().default("unmatched"),
}, (table) => [
  index("ecritures_comptables_import_idx").on(table.importId),
  index("ecritures_comptables_statut_idx").on(table.statutMatching),
]);

export const rapprochementsTable = pgTable("rapprochements", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull().references(() => transactionsBancairesTable.id, { onDelete: "cascade" }),
  ecritureId: text("ecriture_id").notNull().references(() => ecrituresComptablesTable.id, { onDelete: "cascade" }),
  typeMatch: text("type_match").notNull(),
  dateValidation: timestamp("date_validation", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("rapprochements_transaction_idx").on(table.transactionId),
  uniqueIndex("rapprochements_ecriture_idx").on(table.ecritureId),
]);

export const abonnementsTable = pgTable("abonnements", {
  id: text("id").primaryKey(),
  cabinetId: text("cabinet_id").notNull().references(() => cabinetsTable.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("decouverte"),
  statut: text("statut").notNull().default("actif"),
  dateDebut: timestamp("date_debut", { withTimezone: true }).notNull().defaultNow(),
  dateRenouvellement: timestamp("date_renouvellement", { withTimezone: true }),
  nbDossiersActifsFactures: integer("nb_dossiers_actifs_factures").notNull().default(0),
}, (table) => [uniqueIndex("abonnements_cabinet_idx").on(table.cabinetId)]);

export const journauxAccesTable = pgTable("journaux_acces", {
  id: text("id").primaryKey(),
  utilisateurId: text("utilisateur_id").notNull().references(() => utilisateursTable.id, { onDelete: "cascade" }),
  dossierId: text("dossier_id").references(() => dossiersClientsTable.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  adresseIp: text("adresse_ip"),
  dateAcces: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("journaux_acces_utilisateur_idx").on(table.utilisateurId, table.dateAcces),
  index("journaux_acces_dossier_idx").on(table.dossierId, table.dateAcces),
]);

export const invitationsCollaborateursTable = pgTable("invitations_collaborateurs", {
  id: text("id").primaryKey(),
  cabinetId: text("cabinet_id").notNull().references(() => cabinetsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("collaborateur"),
  statut: text("statut").notNull().default("en_attente"),
  tokenHash: text("token_hash").notNull(),
  dateExpiration: timestamp("date_expiration", { withTimezone: true }).notNull(),
  dateCreation: timestamp("date_creation", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("invitations_cabinet_idx").on(table.cabinetId, table.statut),
  uniqueIndex("invitations_token_idx").on(table.tokenHash),
]);

export const insertCabinetSchema = createInsertSchema(cabinetsTable);
export const insertUtilisateurSchema = createInsertSchema(utilisateursTable);
export const insertDossierClientSchema = createInsertSchema(dossiersClientsTable);
export const insertImportBancaireSchema = createInsertSchema(importsBancairesTable);
export const insertImportComptableSchema = createInsertSchema(importsComptablesTable);
export const insertTransactionBancaireSchema = createInsertSchema(transactionsBancairesTable);
export const insertEcritureComptableSchema = createInsertSchema(ecrituresComptablesTable);
export const insertRapprochementSchema = createInsertSchema(rapprochementsTable);
export const insertAbonnementSchema = createInsertSchema(abonnementsTable);
export const insertJournalAccesSchema = createInsertSchema(journauxAccesTable);
export const insertInvitationCollaborateurSchema = createInsertSchema(invitationsCollaborateursTable);

export type Cabinet = z.infer<typeof insertCabinetSchema>;
export type Utilisateur = z.infer<typeof insertUtilisateurSchema>;
export type DossierClient = z.infer<typeof insertDossierClientSchema>;