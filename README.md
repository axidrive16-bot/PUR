# PUR

PUR est un SaaS Next.js pour analyser la conformité d'actions/ETF selon une méthodologie AAOIFI, suivre un portefeuille, estimer la purification des dividendes et gérer un abonnement Premium.

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth + tables applicatives
- Stripe Checkout + Customer Portal
- Financial Modeling Prep pour les données marché/fondamentales
- SWR pour le cache client
- Zustand pour l'état local

## Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL canonique utilisée pour les retours Stripe. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon publique Supabase utilisée par le client historique. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publishable utilisée par les helpers `@supabase/ssr`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur pour valider les tokens et lire/écrire les abonnements/quotas. |
| `FMP_API_KEY` | Clé Financial Modeling Prep. Sans clé, l'app bascule en données de démonstration. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe. |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe côté serveur. |
| `STRIPE_PRICE_ID` | Price ID Stripe de l'abonnement Premium mensuel. |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook Stripe. |

## Quotas et Premium

Les analyses d'actions passent par `/api/stock/[ticker]`. En mode production FMP, cette route vérifie le token Supabase et consomme un quota journalier côté serveur avant d'appeler le fournisseur de données. Les utilisateurs Premium (`active` ou `trialing`, avec période valide si présente) reçoivent un quota illimité applicatif.

## Stripe

- `/api/stripe/checkout` crée une session Checkout avec 14 jours d'essai.
- `/api/stripe/webhook` synchronise les statuts d'abonnement dans Supabase.
- `/api/stripe/portal` crée une session Customer Portal pour gérer ou annuler l'abonnement.

## Commandes

```bash
npm run dev      # développement
npm run build    # build production
npm run start    # serveur production local
npm run lint              # lint ESLint
npm run check:connections # vérifie Supabase/FMP avec les variables locales
npx tsc --noEmit          # vérification TypeScript
```
