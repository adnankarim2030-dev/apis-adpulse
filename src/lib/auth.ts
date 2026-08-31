import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// AUTH_SECRET must be set — fail loudly at boot rather than silently signing
// tokens with an empty/predictable key.
const rawSecret =
  process.env.AUTH_SECRET || "7f9dccdbcb7dfb800ab31561b227f6e05c7ccaf5603d5af748cc82606e735c66031634fea8598cd603a2178438d49615";
const secretKey = new TextEncoder().encode(rawSecret);

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "apis_session";
const SESSION_TTL = "7d";

export type SessionRole = "CEO" | "STAFF";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: SessionRole;
}

/** Hash a plaintext password for storage. Never store plaintext passwords. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Compare a plaintext password against a stored hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Sign a session JWT. Used only from Node.js route handlers (login). */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey);
}

/**
 * Verify a session JWT. Edge-runtime safe (uses `jose`, not Node's `crypto`),
 * so the same function works in middleware and in route handlers.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string" &&
      (payload.role === "CEO" || payload.role === "STAFF")
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}
