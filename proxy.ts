import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PIN_COOKIE } from "@/lib/constants";

/**
 * Proxy (formerly Middleware, renamed in Next.js 16).
 *
 * This is only an *optimistic* gate: it redirects browser page views that lack
 * a valid PIN cookie to /login, so nobody lands on an empty app. Real
 * enforcement lives in the API route handlers (see lib/auth.ts `requirePin`),
 * which every data request goes through.
 *
 * The matcher below intentionally excludes `/api/*` (routes enforce their own
 * PIN, and the iOS Shortcut authenticates via header, not cookie), static
 * assets, and the login page itself.
 */
export function proxy(request: NextRequest) {
  const pin = request.cookies.get(PIN_COOKIE)?.value;
  const authed = !!pin && pin === process.env.APP_PIN;

  if (!authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where the user was headed so we can send them back after login.
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
