/**
 * Lightweight shared-PIN gate.
 *
 * Intentionally minimal (per the spec): a convenience gate for a small trusted
 * team, not a defense against a serious attacker. The PIN is accepted either as
 * an `x-app-pin` header (used by the iOS Shortcut's API calls) or an `sb_pin`
 * cookie (used by browser sessions).
 *
 * Real enforcement lives here, in the API route handlers — Next.js `proxy.ts`
 * is only used for optimistic redirects of unauthenticated page views.
 */
import { cookies } from "next/headers";
import { env } from "./env";
import { PIN_COOKIE, PIN_HEADER } from "./constants";

export { PIN_COOKIE, PIN_HEADER };

/** Constant-time-ish string comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isValidPin(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  return safeEqual(candidate, env.appPin);
}

/**
 * Returns a 401 Response if the request is not authenticated, or null if it is.
 * Usage in a route handler:
 *
 *   const denied = await requirePin(request);
 *   if (denied) return denied;
 */
export async function requirePin(request: Request): Promise<Response | null> {
  const headerPin = request.headers.get(PIN_HEADER);
  if (isValidPin(headerPin)) return null;

  const cookiePin = (await cookies()).get(PIN_COOKIE)?.value;
  if (isValidPin(cookiePin)) return null;

  return Response.json(
    { error: "Unauthorized. Provide a valid PIN." },
    { status: 401 },
  );
}
