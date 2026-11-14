import type { SessionPayload, SessionRole } from "@/lib/auth";

/** Thrown when there is no valid session at all. Maps to HTTP 401. */
export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Thrown when a session exists but lacks permission. Maps to HTTP 403. */
export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Every sensitive route MUST call this — never trust that the UI hid a
 * button. This is the backend authorization boundary referenced throughout
 * ARCHITECTURE.md's security section.
 */
export function requireSession(session: SessionPayload | null): SessionPayload {
  if (!session) throw new UnauthorizedError();
  return session;
}

export function requireRole(session: SessionPayload, allowed: SessionRole[]): void {
  if (!allowed.includes(session.role)) throw new ForbiddenError();
}

export const isCeo = (session: SessionPayload) => session.role === "CEO";
