# Intégration NFC Manager / nfcwebsite

## Architecture & Principe

**nfcmanager** consomme exclusivement l’API de `nfcwebsite` via la variable d’environnement `NFCWEBSITE_API_URL` (par défaut `https://www.ngaounderefc.cm`).
- **Aucun accès direct à PostgreSQL** ni schéma Prisma local dans `nfcmanager`.
- **Proxy serveur sécurisé** ([`app/api/site/[...path]/route.ts`](../app/api/site/%5B...path%5D/route.ts)) avec liste blanche stricte ([`lib/proxy-routes.ts`](../lib/proxy-routes.ts)), contrôle d’origine CSRF ([`proxy.ts`](../proxy.ts)) compatible reverse proxy (`X-Forwarded-Host`, `X-Forwarded-Proto`) et PWA (`Sec-Fetch-Site: same-origin`), et jetons en cookies `httpOnly` (`nfc_site_token` 15 min + `nfc_site_refresh` 7 jours).
- **Rotation transparente du jeton** : lorsque `nfc_site_token` expire ou qu’un appel API renvoie `401`, le proxy et le client tentent automatiquement `POST /api/auth/refresh` sur `nfcwebsite` avant de rejouer la requête.

---

## Endpoints `nfcwebsite` consommés par module

| Module NFC Manager | Endpoint `nfcwebsite` | Méthodes | Rôle requis | Notes |
|---|---|---|---|---|
| Diagnostic & Santé | `/api/health` | `GET` | Public | Vérifie la base et la présence des secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`). |
| Authentification | `/api/auth/login` | `POST` | Public | Envoie `{ email, password, scope: 'admin' }`. Refuse `USER` (403). |
| Rafraîchissement | `/api/auth/refresh` | `POST` | Public (Refresh token) | Rotation du couple `{ token, refreshToken }`. |
| Profil session | `/api/auth/me` | `GET` | Authentifié | Mis en cache mémoire 60s côté serveur (`lib/auth.ts`). |
| Mot de passe | `/api/auth/password`, `/api/auth/forgot`, `/api/auth/reset` | `POST` | Authentifié / Public | Changement connecté et réinitialisation par e-mail Resend. |
| Tableau de bord | `/api/matches`, `/api/players`, `/api/articles?status=all`, `/api/forms?processed=false`, `/api/standings` | `GET` | `EDITOR` / `ADMIN` | Supporte le mode hors ligne et l’état `partial` via `DataState`. |
| Matchs & Direct | `/api/matches`, `/api/matches/[id]` | `GET`, `POST`, `PATCH`, `DELETE` | `EDITOR` / `ADMIN` | Suppression logique (`deletedAt`) annulable pendant 5s via `PATCH { restore: true }`. File hors ligne pour les scores en direct. |
| Effectif | `/api/players`, `/api/players/[id]` | `GET`, `POST`, `PATCH`, `DELETE` | `EDITOR` / `ADMIN` | Inclut `bio`, `birthDate`, `height`, `weight`, `joinedYear`, `isCaptain`, `photoId` et `stats` JSON. |
| Actualités | `/api/articles?status=all`, `/api/articles/[id]` | `GET`, `POST`, `PATCH`, `DELETE` | `EDITOR` / `ADMIN` | Inclut les brouillons (`status=all`), `coverId`, `videoUrl` et aperçu fidèle au site public. |
| Médias & Upload | `/api/galerie`, `/api/galerie/[id]`, `/api/uploads/sign`, `/api/uploads` | `GET`, `POST`, `PATCH`, `DELETE` | `EDITOR` / `ADMIN` | Envoi direct signé vers Cloudinary (sans exposer `CLOUDINARY_API_SECRET`) après compression locale ≤ 2000 px, ou relais `/api/uploads` (≤ 4 Mo). |
| Classement & Saisons | `/api/standings`, `/api/standings/history`, `/api/seasons`, `/api/seasons/[id]` | `GET`, `PUT`, `POST`, `PATCH` | `EDITOR` / `ADMIN` | Calcul automatique de `played = won + drawn + lost`, `points = 3*won + drawn` et `goalDifference = goalsFor - goalsAgainst`. |
| Sponsors | `/api/partners?all=1`, `/api/partners/[id]` | `GET`, `POST`, `PATCH`, `DELETE` | `EDITOR` / `ADMIN` | Réordonnancement par priorité et activation/désactivation (`active`). |
| Académie, Contact, Billetterie | `/api/forms`, `/api/forms/[id]` | `GET`, `PATCH`, `DELETE` | `EDITOR` / `ADMIN` | Suivi `followUpStatus` (`NOUVEAU`, `CONTACTE`, `CONVOQUE`, `ADMIS`, `REFUSE`), `adminNotes` (file hors ligne), appel/WhatsApp en 1 geste, export CSV. |
| Newsletter & E-mails | `/api/newsletter`, `/api/emails` | `GET`, `POST` | `EDITOR` / `ADMIN` | Liste des abonnés actifs, journal des e-mails et envoi/renvoi via Resend. |
| Paramètres & Push | `/api/settings`, `/api/push/subscribe` | `GET`, `PUT`, `POST`, `DELETE` | `ADMIN` (`EDITOR` pour Push) | Gère les 7 clés `ClubSetting` publiques et l’abonnement Web Push VAPID. |
| Utilisateurs & Audit | `/api/users`, `/api/users/[id]`, `/api/audit` | `GET`, `POST`, `PATCH`, `DELETE` | `ADMIN` | Création avec mot de passe temporaire affiché une fois, changement de rôle, désactivation et journal d’audit paginé. |

---

## Gestion des services tiers optionnels sur `nfcwebsite`

Si certaines variables d’environnement optionnelles ne sont pas encore renseignées sur l’hébergement Vercel de `nfcwebsite` :
- **`RESEND_API_KEY` absent** : l’envoi d’e-mails (`/api/emails`, `/api/auth/forgot`) renvoie `503` ou journalise l’absence de clé sans faire planter l’application ; l’interface affiche un message explicite.
- **`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` absents** : `GET /api/push/subscribe` renvoie `{ enabled: false, publicKey: null }` et l’écran Paramètres indique que le Web Push est en attente de configuration VAPID.
- **Route non déployée (404 / 405)** : le client API (`lib/api/client.ts`) classe la réponse en `unavailable_feature` et le composant `DataState` affiche un bandeau non technique « Fonction pas encore disponible côté site ».
