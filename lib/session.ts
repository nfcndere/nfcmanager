import { redirect } from 'next/navigation';
import { getSessionState, type SessionResult, type SiteUser } from '@/lib/auth';

export type PageSession = {
  user: SiteUser;
  apiAvailable: boolean;
  apiUnavailable: boolean;
  expiresAt: number | null;
  hasRefreshToken: boolean;
};

/**
 * Garde serveur des pages protégées :
 * - si la session est valide → renvoie l'utilisateur ;
 * - si l'API du site est momentanément indisponible mais qu'un jeton non expiré est présent →
 *   garde l'utilisateur connecté en mode dégradé (`apiAvailable: false`) au lieu d'afficher l'écran de crash ;
 * - si aucun jeton valide n'est présent et que l'API est en panne → redirige vers `/connexion?api=unavailable` ;
 * - sinon → redirige vers `/connexion`.
 */
export async function requireSession(returnTo?: string): Promise<SiteUser> {
  const session = await requirePageSession(returnTo);
  return session.user;
}

export async function requirePageSession(returnTo?: string): Promise<PageSession> {
  const state: SessionResult = await getSessionState();
  if (state.status === 'ok' || state.status === 'authenticated') {
    return {
      user: state.user,
      apiAvailable: true,
      apiUnavailable: false,
      expiresAt: state.expiresAt,
      hasRefreshToken: state.hasRefreshToken,
    };
  }
  if ((state.status === 'unavailable' || state.status === 'api_unavailable') && state.user) {
    return {
      user: state.user,
      apiAvailable: false,
      apiUnavailable: true,
      expiresAt: state.expiresAt,
      hasRefreshToken: state.hasRefreshToken,
    };
  }
  if (state.status === 'unavailable' || state.status === 'api_unavailable') {
    redirect('/connexion?api=unavailable');
  }
  const suffix = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
  redirect(`/connexion${suffix}`);
}
