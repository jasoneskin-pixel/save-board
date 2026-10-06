import { cookies } from "next/headers";
import { isValidPin } from "@/lib/auth";
import { PIN_COOKIE, PIN_COOKIE_MAX_AGE } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login — validate the shared PIN and set the session cookie.
 * Body: { pin }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { pin } = (body ?? {}) as { pin?: string };
  if (!isValidPin(pin)) {
    return Response.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(PIN_COOKIE, pin as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PIN_COOKIE_MAX_AGE,
  });

  return Response.json({ ok: true });
}

/** DELETE /api/auth/login — log out by clearing the session cookie. */
export async function DELETE() {
  const jar = await cookies();
  jar.delete(PIN_COOKIE);
  return Response.json({ ok: true });
}
