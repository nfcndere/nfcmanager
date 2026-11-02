# Charte Graphique & Système de Design — NFC Manager

> **Dépôt** : `nfcndere/nfcmanager`  
> **Application** : PWA d’administration mobile-first du Ngaoundéré Football Club  
> **Fuseau horaire de référence** : `Africa/Douala` (UTC+1 toute l’année)  
> **Langue** : Français  
> **Couleur club d’accent** : `#1f5f3d` (vert forêt officiel NFC)  
> **Typographie principale** : Inter (sans-serif neutre, lisible et sobre)

---

## 1. Vision & Principes Directeurs

1. **Sobre, aéré et serein** : Inspiré des meilleurs outils modernes de gestion de projets (Linear, Raycast, Notion). L’interface évite tout effet de bordure superflue, de dégradé criard ou d’ombre portée agressive. Le contenu respire.
2. **Fond neutre & Cartes blanches** : Le fond de l'application est un blanc / gris extrêmement léger (`#f6f6f6` pour la barre latérale, `#ffffff` pour le contenu). Les cartes ont un fond blanc pur, une bordure subtile de 1 px (`#e8e8e8`) et de grands arrondis de **16 px** (`rounded-[16px]`), avec beaucoup de marge intérieure.
3. **Typographie naturelle sans cris** : Suppression de toutes les capitales forcées (`uppercase tracking-wider`) sur les titres et les boutons. Les libellés sont rédigés en casse naturelle (« Nouveau match », « Effectif des joueurs »). Les nombres et statistiques utilisent systématiquement la police à espacement fixe `tabular-nums` pour éviter les sauts visuels.
4. **Touches pastel & 6 avatars déterministes** : Les statuts et les badges utilisent des fonds pastel doux avec un texte contrasté respectant le standard WCAG AA. Les joueurs, modules et adversaires sans photo reçoivent un avatar carré pastel déterministe (violet, rose, vert, jaune, bleu ou orange).

---

## 2. Palette de Couleurs & Jetons CSS (`app/globals.css`)

### 2.1 Surfaces & Bordures

| Jeton | Thème clair | Thème sombre | Rôle |
|---|---|---|---|
| `--bg` | `#ffffff` | `#0f1110` | Fond principal de l'application |
| `--bg-subtle` | `#f6f6f6` | `#171918` | Fond de la barre latérale & conteneurs secondaires |
| `--bg-hover` | `#eeeeee` | `#1f2220` | Survol discret d'un élément cliquable |
| `--card` | `#ffffff` | `#141615` | Fond de carte standard |
| `--border` | `#e8e8e8` | `#232725` | Bordure standard 1 px |
| `--border-subtle`| `#f0f0f0` | `#1c201e` | Séparateurs légers |

### 2.2 Typographie

| Jeton | Thème clair | Thème sombre | Rôle |
|---|---|---|---|
| `--text` | `#111111` | `#f4f5f4` | Titres et textes principaux (noir doux) |
| `--text-muted` | `#6e6e6e` | `#9aa19d` | Libellés secondaires et descriptions |
| `--text-soft` | `#8a8a8a` | `#6e7570` | Métadonnées, raccourcis et aides discrètes |

### 2.3 Accent Club (Ngaoundéré FC)

| Jeton | Hex / Valeur | Usage |
|---|---|---|
| `--accent` | `#1f5f3d` | Boutons primaires, indicateurs actifs |
| `--accent-soft` | `#eaf5ee` | Fond pastel vert pour pastilles et badges |
| `--accent-contrast` | `#ffffff` | Texte sur fond vert d'accent |
| `--accent-hover` | `#17482e` | État hover du bouton primaire |

### 2.4 Statuts Pastel (Contraste AA Garanti)

| Statut | Fond (`--status-*-bg`) | Texte (`--status-*-text`) | Bordure | Usage |
|---|---|---|---|---|
| **Succès** | `#ecfdf5` | `#065f46` | `#a7f3d0` | Terminé, validé, publié |
| **Attention** | `#fffbeb` | `#92400e` | `#fde68a` | En attente, brouillon, hors ligne |
| **Danger** | `#fef2f2` | `#991b1b` | `#fecaca` | Match en direct, erreur, alerte |
| **Information** | `#eff6ff` | `#1e40af` | `#bfdbfe` | Match programmé, note |

### 2.5 Les 6 Palettes d’Avatars Pastel Déterministes

La fonction `getDeterministicPalette(nom)` calcule un hash modulo 6 pour associer à chaque joueur, module ou adversaire une teinte fixe :

1. **Violet** : Fond `#f5f3ff`, Texte `#5b21b6`
2. **Rose** : Fond `#fdf2f8`, Texte `#9d174d`
3. **Vert** : Fond `#eaf5ee`, Texte `#1f5f3d`
4. **Jaune** : Fond `#fefce8`, Texte `#854d0e`
5. **Bleu** : Fond `#eff6ff`, Texte `#1e40af`
6. **Orange** : Fond `#fff7ed`, Texte `#9a3412`

---

## 3. Système de Navigation & Shell Applicatif (`AppShell.tsx`)

### 3.1 Barre Latérale Bureau (Sidebar)
- **Largeur** : 264 px déployée, repliable à 72 px en mode rail compact via le bouton `PanelLeftClose` / `PanelLeftOpen`.
- **Persistance** : Mémorisée dans `localStorage` (`nfc_sidebar_collapsed`).
- **Fond** : Gris très clair `#F6F6F6` (`--bg-subtle`), séparée du contenu par un trait fin de 1 px (`--border`).
- **En-tête** : Carré de blason NFC vert forêt 36x36 px, intitulé en semi-gras « Ngaoundéré FC », sous-titre gris « Administration ».
- **Recherche rapide** : Champ arrondi avec icône loupe fine et badges raccourcis `<Kbd>⌘K</Kbd>` et `<Kbd>/</Kbd>`.
- **Pastille active** (`.nav-pill-active`) : **Pastille blanche entièrement arrondie** (`rounded-full`), texte sombre, très légère élévation (`shadow-xs`), sans fond vert criard.
- **Section « Épinglés »** : Avatars carrés pastel avec une lettre (`[M]` Match direct, `[E]` Effectif, `[C]` Classement) et icône d'épingle discrète.
- **Pied de page** : Avatar lettre de l'utilisateur connecté, bascule thème clair/sombre, déconnexion.

### 3.2 Palette de Commande (`CommandPalette.tsx`)
- Déclenchée par `⌘K` / `Ctrl+K` ou la touche `/` (hors champs de saisie).
- Recherche instantanée parmi les modules administratifs et les actions rapides (« Programmer un match », « Rédiger une actualité », etc.).
- Navigation clavier totale (`↑`, `↓`, `Entrée`, `Échap`).

### 3.3 Navigation Mobile (Bottom Nav)
- Barre inférieure fixe avec 5 cibles tactiles ergonomiques : **Accueil**, **Matchs**, **Effectif**, **Classement**, **Plus**.
- Prise en compte automatique de la `safe-area-inset-bottom`.
- Le bouton « Plus » ouvre une feuille coulissante (`SheetDialog`) contenant les modules secondaires, le mode d’installation PWA et les options de compte.

---

## 4. Composants Atomiques (`components/ui/index.tsx`)

- **`Button`** : Variantes `primary`, `secondary`, `outline`, `ghost`, `danger`. Rayon `10px`, hauteur 40 px (md).
- **`Card`** : Fond blanc, bordure 1 px claire, arrondi 16 px, padding généreux, sans ombre.
- **`StatCard`** : Tuile pastel carrée avec icône fine, grand nombre en `tabular-nums`, libellé sobre, variation en pilule pastel discrète.
- **`LetterAvatar`** : Avatar carré ou rond avec initiale, fond pastel et texte contrasté via les 6 palettes déterministes.
- **`Pill`** : Indicateur compact avec icône fine, chiffre gras et libellé clair.
- **`StatusBadge`** : Badge statutaire sans majuscules forcées, tons `brand`, `success`, `warning`, `danger`, `info`, `neutral`.
- **`DataTable`** : Tableau épuré sans lignes verticales, en-tête gris clair, cases à cocher arrondies, colonnes triables.
- **`SheetDialog`** : Panneau coulissant latéral (mobile-first) pour formulaires et détails.
- **`ConfirmDialog`** : Boîte de dialogue de confirmation accessible, sans `window.confirm`.
- **`DataState`** : Gestion unifiée des états réseau (`loading` avec Skeleton, `empty`, `error`, `offline`, `stale`, `conflict`, `unavailable_feature`).

---

## 5. Salutation & Fuseau Horaire Africa/Douala

Dans le tableau de bord (`/dashboard`), la salutation est calculée dynamiquement sur l'heure locale camerounaise (GMT+1) :
- `05h00 - 11h59` : « Bonjour, **Prénom** »
- `12h00 - 17h59` : « Bon après-midi, **Prénom** »
- `18h00 - 04h59` : « Bonsoir, **Prénom** »

Mise en forme : le prénom est en semi-gras, la formule de politesse en graisse normale pour une approche amicale et professionnelle.

---

## 6. Page de Démonstration

L'ensemble des composants interactifs, jetons, contrastes et états de données est consultable en direct sur la route protégée :  
👉 **`/_design`**
