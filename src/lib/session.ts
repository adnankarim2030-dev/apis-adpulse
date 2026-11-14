import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server-only helper: read + verify the session cookie.
 * Also verifies that the user still exists in the database.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch {
    return payload;
  }
}

