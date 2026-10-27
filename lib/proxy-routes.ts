export type AllowedProxyRoute = {
  pattern: RegExp;
  methods: readonly string[];
};

/** Allowlist stricte des routes exposées par nfcwebsite. */
export const routeMethods: AllowedProxyRoute[] = [
  { pattern: /^\/health$/, methods: ['GET'] },
  { pattern: /^\/matches$/, methods: ['GET', 'POST'] },
  { pattern: /^\/matches\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/players$/, methods: ['GET', 'POST'] },
  { pattern: /^\/players\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/articles$/, methods: ['GET', 'POST'] },
  { pattern: /^\/articles\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/galerie$/, methods: ['GET', 'POST'] },
  { pattern: /^\/galerie\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/uploads$/, methods: ['POST'] },
  { pattern: /^\/uploads\/sign$/, methods: ['POST'] },
  { pattern: /^\/forms$/, methods: ['GET', 'POST'] },
  { pattern: /^\/forms\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/academie$/, methods: ['GET', 'POST'] },
  { pattern: /^\/newsletter$/, methods: ['GET', 'POST'] },
  { pattern: /^\/emails$/, methods: ['GET', 'POST'] },
  { pattern: /^\/partners$/, methods: ['GET', 'POST'] },
  { pattern: /^\/partners\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { pattern: /^\/standings$/, methods: ['GET', 'PUT'] },
  { pattern: /^\/standings\/history$/, methods: ['GET'] },
  { pattern: /^\/seasons$/, methods: ['GET', 'POST'] },
  { pattern: /^\/seasons\/[^/]+$/, methods: ['PATCH'] },
  { pattern: /^\/settings$/, methods: ['GET', 'PUT'] },
  { pattern: /^\/users$/, methods: ['GET', 'POST'] },
  { pattern: /^\/users\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { pattern: /^\/audit$/, methods: ['GET'] },
  { pattern: /^\/push\/subscribe$/, methods: ['GET', 'POST', 'DELETE'] },
  { pattern: /^\/club-overview$/, methods: ['GET'] },
];

export function matchProxyRoute(
  apiPath: string,
  method: string,
): { status: 'ok' } | { status: 'not_found' } | { status: 'method_not_allowed' } {
  const route = routeMethods.find(({ pattern }) => pattern.test(apiPath));
  if (!route) return { status: 'not_found' };
  if (!route.methods.includes(method.toUpperCase())) return { status: 'method_not_allowed' };
  return { status: 'ok' };
}
