# Inventaire vérifié de nfcwebsite

Audit effectué en lecture seule le 24 octobre 2026 dans `/home/blerio/nfcwebsite`.
Cet inventaire décrit le code présent, qui prime sur les hypothèses du brief.

## Schéma Prisma et données métier

Source : `prisma/schema.prisma`.

- `User`: `id`, `name`, `email` (unique), `passwordHash`, `role` (`UserRole`, défaut `USER`), `createdAt`, `updatedAt`. Relations `articles`, `uploadedMedia`, `updatedClubStandings`.
- `UserRole`: `ADMIN`, `EDITOR`, `USER`.
- `Season`: `id`, `label` (unique), `startsAt`, `endsAt`, `isCurrent` (défaut `false`), relation facultative un-à-un `clubStanding`, `createdAt`, `updatedAt`.
- `ClubStanding`: `id`, `seasonId` (unique), `rank`, `played`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst`, `form` facultatif, `updatedById` facultatif, `updatedAt`; relations vers `Season` (cascade) et `User` (SetNull).
- `ClubSetting`: `key` (clé primaire), `value`, `updatedAt`.
- `ApiRateLimitBucket`: `key`, `count`, `expiresAt`, index sur `expiresAt`.
- `Media`: `id`, `provider`, `publicId` (unique), `url`, `mimeType`, `width`, `height`, `size`, `variants`, `altText`, `album`, `title`, `mediaType`, `playerId`, `uploadedById`, `createdAt`. Relations vers `Player`, `User`, `Article`.
- `Article`: `id`, `slug` (unique), `title`, `summary`, `content`, `coverId`, `authorId`, `category`, `videoUrl`, `published` (défaut `false`), `publishedAt`, `createdAt`, `updatedAt`.
- `Player`: `id`, `firstName`, `lastName`, `number`, `position`, `nationality`, `bio`, `photoId`, `stats` (JSON), `isCaptain`, `birthDate` (chaîne), `height`, `weight`, `joinedYear`, `createdAt`, `updatedAt`.
- `Match`: `id`, `date`, `homeTeam`, `awayTeam`, `homeScore`, `awayScore`, `stadium`, `competition`, `status` (chaîne, défaut `PROGRAMME`), `summary`, `events` (JSON), `createdAt`, `updatedAt`.
- `Sponsor`: `id`, `name`, `link`, `logoId`, `priority` (défaut `0`), `createdAt`, `updatedAt`. Aucun champ actif/inactif.
- `FormSubmission`: `id`, `type` (chaîne), `payload` (JSON), `ip`, `userAgent`, `processed` (défaut `false`), `createdAt`.
- `NewsletterSubscriber`: `id`, `email` (unique), `ip`, `active` (défaut `true`), `createdAt`.
- `EmailLog`: `id`, `to`, `from`, `subject`, `body`, `provider`, `providerId`, `status`, `createdAt`.

Le schéma déjà présent dans le site contient donc `Season`, `ClubStanding`,
`ClubSetting` et `ApiRateLimitBucket`. `ClubStandingHistory`, `AuditLog`,
`PushSubscription` et les champs `deletedAt` n'y figurent pas. La seule
énumération métier Prisma repérée est `UserRole`; les valeurs des autres champs
de statut sont portées par les validations TypeScript.

## Routes API observées

Les chemins ci-dessous sont relatifs à `src/app/api/`. Les réponses standard
passent souvent par `resourceResponse` (`src/lib/api-response.ts`) ou
`apiError`; les créations renvoient généralement un objet `{ status: "ok",
data, updatedAt }` avec HTTP 201.

| Route | Méthodes observées | Authentification / contrat constaté |
|---|---|---|
| `auth/login/route.ts` | POST | Sans garde de rôle. Valide email et mot de passe; compare `passwordHash` en bcrypt; retourne les jetons access/refresh dans le JSON et les données publiques du profil. |
| `auth/me/route.ts` | GET | Bearer token via `getUserFromRequest`; 401 si session absente/invalide. |
| `matches/route.ts` | GET, POST | GET public, filtres `status`, `page`, `pageSize`; POST `requireEditor`. |
| `matches/[id]/route.ts` | GET, PATCH, DELETE | GET public; PATCH et DELETE `requireEditor`. |
| `standings/route.ts` | GET | Public; lit la saison courante et son `ClubStanding`, renvoie `{season, nfc}`. `nfc` inclut `id`, `seasonId`, `rank`, `position`, `teamName`, `played`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst`, `goalDifference`, `points`, `form`, `updatedAt`. Renvoie `nfc: null` si aucune ligne courante. |
| `articles/route.ts` | GET, POST | GET public et filtre `published: true`; filtres `category`, `slug`, `limit`, relations `cover` et `author.name`. POST `requireEditor`. |
| `articles/[id]/route.ts` | GET, PATCH, DELETE | GET public, article publié uniquement; PATCH et DELETE `requireEditor`. |
| `players/route.ts` | GET, POST | GET public, tri par numéro; POST `requireEditor`. Positions validées : `GARDIEN`, `DEFENSEUR`, `MILIEU`, `ATTAQUANT`. |
| `players/[id]/route.ts` | GET, PATCH, DELETE | GET public avec médias associés; PATCH et DELETE `requireEditor`. |
| `galerie/route.ts` | GET, POST | GET public, filtres `album`, `playerId`, `type`, pagination; POST `requireEditor`. |
| `galerie/[id]/route.ts` | GET, PATCH, DELETE | GET public; PATCH et DELETE `requireEditor`. |
| `uploads/route.ts` | POST | `requireEditor`; `multipart/form-data`, image/vidéo, 10 Mio image et 50 Mio vidéo; Cloudinary côté serveur, stockage local de secours uniquement hors production. |
| `partners/route.ts` | GET | Public; trie les sponsors par `priority`, puis `name`, résout `logoId` en URL et renvoie `id`, `name`, `link`, `logoUrl`. |
| `academie/route.ts` | GET, POST | POST public, validation du formulaire et limitation de débit; écrit une soumission `ACADEMIE`. GET protégé par `requireEditor`. |
| `forms/route.ts` | GET | `requireEditor`; filtres `type` (`ACADEMIE`, `NEWSLETTER`, `CONTACT`, `BILLETTERIE`) et `processed`. |
| `forms/[id]/route.ts` | GET, PATCH, DELETE | Toutes les méthodes sont protégées par `requireEditor`; PATCH modifie `processed`. |
| `newsletter/route.ts` | GET, POST | POST public et limité en débit, upsert de l'adresse abonnée; GET des abonnés actifs protégé par `requireEditor`. |
| `emails/route.ts` | GET, POST | `requireEditor`; GET des 50 derniers logs; POST crée un log ou reprend les champs d'un log indiqué. L'envoi effectif via Resend n'est pas réalisé dans cette route. |
| `seasons/route.ts` | GET, POST | GET public; POST `requireEditor`, contrôle des dates et transaction pour l'unicité logique de la saison courante. |
| `club-overview/route.ts` | GET | Public; expose match à venir/en cours et réglages publics `facebookUrl`, `whatsappPartenaire`, `whatsappBilletterie`, `homeIntroText`, `academyCompletionRate`, `academyGraduates`, `academyLabel`. |

Tous les handlers d'écriture observés sont ici répertoriés. Plusieurs routes
publiques acceptent des écritures sans authentification (voir intégration).
`requireEditor` renvoie actuellement 401 lorsque l'accès est refusé, y compris
pour un utilisateur authentifié sans rôle autorisé; il ne distingue donc pas
les réponses 401 et 403 demandées pour nfcadmin.

## Formats, pages et consommateurs

- Matchs : `src/types/index.ts` déclare `MatchItem.status` comme
  `PROGRAMME | EN_COURS | TERMINE | REPORTE | ANNULE`. Les routes
  `matches/route.ts` et `matches/[id]/route.ts` valident les mêmes cinq valeurs.
  Le modèle Prisma stocke toutefois `status` comme chaîne et ne définit pas
  d'enum. `MatchDetail.tsx` affiche date, équipes, stade, compétition et résumé;
  aucun champ d'événement n'y est consommé. L'affichage des calendriers est dans
  `src/app/calendrier/page.tsx`, le prochain match dans
  `src/components/sections/NextMatchBanner.tsx`.
- Classement : `src/app/api/standings/route.ts` lit déjà la base, contrairement
  à l'hypothèse du brief selon laquelle l'endpoint serait factice. Points =
  `3 * won + drawn`, différence = `goalsFor - goalsAgainst`. Les pages
  `src/app/page.tsx` et `src/app/classement/page.tsx` affichent le rang, les
  statistiques du NFC et le libellé de saison. Le format d'affichage de `form`
  n'est pas déterminant dans ces deux pages.
- Joueurs : postes validés dans `src/app/api/players/route.ts` et
  `src/types/index.ts`. `src/app/effectif/page.tsx` lit les données de base et
  les statistiques JSON `matchesPlayed`, `goalsScored`, `assists`. La page
  `src/app/player/[id]/page.tsx` et `src/components/player/PlayerDetail.tsx`
  utilisent aussi `yellowCards`, `redCards`, `birthDate`, `height`, `weight`,
  `joinedYear`, `bio` et la photo. `StaffMember` existe dans les types, mais
  aucun écran/API staff opérationnel n'a été repéré.
- Articles : les pages `src/app/actualites/page.tsx`,
  `src/app/actualites/[slug]/page.tsx` et les composants
  `src/components/sections/NewsGrid.tsx`, `src/components/news/NewsArticle.tsx`
  consomment `slug`, `title`, `summary`, `content`, `category`, couverture,
  auteur, `publishedAt` et `videoUrl`. `NewsArticle.tsx` rend `content` comme
  texte dans un paragraphe; pas de Markdown/HTML interprété détecté.
- Médias : `src/app/galerie/page.tsx` affiche URL, titre, album, type, date et
  association joueur. Les champs d'API sont `provider`, `publicId`, `url`,
  `mimeType`, dimensions/taille, `variants`, `album`, `mediaType`, `playerId`.
  Les albums sont issus des données, aucune liste canonique n'est définie dans
  l'API.
- Partenaires : `src/components/sections/Partners.tsx` affiche nom, lien et
  logo. Le modèle `Sponsor` n'a pas de champ actif.
- Académie : `src/app/academie/page.tsx` envoie
  `nomJoueur`, `prenomJoueur`, `dateNaissance`, `categorie`, `poste`,
  `nomTuteur`, `telephone`, `description`. `api/academie/route.ts` persiste ces
  champs plus `notes` dans `payload` JSON et affecte le type `ACADEMIE`.
- Newsletter : formulaires dans `src/components/layout/Footer.tsx` et
  `src/app/page.tsx`; POST `/api/newsletter` attend `{ email }`.
- Contact : aucun formulaire ou endpoint de contact dédié repéré. `CONTACT`
  existe comme valeur de filtre des soumissions, mais son émetteur n'est pas
  présent dans le code audité.
- Paramètres actuellement servis par `club-overview` : `facebookUrl` dans
  `src/components/layout/Footer.tsx`, `whatsappBilletterie` dans
  `src/app/calendrier/page.tsx`, `whatsappPartenaire` dans `src/app/page.tsx`.
  `homeIntroText`, `academyCompletionRate`, `academyGraduates` et `academyLabel`
  figurent dans la liste API mais leur affichage n'a pas été retrouvé.
- Valeurs textuelles encore codées en dur : `src/app/page.tsx`,
  `src/components/layout/Footer.tsx` et `src/app/academie/page.tsx`. Les détails
  d'adhésion et la page de présentation du club comportent des placeholders dans
  `src/app/membre/page.tsx` et `src/app/le-club/page.tsx`. Aucun tarif de tribune
  exploité par une interface de gestion n'a été repéré.

## Intégrations et configuration vérifiées

- `src/lib/server/auth.ts` : JWT access 15 min et refresh 7 jours,
  `JWT_SECRET` et `JWT_REFRESH_SECRET` obligatoires, extraction Bearer, recherche
  utilisateur via Prisma, helpers `requireEditor`/`hasRole`. Le login n'exclut
  pas le rôle `USER`.
- `src/lib/server/cloudinary.ts` : configuration par variables d'environnement,
  helpers d'upload/suppression.
- `src/lib/server/resend.ts` : client Resend; valeur de repli vide pour la clé,
  adresse expéditeur de repli `no-reply@example.com`.
- `src/lib/prisma.ts` : client Prisma singleton en développement, log Prisma en
  développement et erreurs en production.
- `package.json` : Next `14.2.0`, React 18, Prisma 5, bcryptjs, jsonwebtoken,
  Zod, Resend, Cloudinary. PostgreSQL déclaré dans `prisma/schema.prisma`.
- `.env.example` observé : les URL affichées sont PostgreSQL/Supabase avec
  `DATABASE_URL` et `DIRECT_URL`; les autres valeurs sont des placeholders dans
  la copie examinée. Aucun écart MySQL/PostgreSQL n'est visible dans ce fichier
  actuel. Les identifiants Cloudinary précédemment présents dans l'historique
  Git du site doivent néanmoins être régénérés comme demandé dans le brief.
- `README.md` est le document de lancement/configuration consulté.

## Écarts à traiter et TODO non inventés

1. Le schéma public a déjà `Season`, `ClubStanding` et `ClubSetting`; ne pas les
   recréer. Ajouter côté nfcadmin uniquement les extensions manquantes, en
   migration additive et synchronisation documentée.
2. `ClubStandingHistory`, `AuditLog`, `PushSubscription`, suppression logique
   et statut actif des sponsors ne sont pas implémentés dans le schéma public.
3. Les lectures publiques actuelles ne filtrent aucun `deletedAt` (champ absent);
   avant d'ajouter des suppressions logiques, le site public devra filtrer ces
   lignes ou une suppression de contenu ne sera pas reflétée.
4. Le brief mentionne des événements de match, mais aucun schéma d'événement
   exploité par `MatchDetail.tsx` ou la page match n'a été vérifié. **TODO** :
   ne pas saisir de forme d'événement métier avant clarification/consommateur.
5. Les statuts d'académie (`nouveau`, `contacté`, etc.), les notes internes, les
   règles d'équipe locale pour déduire les résultats du NFC, ainsi que les
   tarifs, contacts et chiffres du club ne sont pas tous définis dans les
   modèles/écrans publics. À confirmer avant publication ou à exposer comme
   informations manquantes, sans valeur par défaut métier.
6. Le staff est un type de données sans UI/API; aucun CRUD staff ne doit être
   ajouté sur la base de cette seule définition de type.
7. Aucun envoi de newsletter/campagne via Resend n'est implémenté dans
   `/api/emails`; son POST ne journalise qu'un `EmailLog`.
8. Les routes publiques `/api/academie` (POST) et `/api/newsletter` (POST)
   écrivent sans authentification (avec limitation de débit). Les routes
   d'écriture `articles`, `matches`, `players`, `galerie`, `uploads`, `forms`,
   `emails` et `seasons` utilisent `requireEditor`, sous forme de Bearer token.
