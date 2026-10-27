import { z } from 'zod';

// ===================================
// Enveloppe standard de nfcwebsite (`src/lib/api-response.ts`)
// ===================================
export const resourceStatusSchema = z.enum(['ok', 'empty', 'stale', 'partial', 'error']);
export type ResourceStatus = z.infer<typeof resourceStatusSchema>;

export function resourceEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    status: resourceStatusSchema.default('ok'),
    data: dataSchema,
    updatedAt: z.string().nullable().optional(),
    message: z.string().optional(),
  });
}

// ===================================
// Matchs (`prisma.match` + `src/app/api/matches/**`)
// ===================================
export const MATCH_STATUSES = ['PROGRAMME', 'EN_COURS', 'TERMINE', 'REPORTE', 'ANNULE'] as const;
export const matchStatusSchema = z.enum(MATCH_STATUSES);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const matchSchema = z.object({
  id: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeScore: z.number().int().nullable().optional(),
  awayScore: z.number().int().nullable().optional(),
  date: z.string(),
  stadium: z.string().nullable().optional(),
  competition: z.string().nullable().optional(),
  status: matchStatusSchema,
  summary: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});
export type Match = z.infer<typeof matchSchema>;
export type MatchRecord = Match;

export const matchFormSchema = z.object({
  homeTeam: z.string().trim().min(1, 'Équipe à domicile obligatoire.').max(120),
  awayTeam: z.string().trim().min(1, 'Équipe extérieure obligatoire.').max(120),
  date: z.string().min(1, 'Date et heure obligatoires.'),
  stadium: z.string().trim().max(160).nullable().optional(),
  competition: z.string().trim().max(120).nullable().optional(),
  status: matchStatusSchema.default('PROGRAMME'),
  summary: z.string().max(4_000).nullable().optional(),
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
});
export type MatchFormValues = z.infer<typeof matchFormSchema>;

// ===================================
// Médias / Galerie (`prisma.media` + `src/app/api/galerie/**`)
// ===================================
export const mediaSchema = z.object({
  id: z.string(),
  provider: z.string().optional(),
  publicId: z.string().optional(),
  url: z.string(),
  type: z.enum(['PHOTO', 'VIDEO']).optional(),
  mimeType: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  size: z.number().nullable().optional(),
  altText: z.string().nullable().optional(),
  album: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']).nullable().optional(),
  playerId: z.string().nullable().optional(),
  player: z
    .object({ id: z.string().optional(), firstName: z.string(), lastName: z.string() })
    .nullable()
    .optional(),
  createdAt: z.string().nullable().optional(),
});
export type Media = z.infer<typeof mediaSchema>;
export type MediaRecord = Media;

// ===================================
// Joueurs (`prisma.player` + `src/app/api/players/**`)
// ===================================
export const PLAYER_POSITIONS = ['GARDIEN', 'DEFENSEUR', 'MILIEU', 'ATTAQUANT'] as const;
export const playerPositionSchema = z.enum(PLAYER_POSITIONS);
export type PlayerPosition = z.infer<typeof playerPositionSchema>;

export const playerStatsSchema = z
  .object({
    matchesPlayed: z.number().int().min(0).optional(),
    goalsScored: z.number().int().min(0).optional(),
    assists: z.number().int().min(0).optional(),
    yellowCards: z.number().int().min(0).optional(),
    redCards: z.number().int().min(0).optional(),
  })
  .passthrough()
  .nullable()
  .optional();

export const playerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  number: z.number().int().nullable().optional(),
  position: playerPositionSchema.nullable().optional(),
  nationality: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  photoId: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  photo: mediaSchema.nullable().optional(),
  stats: playerStatsSchema,
  isCaptain: z.boolean().default(false),
  birthDate: z.string().nullable().optional(),
  height: z.number().int().nullable().optional(),
  weight: z.number().int().nullable().optional(),
  joinedYear: z.number().int().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type Player = z.infer<typeof playerSchema>;
export type PlayerRecord = Player;

export const playerFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom obligatoire.').max(100),
  lastName: z.string().trim().min(1, 'Nom obligatoire.').max(100),
  number: z.number().int().min(0).max(99).nullable().optional(),
  position: playerPositionSchema.nullable().optional(),
  nationality: z.string().trim().max(80).nullable().optional(),
  bio: z.string().max(4_000).nullable().optional(),
  photoId: z.string().nullable().optional(),
  isCaptain: z.boolean().default(false),
  birthDate: z.string().max(30).nullable().optional(),
  height: z.number().int().min(100).max(250).nullable().optional(),
  weight: z.number().int().min(30).max(180).nullable().optional(),
  joinedYear: z.number().int().min(1950).max(2100).nullable().optional(),
  stats: z
    .object({
      matchesPlayed: z.number().int().min(0).default(0),
      goalsScored: z.number().int().min(0).default(0),
      assists: z.number().int().min(0).default(0),
      yellowCards: z.number().int().min(0).default(0),
      redCards: z.number().int().min(0).default(0),
    })
    .optional(),
});
export type PlayerFormValues = z.infer<typeof playerFormSchema>;

// ===================================
// Articles (`prisma.article` + `src/app/api/articles/**`)
// ===================================
export const articleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  content: z.string(),
  category: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  coverId: z.string().nullable().optional(),
  cover: mediaSchema.nullable().optional(),
  author: z.object({ name: z.string() }).nullable().optional(),
  published: z.boolean().default(false),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type Article = z.infer<typeof articleSchema>;
export type ArticleRecord = Article;

export const articleFormSchema = z.object({
  title: z.string().trim().min(1, 'Titre obligatoire.').max(240),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug obligatoire.')
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalide : lettres minuscules, chiffres et tirets uniquement.'),
  summary: z.string().max(1_000).nullable().optional(),
  content: z.string().min(1, 'Contenu de l’article obligatoire.'),
  category: z.string().trim().max(80).nullable().optional(),
  videoUrl: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), 'URL vidéo invalide (doit commencer par https://).')
    .nullable()
    .optional(),
  coverId: z.string().nullable().optional(),
  published: z.boolean().default(false),
});
export type ArticleFormValues = z.infer<typeof articleFormSchema>;

// ===================================
// Saisons & Classement (`src/app/api/seasons/**`, `src/app/api/standings/**`)
// ===================================
export const seasonSchema = z.object({
  id: z.string(),
  label: z.string(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isCurrent: z.boolean(),
  updatedAt: z.string().nullable().optional(),
});
export type Season = z.infer<typeof seasonSchema>;
export type SeasonRecord = Season;

export const nfcStandingSchema = z.object({
  id: z.string().optional(),
  seasonId: z.string().optional(),
  rank: z.number().int(),
  position: z.number().int().optional(),
  teamName: z.string().default('Ngaoundéré FC'),
  played: z.number().int(),
  won: z.number().int(),
  drawn: z.number().int(),
  lost: z.number().int(),
  goalsFor: z.number().int(),
  goalsAgainst: z.number().int(),
  goalDifference: z.number().int(),
  points: z.number().int(),
  form: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type NfcStanding = z.infer<typeof nfcStandingSchema>;

export const standingsPayloadSchema = z.object({
  season: z.object({ id: z.string(), label: z.string() }).nullable(),
  nfc: nfcStandingSchema.nullable(),
});
export type StandingsPayload = z.infer<typeof standingsPayloadSchema>;
export type StandingResponse = StandingsPayload;

export const standingFormSchema = z
  .object({
    seasonId: z.string().optional(),
    rank: z.number().int().min(1, 'Le rang doit être ≥ 1.'),
    played: z.number().int().min(0),
    won: z.number().int().min(0),
    drawn: z.number().int().min(0),
    lost: z.number().int().min(0),
    goalsFor: z.number().int().min(0),
    goalsAgainst: z.number().int().min(0),
    form: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => !v || /^[VND](-[VND]){0,4}$/.test(v), {
        message: 'Forme attendue : 1 à 5 résultats V, N ou D séparés par des tirets (ex. V-V-N-D-V).',
      })
      .nullable()
      .optional(),
  })
  .refine((v) => v.played === v.won + v.drawn + v.lost, {
    message: 'Joués doit être égal à Victoires + Nuls + Défaites.',
    path: ['played'],
  });
export type StandingFormValues = z.infer<typeof standingFormSchema>;

export const standingHistoryItemSchema = z.object({
  id: z.string(),
  seasonId: z.string(),
  rank: z.number().int().optional(),
  position: z.number().int().optional(),
  played: z.number().int(),
  won: z.number().int(),
  drawn: z.number().int(),
  lost: z.number().int(),
  goalsFor: z.number().int(),
  goalsAgainst: z.number().int(),
  points: z.number().int().optional(),
  goalDifference: z.number().int().optional(),
  form: z.string().nullable().optional(),
  recordedAt: z.string().optional(),
  createdAt: z.string().optional(),
  changedBy: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable().optional(),
});
export type StandingHistoryItem = z.infer<typeof standingHistoryItemSchema>;
export type StandingHistoryRecord = StandingHistoryItem;

// ===================================
// Partenaires / Sponsors (`src/app/api/partners/**`)
// ===================================
export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  link: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  logoId: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  priority: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});
export type Partner = z.infer<typeof partnerSchema>;
export type PartnerRecord = Partner;

// ===================================
// Formulaires : Académie, Contact, Billetterie (`src/app/api/forms/**`)
// ===================================
export const ACADEMY_FOLLOW_UP_STATUSES = [
  'NOUVEAU',
  'CONTACTE',
  'CONVOQUE',
  'ADMIS',
  'REFUSE',
] as const;
export const followUpStatusSchema = z.enum(ACADEMY_FOLLOW_UP_STATUSES);
export type FollowUpStatus = z.infer<typeof followUpStatusSchema>;
export type AcademyFollowUpStatus = FollowUpStatus;
export type FormType = 'ACADEMIE' | 'CONTACT' | 'BILLETTERIE';

export const formSubmissionSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.record(z.unknown()),
  processed: z.boolean(),
  adminNotes: z.string().nullable().optional(),
  followUpStatus: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});
export type FormSubmission = z.infer<typeof formSubmissionSchema>;
export type FormSubmissionRecord = FormSubmission;

// ===================================
// Newsletter & E-mails (`src/app/api/newsletter`, `src/app/api/emails`)
// ===================================
export const newsletterSubscriberSchema = z.object({
  id: z.string(),
  email: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type NewsletterSubscriber = z.infer<typeof newsletterSubscriberSchema>;
export type NewsletterSubscriberRecord = NewsletterSubscriber;

export const emailLogSchema = z.object({
  id: z.string(),
  recipient: z.string(),
  to: z.string().optional(),
  from: z.string().optional(),
  subject: z.string(),
  body: z.string().optional(),
  provider: z.string().optional(),
  providerId: z.string().nullable().optional(),
  status: z.string(),
  error: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type EmailLog = z.infer<typeof emailLogSchema>;
export type EmailLogRecord = EmailLog;

// ===================================
// Paramètres du club (`src/app/api/settings`, `src/app/api/club-overview`)
// ===================================
export const PUBLIC_SETTING_KEYS = [
  'facebookUrl',
  'whatsappPartenaire',
  'whatsappBilletterie',
  'homeIntroText',
  'academyCompletionRate',
  'academyGraduates',
  'academyLabel',
] as const;
export type SettingKey = (typeof PUBLIC_SETTING_KEYS)[number];
export type ClubSettingsMap = Record<string, string | number | null | undefined>;

export const clubOverviewSchema = z.object({
  nextMatch: matchSchema.nullable().optional(),
  liveMatch: matchSchema.nullable().optional(),
  settings: z.record(z.string()).default({}),
});
export type ClubOverview = z.infer<typeof clubOverviewSchema>;

// ===================================
// Utilisateurs & Audit (`src/app/api/users/**`, `src/app/api/audit`)
// ===================================
export type UserRole = 'ADMIN' | 'EDITOR' | 'USER';

export const managedUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string(),
  role: z.enum(['ADMIN', 'EDITOR', 'USER']),
  active: z.boolean().optional().default(true),
  mustChangePassword: z.boolean().optional().default(false),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ManagedUser = z.infer<typeof managedUserSchema>;
export type UserRecord = ManagedUser;

export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  actorEmail: z.string().nullable().optional(),
  actorRole: z.string().nullable().optional(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable().optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  ip: z.string().nullable().optional(),
  createdAt: z.string(),
  user: z
    .object({ id: z.string(), name: z.string(), email: z.string(), role: z.string().optional() })
    .nullable()
    .optional(),
});
export type AuditLogEntry = z.infer<typeof auditLogSchema>;
export type AuditLogRecord = AuditLogEntry;
