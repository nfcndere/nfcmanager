# Diagnostic d'authentification — `nfcmanager` ↔ `nfcwebsite`

Ce document synthétise l'audit du flux de connexion entre la PWA d'administration (`nfcmanager`) et l'API du site officiel (`nfcwebsite`), à partir de la lecture directe de :
- `../nfcwebsite/src/app/api/auth/login/route.ts` ;
- `../nfcwebsite/src/app/api/auth/refresh/route.ts` ;
- `../nfcwebsite/src/app/api/auth/me/route.ts` ;
- `../nfcwebsite/src/lib/server/auth.ts` (`getUserFromToken`, `authorize`, `requireEditor`, `requireAdmin`) ;
- `proxy.ts`, `lib/auth.ts`, `lib/session.ts`, `app/api/auth/login/route.ts` dans `nfcmanager`.

---

## 1. Tableau des 7 points du constat (cause / vérification / correctif)

| # | Symptôme observé | Cause racine exacte | Comment la vérifier | Correctif appliqué |
|---|---|---|---|---|
| **1** | Déconnexion systématique après **15 minutes** | `POST /api/auth/login` du site émet un `token` (15 min) et un `refreshToken` (7 jours), mais `app/api/auth/login/route.ts` ne stocke que `token` et ignore `refreshToken`. Aucune rotation de jeton n'était exécutée avant l'expiration. | Se connecter, inspecter `Application → Cookies` dans DevTools : un seul cookie `nfcwebsite_access_token` (`Max-Age=900`), aucun cookie refresh. | Stockage de deux cookies `httpOnly` (`sameSite=lax`) : `nfcwebsite_access_token` (15 min) + `nfcwebsite_refresh_token` (7 j) + méta-cookie d'expiration `nfcwebsite_session_exp`. Renouvellement automatique dans `proxy.ts` et via `POST /api/auth/refresh` (rotation). Si `/api/auth/refresh` répond `404` côté site, bandeau d'avertissement **2 min avant expiration** avec sauvegarde automatique du brouillon en cours. |
| **2** | Écran d'erreur générique sur `/dashboard`, `/matchs`, `/effectif`, `/actualites`, `/classement` quand le site est en panne | `getSession()` dans `lib/auth.ts` lève `new Error("Vérification de session impossible (...)")` pour tout statut `!== 401` (500, 502, timeout réseau). Seules `/` et `/connexion` entouraient l'appel d'un `try/catch` propre ; ailleurs `requireSession()` redirigeait en boucle ou déclenchait `app/error.tsx`. | Couper le réseau ou pointer `NFCWEBSITE_API_URL` vers un port fermé puis ouvrir `/dashboard`. | `getSession()` est mémoïsé par requête (`React.cache`), borné à **5 s** (`AbortSignal.timeout(5000)`), ne lève **jamais** d'exception et retourne `{ status: 'ok' \| 'unauthenticated' \| 'unavailable', user }`. En cas de `'unavailable'`, l'application affiche un état `DataState` « Service du site indisponible » avec bouton **Réessayer** sans déconnecter l'utilisateur. |
| **3** | `403 « Origine de requête refusée »` sur `POST /api/auth/login` ou sur les mutations derrière un reverse proxy / PWA installée / Safari iOS | `proxy.ts` comparait uniquement `new URL(origin).origin === request.nextUrl.origin`. Derrière Vercel / Nginx / Cloudflare, `request.nextUrl.origin` peut différer de l'hôte public (`X-Forwarded-Host` / `X-Forwarded-Proto`), et certaines requêtes `same-origin` (PWA standalone, WebView) n'envoient pas d'en-tête `Origin` mais `Sec-Fetch-Site: same-origin`. | Envoyer `curl -X POST http://localhost:3000/api/auth/login -H "Sec-Fetch-Site: same-origin"` (sans `Origin`) ou avec `-H "X-Forwarded-Host: admin.ngaounderefc.cm" -H "Origin: https://admin.ngaounderefc.cm"` : l'ancien code répondait `403`. | Fonction `isTrustedOrigin(request)` dans `proxy.ts` : accepte la requête si `Origin` correspond à `request.nextUrl.origin` **ou** à l'origine reconstruite depuis `X-Forwarded-Proto` + `X-Forwarded-Host` / `Host`, ou — en l'absence d'en-tête `Origin` — si `Sec-Fetch-Site === 'same-origin'`. Toute origine externe explicite reste refusée (`403`). |
| **4** | Cookie de session non posé lors des tests sur téléphone via IP locale (`http://192.168.x.x:3000`) en mode production (`next start`) | `secure: process.env.NODE_ENV === 'production'` forçait l'attribut `Secure` même lorsque la requête arrivait en `http://` sur le réseau local : le navigateur mobile ignorait alors le `Set-Cookie`. | Lancer `npm run build && npm start`, ouvrir `http://<ip-locale>:3000/connexion` depuis un téléphone, se connecter : le cookie n'est pas enregistré et `/dashboard` renvoie vers `/connexion`. | Helper `isSecureRequest(request)` : `Secure` est activé uniquement si la requête est réellement servie en HTTPS (`request.nextUrl.protocol === 'https:'` ou `x-forwarded-proto === 'https'`), ou si `FORCE_SECURE_COOKIES=true`. Sur HTTPS en production, le cookie reste `Secure; HttpOnly; SameSite=Lax`. |
| **5** | Message opaque `« Réponse de connexion du site invalide »` quand `JWT_SECRET` ou `JWT_REFRESH_SECRET` manque sur `nfcwebsite` | Dans la version initiale de `nfcwebsite`, `src/lib/server/auth.ts` exécutait `throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be configured.')` au top-level : Vercel renvoyait une page d'erreur HTML `500`, `response.json()` échouait dans `nfcmanager` et affichait ce message générique. | Appeler `POST /api/auth/login` sur un déploiement sans `JWT_SECRET` : `content-type: text/html` + statut `500`. | Côté `nfcmanager`, inspection du `Content-Type` et du code HTTP avant `response.json()` : traduction explicite en français (« Le site renvoie une erreur serveur (500). Vérifiez le déploiement du site et ses variables JWT_SECRET / JWT_REFRESH_SECRET », « Identifiants incorrects », « Compte sans droits d'administration », « Réseau indisponible », « Trop de tentatives — réessayez dans X s »). |
| **6** | Latence et risque de panne en cascade à chaque navigation (`GET /api/auth/me` appelé à chaque page) | Chaque Server Component appelait `requireSession()` → `fetch(/api/auth/me)` sans mémoïsation ni vérification locale préalable du JWT, et toutes les pages faisaient leurs lectures de données en SSR synchrone. | Observer l'onglet Réseau / logs serveur lors du passage de `/dashboard` à `/matchs` : un appel distant `/api/auth/me` bloque chaque rendu. | 1) Garde rapide dans `proxy.ts` par lecture du cookie et de son expiration ; 2) décodage local de la charge utile JWT + mémoïsation `React.cache` par requête et cache mémoire court (60 s) par empreinte de jeton pour `/api/auth/me` ; 3) coquille serveur légère + chargement client TanStack Query persisté dans IndexedDB. |
| **7** | Aucune limitation de tentatives côté manager et absence de « Mot de passe oublié » / changement de mot de passe | `app/api/auth/login/route.ts` relayait toutes les tentatives sans quota local, et aucune route `/mot-de-passe` n'était branchée sur `/api/auth/forgot`, `/api/auth/reset`, `/api/auth/password`. | Envoyer 20 tentatives erronées rapides sur `/api/auth/login` du manager ; chercher un lien « Mot de passe oublié » sur `/connexion`. | Limiteur de débit en mémoire côté manager (**5 tentatives / 10 min** par IP et par e-mail) renvoyant `429` + en-tête `Retry-After` (en complément du rate-limit Prisma du site). Pages `/mot-de-passe/oublie`, `/mot-de-passe/reinitialiser` et changement de mot de passe dans `/compte`, branchés sur `/api/auth/forgot`, `/api/auth/reset` et `/api/auth/password` avec détection `404/405` (« Fonction pas encore disponible côté site »). |

---

## 2. Écran de diagnostic en direct (`/connexion?diag=1`)

Un panneau de diagnostic interactif est intégré à la page de connexion (toujours accessible en développement, et accessible en production avec `?diag=1` ou depuis `/parametres` pour un `ADMIN`). Il exécute `GET /api/auth/diag` et affiche :

1. **URL canonique du site (`NFCWEBSITE_API_URL`)** : normalisation `ngaounderefc.cm` → `https://www.ngaounderefc.cm` et détection d'une éventuelle redirection `301/308` qui ferait perdre l'en-tête `Authorization`.
2. **Santé du site (`GET /api/health`)** : joignabilité PostgreSQL, présence de `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY`, et liste des tables Prisma éventuellement manquantes (`missingTables`).
3. **Sonde `POST /api/auth/login`** (corps vide) : vérifie que le site répond bien en `application/json` (`400`) et non avec une page HTML `500` de crash.
4. **Sonde `POST /api/auth/refresh`** : indique si la rotation des jetons est active sur le déploiement courant du site (`401` JSON attendu) ou non encore déployée (`404`).
5. **En-têtes et cookies reçus par le manager** : `Origin`, `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `Sec-Fetch-Site`, protocole détecté (`http` vs `https`) et présence des cookies `nfcwebsite_access_token` / `nfcwebsite_refresh_token`.

---

## 3. Liste de contrôle côté `nfcwebsite` (Vercel + Supabase)

| Élément | Valeur / commande attendue |
|---|---|
| `DATABASE_URL` | Chaîne PostgreSQL Supabase valide sur Vercel (`Production` / `Preview`). |
| `JWT_SECRET` & `JWT_REFRESH_SECRET` | Deux secrets aléatoires distincts (≥ 32 caractères) définis sur Vercel. |
| `CLOUDINARY_URL` | `cloudinary://<NEW_API_KEY>:<NEW_API_SECRET>@<CLOUD_NAME>` (après régénération des clés historiques). |
| Migrations Prisma en production | `npx prisma migrate resolve --applied 20261001000000_baseline && npx prisma migrate deploy` |
| Vérification post-déploiement | `curl -s https://www.ngaounderefc.cm/api/health` doit répondre HTTP `200` avec `"healthy": true` et `"missingTables": []`. |
