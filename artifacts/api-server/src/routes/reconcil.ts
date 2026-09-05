import { Router, type IRouter } from "express";
import {
  CreateClientBody,
  GetClientParams,
  GetReconciliationParams,
  RunReconciliationBody,
  RunReconciliationParams,
  CreateManualMatchParams,
  CreateManualMatchBody,
  ListReconciliationHistoryParams,
  LoginBody,
  InviteTeamMemberBody,
} from "@workspace/api-zod";
import { clearSessionCookie, requireRole, requireSession, setSessionCookie } from "../lib/auth";

type MatchType = "exact" | "tolerance_date" | "floue" | "manuel";
type Source = "bank" | "accounting";
type Status = "matched" | "unmatched";

type Transaction = {
  id: string;
  date: string;
  amount: number;
  label: string;
  source: Source;
  status: Status;
  matchType: MatchType;
  matchId?: string | null;
};

type Match = {
  id: string;
  bankTransactionId: string;
  accountingEntryId: string;
  type: MatchType;
  confidence: number;
  dateValidated: string;
};

type Reconciliation = {
  clientId: string;
  period: string;
  bankFile: string;
  accountingFile: string;
  bankTransactions: Transaction[];
  accountingEntries: Transaction[];
  matches: Match[];
  toleranceDays: number;
  similarityThreshold: number;
  runStatus: "ready" | "completed";
};

type Client = {
  id: string;
  companyName: string;
  ifIce: string;
  sector: string;
  bank: string;
  lastPeriod: string;
  lastRunAt?: string;
  automationRate: number;
  matchedCount: number;
  exceptionCount: number;
  totalCount: number;
  ownerInitials: string;
};

type Notification = {
  id: string;
  type: "reconciliation" | "import" | "manual" | "system";
  title: string;
  message: string;
  relativeTime: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

const cabinet = {
  id: "cab-001",
  name: "Cabinet Atlas Conseil",
  email: "contact@atlas-conseil.ma",
  plan: "Standard",
  clientCount: 4,
};

const team: Array<{ id: string; name: string; email: string; role: "admin" | "collaborateur"; initials: string; status: "actif" | "invitation" }> = [
  { id: "usr-001", name: "Nadia El Mansouri", email: "nadia@atlas-conseil.ma", role: "admin" as const, initials: "NE", status: "actif" as const },
  { id: "usr-002", name: "Youssef Amrani", email: "youssef@atlas-conseil.ma", role: "collaborateur" as const, initials: "YA", status: "actif" as const },
  { id: "usr-003", name: "Salma Bennani", email: "salma@atlas-conseil.ma", role: "collaborateur" as const, initials: "SB", status: "actif" as const },
];

const clients: Client[] = [
  { id: "client-001", companyName: "Riad & Compagnie SARL", ifIce: "001845672000034", sector: "Hôtellerie & restauration", bank: "Attijariwafa bank", lastPeriod: "Juillet 2026", automationRate: 81, matchedCount: 34, exceptionCount: 8, totalCount: 42, ownerInitials: "YA" },
  { id: "client-002", companyName: "Atlas Distribution", ifIce: "002167890000056", sector: "Négoce", bank: "Banque of Africa", lastPeriod: "Juillet 2026", automationRate: 94, matchedCount: 47, exceptionCount: 3, totalCount: 50, ownerInitials: "NE" },
  { id: "client-003", companyName: "Casablanca Digital", ifIce: "003302145000078", sector: "Services numériques", bank: "CIH Bank", lastPeriod: "Juin 2026", automationRate: 68, matchedCount: 25, exceptionCount: 12, totalCount: 37, ownerInitials: "SB" },
  { id: "client-004", companyName: "Bâtir Maroc", ifIce: "004456781000091", sector: "BTP", bank: "BMCI", lastPeriod: "Juillet 2026", automationRate: 76, matchedCount: 29, exceptionCount: 9, totalCount: 38, ownerInitials: "YA" },
];

const history: Record<string, Array<{ id: string; period: string; completedAt: string; automationRate: number; matchedCount: number; exceptionCount: number; status: "valide" | "brouillon" }>> = {
  "client-001": [
    { id: "hist-001", period: "Juillet 2026", completedAt: "2026-08-05T10:32:00.000Z", automationRate: 81, matchedCount: 34, exceptionCount: 8, status: "valide" },
    { id: "hist-002", period: "Juin 2026", completedAt: "2026-07-06T15:12:00.000Z", automationRate: 78, matchedCount: 31, exceptionCount: 9, status: "valide" },
    { id: "hist-003", period: "Mai 2026", completedAt: "2026-06-05T09:48:00.000Z", automationRate: 74, matchedCount: 28, exceptionCount: 10, status: "valide" },
  ],
  "client-002": [
    { id: "hist-004", period: "Juillet 2026", completedAt: "2026-08-04T14:08:00.000Z", automationRate: 94, matchedCount: 47, exceptionCount: 3, status: "valide" },
  ],
};

const notifications: Notification[] = [
  { id: "notification-001", type: "reconciliation", title: "Rapprochement à valider", message: "Riad & Compagnie SARL compte encore 8 exceptions.", relativeTime: "Il y a 18 min", createdAt: "2026-09-05T12:42:00.000Z", read: false, href: "/clients/client-001" },
  { id: "notification-002", type: "import", title: "Nouveau fichier importé", message: "Le relevé d’Atlas Distribution est prêt à être contrôlé.", relativeTime: "Il y a 2 h", createdAt: "2026-09-05T10:00:00.000Z", read: false, href: "/clients/client-002" },
  { id: "notification-003", type: "manual", title: "Association manuelle enregistrée", message: "2 écarts ont été traités sur Casablanca Digital.", relativeTime: "Hier", createdAt: "2026-09-04T15:10:00.000Z", read: true, href: "/clients/client-003" },
  { id: "notification-004", type: "system", title: "Votre espace est prêt", message: "Les règles de rapprochement sont configurées pour votre cabinet.", relativeTime: "Cette semaine", createdAt: "2026-09-01T09:00:00.000Z", read: true },
];

function daysFrom(date: string, offset: number) {
  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

function buildDemoReconciliation(clientId: string): Reconciliation {
  const bank: Transaction[] = [];
  const accounting: Transaction[] = [];
  const exactLabels = [
    ["Virement client Al Amal", "Virement client Al Amal"],
    ["Prélèvement Maroc Telecom", "Prélèvement Maroc Telecom"],
    ["Règlement fournisseur Afriquia", "Règlement fournisseur Afriquia"],
    ["Frais carte entreprise", "Frais carte entreprise"],
    ["Virement salaire équipe", "Virement salaire équipe"],
    ["Loyer bureau Maarif", "Loyer bureau Maarif"],
    ["COTISATION CNSS", "COTISATION CNSS"],
    ["Eau et électricité Lydec", "Eau et électricité Lydec"],
  ];
  const toleranceLabels = [
    ["Virement client OCP", "Virement client OCP"],
    ["Règlement client Marjane", "Règlement client Marjane"],
    ["Abonnement Orange Pro", "Abonnement Orange Pro"],
    ["Achat fournitures bureau", "Achat fournitures bureau"],
    ["Règlement fournisseur Dislog", "Règlement fournisseur Dislog"],
    ["Commission monétique", "Commission monétique"],
    ["Virement client Norsys", "Virement client Norsys"],
    ["Taxe professionnelle", "Taxe professionnelle"],
  ];
  const fuzzyLabels = [
    ["VIR CLIENT M2M", "VIR CLIENT M2M MA"],
    ["CHEQUE 004582", "CHEQUE N004582"],
    ["RETRAIT GAB 26/07", "RETRAIT GAB 27/07"],
    ["VIR FOURN COSUMAR", "VIR FOURN COSUMAR MA"],
    ["PAIEMENT CB MARJANE", "PAIEMENT CB MARJANE M"],
    ["VIR CLIENT SNECMA", "VIR CLIENT SNECMA MA"],
  ];
  let row = 1;
  const addPair = (date: string, amount: number, bankLabel: string, accountingLabel: string, accountingDate = date) => {
    const bankId = `bank-${String(row).padStart(3, "0")}`;
    const accountingId = `accounting-${String(row).padStart(3, "0")}`;
    bank.push({ id: bankId, date, amount, label: bankLabel, source: "bank", status: "unmatched", matchType: "exact", matchId: null });
    accounting.push({ id: accountingId, date: accountingDate, amount, label: accountingLabel, source: "accounting", status: "unmatched", matchType: "exact", matchId: null });
    row += 1;
  };

  exactLabels.forEach(([bankLabel, accountingLabel], index) => addPair(daysFrom("2026-07-01", index * 3), [12500, 1840.5, 3275, 126, 8900, 7800, 4620, 960][index], bankLabel, accountingLabel));
  toleranceLabels.forEach(([bankLabel, accountingLabel], index) => {
    const date = daysFrom("2026-07-04", index * 3);
    addPair(date, [7400, 2150, 399, 684.2, 5480, 144.75, 9100, 2350][index], bankLabel, accountingLabel, daysFrom(date, index % 2 === 0 ? 2 : -1));
  });
  fuzzyLabels.forEach(([bankLabel, accountingLabel], index) => {
    const date = daysFrom("2026-07-06", index * 4);
    addPair(date, [2500, 3200, 600, 11800, 430, 7600][index], bankLabel, accountingLabel, daysFrom(date, 5));
  });
  for (let index = 0; index < 8; index += 1) {
    const amount = [184.5, 1275, 980, 4200, 715, 3050, 92, 680][index];
    const date = daysFrom("2026-07-02", index * 4 + 1);
    const bankId = `bank-${String(row).padStart(3, "0")}`;
    bank.push({ id: bankId, date, amount, label: ["Paiement CB inconnu", "Retrait espèces", "Virement entrant à identifier", "Frais bancaires exceptionnels", "Chèque remis", "Remboursement à contrôler", "Prélèvement non identifié", "Écart de caisse"][index], source: "bank", status: "unmatched", matchType: "exact", matchId: null });
    row += 1;
    const accountingId = `accounting-${String(row).padStart(3, "0")}`;
    accounting.push({ id: accountingId, date: daysFrom(date, 1), amount: amount + (index % 3 === 0 ? 0.5 : 150), label: "Écriture à vérifier", source: "accounting", status: "unmatched", matchType: "exact", matchId: null });
    row += 1;
  }
  return { clientId, period: "Juillet 2026", bankFile: "releve_attijari_juillet.csv", accountingFile: "export_sage_juillet.xlsx", bankTransactions: bank, accountingEntries: accounting, matches: [], toleranceDays: 2, similarityThreshold: 0.75, runStatus: "ready" };
}

const reconciliations = new Map<string, Reconciliation>();
for (const client of clients) reconciliations.set(client.id, buildDemoReconciliation(client.id));

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function similarity(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = saved;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

function dateDistance(left: string, right: string) {
  return Math.abs((new Date(`${left}T12:00:00Z`).getTime() - new Date(`${right}T12:00:00Z`).getTime()) / 86400000);
}

function runEngine(source: Reconciliation, toleranceDays: number, similarityThreshold: number) {
  const reconciliation = structuredClone(source);
  reconciliation.matches = [];
  reconciliation.toleranceDays = toleranceDays;
  reconciliation.similarityThreshold = similarityThreshold;
  reconciliation.bankTransactions.forEach((transaction) => { transaction.status = "unmatched"; transaction.matchId = null; });
  reconciliation.accountingEntries.forEach((entry) => { entry.status = "unmatched"; entry.matchId = null; });
  const usedAccounting = new Set<string>();
  const passes: Array<{ type: MatchType; predicate: (bank: Transaction, entry: Transaction) => boolean; confidence: (bank: Transaction, entry: Transaction) => number }> = [
    { type: "exact", predicate: (bank, entry) => bank.amount === entry.amount && bank.date === entry.date, confidence: () => 1 },
    { type: "tolerance_date", predicate: (bank, entry) => bank.amount === entry.amount && dateDistance(bank.date, entry.date) <= toleranceDays, confidence: (bank, entry) => Math.max(0.82, 1 - dateDistance(bank.date, entry.date) * 0.06) },
    { type: "floue", predicate: (bank, entry) => bank.amount === entry.amount && similarity(bank.label, entry.label) >= similarityThreshold, confidence: (bank, entry) => similarity(bank.label, entry.label) },
  ];
  for (const pass of passes) {
    for (const bank of reconciliation.bankTransactions.filter((transaction) => transaction.status === "unmatched")) {
      const entry = reconciliation.accountingEntries.find((candidate) => candidate.status === "unmatched" && !usedAccounting.has(candidate.id) && pass.predicate(bank, candidate));
      if (!entry) continue;
      const matchId = `match-${reconciliation.matches.length + 1}`;
      bank.status = "matched"; bank.matchType = pass.type; bank.matchId = matchId;
      entry.status = "matched"; entry.matchType = pass.type; entry.matchId = matchId;
      usedAccounting.add(entry.id);
      reconciliation.matches.push({ id: matchId, bankTransactionId: bank.id, accountingEntryId: entry.id, type: pass.type, confidence: Math.round(pass.confidence(bank, entry) * 100) / 100, dateValidated: new Date().toISOString() });
    }
  }
  reconciliation.runStatus = "completed";
  return reconciliation;
}

const seededReconciliation = reconciliations.get("client-001");
if (seededReconciliation) {
  const completed = runEngine(seededReconciliation, 2, 0.75);
  reconciliations.set("client-001", completed);
}

function clientView(client: Client, reconciliation: Reconciliation): Client {
  const matchedCount = reconciliation.matches.length;
  const totalCount = reconciliation.bankTransactions.length;
  return { ...client, lastRunAt: new Date().toISOString(), automationRate: Math.round((matchedCount / totalCount) * 100), matchedCount, exceptionCount: totalCount - matchedCount, totalCount };
}

function sessionFor(email: string) {
  const user = team.find((member) => member.email === email) ?? team[0];
  return { user, cabinet: { ...cabinet, clientCount: clients.length } };
}

function canAccessClient(req: { reconcilSession?: { role: string; userId: string } }, client: Client) {
  if (req.reconcilSession?.role !== "collaborateur") return true;
  const member = team.find((item) => item.id === req.reconcilSession?.userId);
  return member?.initials === client.ownerInitials;
}

function getAccessibleClient(req: { reconcilSession?: { role: string; userId: string } }, clientId: string) {
  const client = clients.find((item) => item.id === clientId);
  return client && canAccessClient(req, client) ? client : undefined;
}

const router: IRouter = Router();

router.post("/auth/login", (req, res) => {
  const input = LoginBody.parse(req.body);
  if (!input.email || !input.password) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }
  const session = sessionFor(input.email);
  setSessionCookie(res, {
    userId: session.user.id,
    email: session.user.email,
    cabinetId: cabinet.id,
    role: session.user.role,
  });
  return res.json(session);
});

router.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  return res.status(204).send();
});

router.get("/me", (req, res) => {
  const session = req.reconcilSession;
  if (session) {
    const user = team.find((member) => member.id === session.userId) ?? team[0];
    return res.json({ user, cabinet: { ...cabinet, clientCount: clients.length } });
  }
  const demo = sessionFor("nadia@atlas-conseil.ma");
  if (process.env.RECONCIL_REQUIRE_AUTH === "true") return res.status(401).json({ error: "Authentification requise" });
  setSessionCookie(res, { userId: demo.user.id, email: demo.user.email, cabinetId: cabinet.id, role: demo.user.role });
  return res.json(demo);
});

router.use(requireSession);

router.get("/dashboard/summary", (_req, res) => {
  const rates = clients.map((client) => client.automationRate);
  res.json({
    totalClients: clients.length,
    reconciledThisMonth: 3,
    pendingExceptions: clients.reduce((sum, client) => sum + client.exceptionCount, 0),
    averageAutomationRate: Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length),
    recentActivity: [
      { id: "activity-1", type: "reconciliation", text: "Rapprochement validé", clientName: "Riad & Compagnie SARL", relativeTime: "Il y a 18 min", initials: "RC" },
      { id: "activity-2", type: "import", text: "Nouveau relevé importé", clientName: "Atlas Distribution", relativeTime: "Il y a 2 h", initials: "AD" },
      { id: "activity-3", type: "manual", text: "2 écarts traités manuellement", clientName: "Casablanca Digital", relativeTime: "Hier", initials: "CD" },
    ],
  });
});

router.get("/notifications", (_req, res) => {
  return res.json(notifications);
});

router.post("/notifications/:notificationId/read", (req, res) => {
  const notification = notifications.find((item) => item.id === req.params.notificationId);
  if (!notification) return res.status(404).json({ error: "Notification introuvable" });
  notification.read = true;
  return res.json(notification);
});

router.post("/notifications/read-all", (_req, res) => {
  notifications.forEach((notification) => { notification.read = true; });
  return res.json({ updatedCount: notifications.length });
});

router.get("/clients", (req, res) => {
  const visibleClients = req.reconcilSession?.role === "collaborateur"
    ? clients.filter((client) => client.ownerInitials === team.find((member) => member.id === req.reconcilSession?.userId)?.initials)
    : clients;
  return res.json(visibleClients.map((client) => clientView(client, reconciliations.get(client.id)!)));
});
router.post("/clients", requireRole("admin", "superadmin"), (req, res) => {
  const input = CreateClientBody.parse(req.body);
  const client: Client = { id: `client-${String(clients.length + 1).padStart(3, "0")}`, companyName: input.companyName, ifIce: input.ifIce, sector: input.sector, bank: input.bank, lastPeriod: "—", automationRate: 0, matchedCount: 0, exceptionCount: 0, totalCount: 0, ownerInitials: "NE" };
  clients.push(client);
  reconciliations.set(client.id, { clientId: client.id, period: "—", bankFile: "Aucun relevé importé", accountingFile: "Aucun export comptable", bankTransactions: [], accountingEntries: [], matches: [], toleranceDays: 2, similarityThreshold: 0.75, runStatus: "ready" });
  res.status(201).json(client);
});

router.get("/clients/:clientId", (req, res) => {
  const { clientId } = GetClientParams.parse(req.params);
  const client = getAccessibleClient(req, clientId);
  if (!client) return res.status(404).json({ error: "Dossier introuvable" });
  return res.json(clientView(client, reconciliations.get(client.id)!));
});

router.get("/clients/:clientId/reconciliation", (req, res) => {
  const { clientId } = GetReconciliationParams.parse(req.params);
  if (!getAccessibleClient(req, clientId)) return res.status(404).json({ error: "Dossier introuvable" });
  const reconciliation = reconciliations.get(clientId);
  if (!reconciliation) return res.status(404).json({ error: "Rapprochement introuvable" });
  return res.json(reconciliation);
});

router.post("/clients/:clientId/reconciliation/run", (req, res) => {
  const { clientId } = RunReconciliationParams.parse(req.params);
  const input = RunReconciliationBody.parse(req.body);
  if (!getAccessibleClient(req, clientId)) return res.status(404).json({ error: "Dossier introuvable" });
  const current = reconciliations.get(clientId);
  if (!current) return res.status(404).json({ error: "Rapprochement introuvable" });
  const result = runEngine(current, input.toleranceDays, input.similarityThreshold);
  reconciliations.set(clientId, result);
  const client = clients.find((item) => item.id === clientId);
  if (client) Object.assign(client, clientView(client, result));
  return res.json(result);
});

router.post("/clients/:clientId/reconciliation/manual", (req, res) => {
  const { clientId } = CreateManualMatchParams.parse(req.params);
  const input = CreateManualMatchBody.parse(req.body);
  if (!getAccessibleClient(req, clientId)) return res.status(404).json({ error: "Dossier introuvable" });
  const reconciliation = reconciliations.get(clientId);
  if (!reconciliation) return res.status(404).json({ error: "Rapprochement introuvable" });
  const bank = reconciliation.bankTransactions.find((transaction) => transaction.id === input.bankTransactionId);
  const entry = reconciliation.accountingEntries.find((transaction) => transaction.id === input.accountingEntryId);
  if (!bank || !entry || bank.status === "matched" || entry.status === "matched") return res.status(400).json({ error: "Ces lignes ne peuvent pas être associées" });
  const matchId = `match-${reconciliation.matches.length + 1}`;
  bank.status = "matched"; bank.matchType = "manuel"; bank.matchId = matchId;
  entry.status = "matched"; entry.matchType = "manuel"; entry.matchId = matchId;
  reconciliation.matches.push({ id: matchId, bankTransactionId: bank.id, accountingEntryId: entry.id, type: "manuel", confidence: 1, dateValidated: new Date().toISOString() });
  const client = clients.find((item) => item.id === clientId);
  if (client) Object.assign(client, clientView(client, reconciliation));
  return res.json(reconciliation);
});

router.delete("/clients/:clientId/reconciliation/matches/:matchId", (req, res) => {
  const { clientId } = GetReconciliationParams.parse(req.params);
  const matchId = String(req.params.matchId);
  if (!getAccessibleClient(req, clientId)) return res.status(404).json({ error: "Dossier introuvable" });
  const reconciliation = reconciliations.get(clientId);
  if (!reconciliation) return res.status(404).json({ error: "Rapprochement introuvable" });
  const matchIndex = reconciliation.matches.findIndex((match) => match.id === matchId);
  if (matchIndex === -1) return res.status(404).json({ error: "Association introuvable" });
  const [match] = reconciliation.matches.splice(matchIndex, 1);
  const bank = reconciliation.bankTransactions.find((transaction) => transaction.id === match.bankTransactionId);
  const entry = reconciliation.accountingEntries.find((transaction) => transaction.id === match.accountingEntryId);
  if (bank) { bank.status = "unmatched"; bank.matchId = null; bank.matchType = "exact"; }
  if (entry) { entry.status = "unmatched"; entry.matchId = null; entry.matchType = "exact"; }
  const client = clients.find((item) => item.id === clientId);
  if (client) Object.assign(client, clientView(client, reconciliation));
  return res.json(reconciliation);
});

router.get("/clients/:clientId/history", (req, res) => {
  const { clientId } = ListReconciliationHistoryParams.parse(req.params);
  if (!getAccessibleClient(req, clientId)) return res.status(404).json({ error: "Dossier introuvable" });
  return res.json(history[clientId] ?? []);
});

router.get("/team", (_req, res) => res.json(team));
router.post("/team", requireRole("admin", "superadmin"), (req, res) => {
  const input = InviteTeamMemberBody.parse(req.body);
  const member = { id: `usr-${String(team.length + 1).padStart(3, "0")}`, ...input, initials: input.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), status: "invitation" as const };
  team.push(member);
  res.status(201).json(member);
});

router.get("/subscription", (_req, res) => {
  const activeClientCount = clients.length;
  const pricePerClient = cabinet.plan === "Standard" ? 40 : 0;
  res.json({
    current: { plan: cabinet.plan.toLowerCase(), activeClientCount, estimatedMonthlyAmountMad: activeClientCount * pricePerClient },
    plans: [
      { id: "decouverte", name: "Découverte", price: "Gratuit", description: "Pour découvrir Reconcil sur vos premiers dossiers.", features: ["1 dossier client", "Rapprochement automatique", "Export des résultats"], highlighted: false },
      { id: "standard", name: "Standard", price: "30–50 MAD / dossier", description: "Pour les cabinets qui veulent gagner du temps chaque mois.", features: ["Dossiers illimités", "3 passes de matching", "Historique & validation", "Support prioritaire"], highlighted: true },
      { id: "cabinet", name: "Cabinet", price: "Sur devis", description: "Un tarif dégressif adapté à votre portefeuille.", features: ["Volume de dossiers", "Gestion multi-collaborateurs", "Accompagnement au démarrage"], highlighted: false },
    ],
  });
});

export default router;