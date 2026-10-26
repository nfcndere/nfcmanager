import { NextRequest, NextResponse } from "next/server";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  if (mutationMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    let validOrigin = false;
    try {
      validOrigin = Boolean(origin && new URL(origin).origin === request.nextUrl.origin);
    } catch {
      validOrigin = false;
    }
    if (!validOrigin) {
      return NextResponse.json(
        { message: "Origine de requête refusée." },
        { status: 403 },
      );
    }
  }

  const response = NextResponse.next();
  const scriptPolicy =
    process.env.NODE_ENV === "development"
      ? "'self' 'unsafe-inline' 'unsafe-eval'"
      : "'self' 'unsafe-inline'";
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src ${scriptPolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html).*)"],
};
