# Intégration NFC Admin / nfcwebsite

## Règle d'intégration actuelle

NFC Admin consomme les endpoints du dépôt `../nfcwebsite` via
`NFCWEBSITE_API_URL`. Il n'utilise pas la base PostgreSQL directement, n'a pas
de schéma Prisma propre et ne contient aucune migration. Le token d'accès créé
par `POST /api/auth/login` est stocké dans un cookie `httpOnly`, puis transmis
à nfcwebsite en `Authorization: Bearer …` pour chaque requête protégée.

La configuration demandée `https://ngaounderefc.cm` est normalisée vers
`https://www.ngaounderefc.cm`, l'hôte canonique du site, afin d'éviter que la
redirection permanente du domaine nu fasse échouer les requêtes authentifiées.
Cette URL canonique est également la valeur par défaut si
`NFCWEBSITE_API_URL` n'est pas définie dans l'environnement de déploiement.

Les routes disponibles et les formats validés se trouvent dans
[INVENTAIRE_NFCWEBSITE.md](./INVENTAIRE_NFCWEBSITE.md). Les endpoints qui
n'existent pas dans le site ne sont pas simulés ici.

## Routes effectivement utilisées

| Fonction NFC Admin | Endpoint nfcwebsite | Restriction constatée |
|---|---|---|
| Connexion | `POST /api/auth/login` | Renvoie un access token (15 min), un refresh token et le profil. NFC Admin n'accepte que `ADMIN` et `EDITOR`. |
| Vérification de session | `GET /api/auth/me` | Bearer token; renvoie 401 si session invalide. |
| Tableau de bord | `GET /api/matches`, `GET /api/players`, `GET /api/articles`, `GET /api/forms`, `GET /api/standings`, `GET /api/club-overview` | `GET /api/forms` exige `requireEditor`; les autres GET sont publics. L'API articles ne retourne que les articles publiés. |
| Matchs | `GET/POST /api/matches`, `GET/PATCH/DELETE /api/matches/[id]` | Les écritures exigent `requireEditor`; `DELETE` supprime définitivement. |
| Joueurs | `GET/POST /api/players`, `GET/PATCH/DELETE /api/players/[id]` | Les écritures exigent `requireEditor`; `DELETE` supprime définitivement. |
| Actualités | `GET/POST /api/articles`, `GET/PATCH/DELETE /api/articles/[id]` | POST/PATCH/DELETE exigent `requireEditor`; GET ne liste que `published: true`; DELETE est définitif. |
| Classement du NFC | `GET /api/standings` | Lecture seule. La route calcule les points et la différence de buts à partir de `ClubStanding`. |

## Limites qui restent côté site public

- `POST /api/auth/login` renvoie access et refresh tokens dans le JSON mais
  aucune route de renouvellement de jeton n'a été trouvée. Le cookie NFC Admin
  reprend le token d'accès; il expire après 15 minutes et l'utilisateur doit
  se reconnecter.
- Le login du site accepte aussi un compte `USER`; NFC Admin refuse ce rôle
  après authentification. Il faut que le site refuse lui-même `USER` si la
  politique doit être partagée entre toutes les interfaces.
- `GET /api/articles` renvoie uniquement les articles publiés. Il n'existe pas
  d'endpoint de liste admin pour les brouillons et les articles planifiés.
- `GET /api/standings` est en lecture seule. Aucune route ne modifie ou
  n'historise `ClubStanding`.
- Pas d'endpoint trouvé pour changement/réinitialisation de mot de passe,
  gestion d'utilisateurs, audit, réglages du club, médias/Cloudinary dans
  l'application admin, ou campagnes Resend.
- Les DELETE de `articles`, `matches` et `players` font un `prisma.*.delete`
  définitif. Aucun `deletedAt` n'est exposé dans les modèles actuels.
- `requireEditor` du site répond actuellement 401 si l'utilisateur est absent
  ou non autorisé; il ne distingue pas l'utilisateur connecté sans rôle
  suffisant (403).
- Vérification de disponibilité du 26 octobre 2026 : `GET /api/matches`,
  `/api/players` et `/api/articles` répondent correctement (listes vides).
  `/api/standings` et `/api/club-overview` répondent HTTP 500 depuis le site
  public. Ces erreurs serveur empêchent temporairement le chargement de ces
  données dans l'administration; elles doivent être corrigées dans nfcwebsite.

Si ces opérations sont nécessaires, ajouter et tester les endpoints dans
nfcwebsite d'abord. Ne pas les remplacer par des appels directs à la base ou
par des handlers locaux d'administration.

## Variables

`.env.example` de NFC Admin ne contient que `NFCWEBSITE_API_URL`. En production,
utiliser HTTPS. Aucun secret ou identifiant
Cloudinary/Resend n'est copié depuis le site.

Le schéma public audité et son `.env.example` indiquent PostgreSQL; l'écart
MySQL/PostgreSQL mentionné dans le brief n'a pas été observé dans la copie
actuelle. Les clés Cloudinary historiques signalées par le brief doivent être
régénérées par les responsables du site.
