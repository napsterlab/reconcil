# Reconcil

Reconcil est une démo SaaS en français qui aide les cabinets comptables marocains à rapprocher leurs relevés bancaires et écritures comptables en quelques minutes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/reconcil/src/App.tsx` — parcours cabinet, dossiers, import/aperçu, rapprochement et écrans secondaires
- `artifacts/reconcil/src/index.css` — thème visuel Reconcil et responsive layout
- `artifacts/api-server/src/routes/reconcil.ts` — API de démonstration, données seed et moteur de matching
- `lib/api-spec/openapi.yaml` — contrat source des endpoints et schémas
- `lib/db/src/schema/reconcil.ts` — schéma PostgreSQL métier

## Architecture decisions

- Le parcours de démo démarre avec un dossier préchargé et laisse les fichiers réels remplacer les fichiers d’exemple.
- Le matching est séquentiel : exact, tolérance de date, puis similarité de libellé ; les réglages sont envoyés par l’interface.
- Les fichiers d’exemple sont statiques et téléchargeables afin de réduire la friction lors d’une démo live.

## Product

- Connexion de démonstration, vue cabinet et suivi des exceptions
- Gestion de dossiers clients et d’une équipe de collaborateurs
- Upload CSV/PDF/XLSX avec aperçu CSV, rapprochement automatique et association manuelle
- Historique des contrôles et écran d’abonnement statique

## User preferences

L’interface demandée est entièrement en français, sobre, professionnelle et orientée métier comptable.

## Gotchas

- Pour lancer un build Vite hors workflow, fournir `PORT` et `BASE_PATH` (ex. `PORT=4173 BASE_PATH=/`).
- Après une modification d’OpenAPI, relancer `pnpm --filter @workspace/api-spec run codegen`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
