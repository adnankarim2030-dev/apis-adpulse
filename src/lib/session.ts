import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/auth";

/**
 * Server-only helper: read + verify the session cookie.
 * Safe to call from Server Components, Route Handlers, and Server Actions
 * (anything running in the Node.js runtime with access to `next/headers`).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
