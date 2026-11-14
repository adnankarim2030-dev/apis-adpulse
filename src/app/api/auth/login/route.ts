import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, signSessionToken, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";
import { handleApiError } from "@/lib/api-utils";

// Simple in-memory throttle: blocks an email after too many failed attempts
// within a short window. Section 4/41 call for "failed login protection" —
// for production scale this should move to Redis, but this keeps Phase 1
// dependency-free.
const attempts = new Map<string, { count: number; firstAttemptAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function isThrottled(email: string): boolean {
  const record = attempts.get(email);
  if (!record) return false;
  if (Date.now() - record.firstAttemptAt > WINDOW_MS) {
    attempts.delete(email);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(email: string) {
  const record = attempts.get(email);
  if (!record || Date.now() - record.firstAttemptAt > WINDOW_MS) {
    attempts.set(email, { count: 1, firstAttemptAt: Date.now() });
  } else {
    record.count += 1;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    if (isThrottled(normalizedEmail)) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again in a few minutes.", code: "THROTTLED" },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const ipAddress = request.headers.get("x-forwarded-for") ?? undefined;

    const valid = user && user.isActive ? await verifyPassword(password, user.passwordHash) : false;

    await prisma.loginAttempt.create({
      data: { email: normalizedEmail, success: !!valid, userId: user?.id, ipAddress },
    });

    if (!valid || !user) {
      recordFailure(normalizedEmail);
      return NextResponse.json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    attempts.delete(normalizedEmail);

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
