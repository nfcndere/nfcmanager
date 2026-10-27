# NFC Manager — PWA d’administration du Ngaoundéré FC

Application web progressive (PWA) mobile-first en français (fuseau `Africa/Douala`) permettant de piloter l’intégralité du site officiel **nfcwebsite** (`https://www.ngaounderefc.cm`) depuis un smartphone au bord du terrain ou depuis un ordinateur.

## Fonctionnalités principales

- **Authentification fiable & Diagnostic intégré** :
  - Jetons d’accès (15 min) et de rafraîchissement (7 jours) stockés en cookies `httpOnly` avec rotation transparente.
  - Bandeau d’avertissement 2 minutes avant expiration et reconnexion en 1 geste.
  - Panneau de diagnostic en direct (`/connexion?diag=1` ou dans `/parametres` et `/compte`) testant `/api/health`, `/api/auth/login` et `/api/auth/refresh`.
  - Pages de mot de passe oublié (`/mot-de-passe/oublie`), réinitialisation (`/mot-de-passe/reinitialiser`) et changement de mot de passe (`/compte`).
- **Expérience Mobile & Hors ligne (PWA)** :
  - Cache de lecture persistant dans IndexedDB (TanStack Query + `idb-keyval`).
  - File de mutations hors ligne (IndexedDB) pour les **scores en direct**, les **brouillons d’actualités** et les **notes de suivi Académie**, avec détection des conflits `updatedAt` au retour du réseau.
  - Service Worker (`public/sw.js`) avec précache de la coquille, bandeau de mise à jour contrôlé et notifications Web Push.
- **10 Modules métier complets** :
  1. **Tableau de bord (`/dashboard`)** : KPIs, alertes (matchs programmés dépassés, classement > 48 h, candidatures Académie), accès direct au match en cours.
  2. **Matchs & Mode Direct (`/matchs`)** : CRUD complet, mode **Bord de terrain plein écran** avec steppers `+`/`−` (cibles ≥ 56 px) et boutons d’envoi explicites, suppression annulable pendant 5 s.
  3. **Effectif (`/effectif`)** : CRUD complet (bio, taille, poids, date de naissance, arrivée, capitaine, photo via sélecteur visuel, statistiques JSON).
  4. **Actualités (`/actualites`)** : CRUD + brouillons (`?status=all`), générateur de slug, sélecteur de couverture, lien vidéo et **aperçu fidèle au site public**.
  5. **Médiathèque (`/medias`)** : grille filtrable par type/album/joueur, **envoi direct signé vers Cloudinary** avec compression locale des images (≤ 2000 px) et voie de secours multipart (≤ 4 Mo).
  6. **Classement & Saisons (`/classement`)** : calcul automatique des matchs joués (`V+N+D`), points (`3V+N`) et différence de buts (`BP-BC`), historique des mises à jour et gestion des saisons.
  7. **Sponsors (`/partenaires`)** : CRUD, activation/désactivation et réordonnancement par priorité.
  8. **Académie, Contact & Billetterie (`/inscriptions`)** : boîte de réception filtrable, suivi de recrutement (`NOUVEAU`, `CONTACTE`, `CONVOQUE`, `ADMIS`, `REFUSE`), notes internes, appel / WhatsApp en 1 geste et export CSV.
  9. **Newsletter & E-mails (`/newsletter`)** : liste des abonnés actifs (export CSV), journal des e-mails et envoi/renvoi via Resend.
  10. **Paramètres (`/parametres`) & Utilisateurs/Audit (`/utilisateurs`)** : édition des réglages publics `ClubSetting`, notifications Web Push, gestion des comptes (`ADMIN`/`EDITOR`) avec mot de passe temporaire et journal d’audit paginé.

## Démarrage local

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Copier `.env.example` vers `.env.local` et définir `NFCWEBSITE_API_URL` (par ex. `http://localhost:3001` en local ou `https://www.ngaounderefc.cm`).
3. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

## Tester sur téléphone via le réseau local (Wi-Fi LAN)

1. Identifiez l’adresse IP locale de votre machine (ex. `192.168.1.25`).
2. Lancez `nfcmanager` en écoutant sur toutes les interfaces :
   ```bash
   npx next dev -H 0.0.0.0 -p 3000
   ```
3. Ouvrez `http://192.168.1.25:3000` sur le téléphone connecté au même Wi-Fi.
   - Les cookies de session détectent automatiquement le protocole HTTP local (`isSecureRequest` dans [`lib/auth.ts`](./lib/auth.ts)) et le contrôle CSRF ([`proxy.ts`](./proxy.ts)) accepte l’origine LAN et `Sec-Fetch-Site: same-origin`.

## Vérifications qualité

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Consultez également :
- [Diagnostic d’authentification](./docs/DIAGNOSTIC_AUTH.md)
- [Documentation d’intégration nfcwebsite](./docs/INTEGRATION_NFCWEBSITE.md)
- [Système de design interactif (`/_design`)](./app/%5Fdesign/page.tsx)
