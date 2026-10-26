# NFC Admin

Interface d'administration en français pour le Ngaoundéré FC. L'application
est autonome et transmet les demandes de données à l'API du site public
nfcwebsite; elle ne se connecte pas directement à sa base de données.

## Démarrage

1. Installer les dépendances du projet.
2. (Facultatif) Copier `.env.example` vers `.env.local` pour configurer
   `NFCWEBSITE_API_URL`. Sans cette variable, l'application utilise le domaine
   officiel `https://ngaounderefc.cm`.
3. Lancer `npm run dev`, puis ouvrir `http://localhost:3000`.

En production, `NFCWEBSITE_API_URL` doit utiliser HTTPS. La connexion réutilise
le compte du site public; seuls les rôles `ADMIN` et `EDITOR` sont acceptés.
Le jeton d'accès est conservé dans un cookie `httpOnly` et expire après
15 minutes, après quoi une nouvelle connexion est nécessaire.

## Modules

- Connexion et déconnexion.
- Tableau de bord, matchs, effectif, actualités et classement NFC.
- PWA installable, avec page de secours hors connexion.

Les fonctions sont limitées aux endpoints actuellement exposés par le site.
Les actualités brouillons ne peuvent pas être listées et le classement est en
lecture seule. Voir [l'inventaire des endpoints](./docs/INVENTAIRE_NFCWEBSITE.md)
et [les limites d'intégration](./docs/INTEGRATION_NFCWEBSITE.md).

## Vérifications

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
# nfcmanager
# nfcmanager
