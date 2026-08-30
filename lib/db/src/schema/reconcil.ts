import { date, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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
  cabinetId: text("cabinet_id").notNull(),
  nom: text("nom").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
});

export const dossiersClientsTable = pgTable("dossiers_clients", {
  id: text("id").primaryKey(),
  cabinetId: text("cabinet_id").notNull(),
  raisonSociale: text("raison_sociale").notNull(),
  ifIce: text("if_ice").notNull(),
  secteur: text("secteur").notNull(),
  banque: text("banque").notNull(),
});

export const importsBancairesTable = pgTable("imports_bancaires", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull(),
  fichierSource: text("fichier_source").notNull(),
  periode: text("periode").notNull(),
  dateImport: timestamp("date_import", { withTimezone: true }).notNull().defaultNow(),
});

export const importsComptablesTable = pgTable("imports_comptables", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull(),
  fichierSource: text("fichier_source").notNull(),
  periode: text("periode").notNull(),
  dateImport: timestamp("date_import", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionsBancairesTable = pgTable("transactions_bancaires", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  libelle: text("libelle").notNull(),
  statutMatching: text("statut_matching").notNull().default("unmatched"),
});

export const ecrituresComptablesTable = pgTable("ecritures_comptables", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  libelle: text("libelle").notNull(),
  statutMatching: text("statut_matching").notNull().default("unmatched"),
});

export const rapprochementsTable = pgTable("rapprochements", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull(),
  ecritureId: text("ecriture_id").notNull(),
  typeMatch: text("type_match").notNull(),
  dateValidation: timestamp("date_validation", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCabinetSchema = createInsertSchema(cabinetsTable);
export const insertUtilisateurSchema = createInsertSchema(utilisateursTable);
export const insertDossierClientSchema = createInsertSchema(dossiersClientsTable);
export const insertImportBancaireSchema = createInsertSchema(importsBancairesTable);
export const insertImportComptableSchema = createInsertSchema(importsComptablesTable);
export const insertTransactionBancaireSchema = createInsertSchema(transactionsBancairesTable);
export const insertEcritureComptableSchema = createInsertSchema(ecrituresComptablesTable);
export const insertRapprochementSchema = createInsertSchema(rapprochementsTable);

export type Cabinet = z.infer<typeof insertCabinetSchema>;
export type Utilisateur = z.infer<typeof insertUtilisateurSchema>;
export type DossierClient = z.infer<typeof insertDossierClientSchema>;