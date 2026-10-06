/**
 * Auth constants shared between the API routes (Node runtime) and proxy.ts
 * (edge runtime). Kept dependency-free so importing it into the edge proxy
 * never drags in `next/headers` or other Node-only modules.
 */
export const PIN_COOKIE = "sb_pin";
export const PIN_HEADER = "x-app-pin";

// 30 days — this is a convenience gate, not a security boundary.
export const PIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
