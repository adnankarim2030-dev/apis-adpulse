import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Middleware runs on the Edge runtime, so it verifies the JWT directly with
// `jose` rather than importing lib/auth.ts (which asserts Node-only env
// wiring). This is a UX convenience layer only — every API route still
// re-checks the session and role on the backend (see src/lib/rbac.ts).
// Never rely on this file alone for authorization.

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "apis_session";
const rawSecret =
  process.env.AUTH_SECRET || "7f9dccdbcb7dfb800ab31561b227f6e05c7ccaf5603d5af748cc82606e735c66031634fea8598cd603a2178438d49615";
const secretKey = new TextEncoder().encode(rawSecret);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

async function readRole(token: string | undefined): Promise<"CEO" | "STAFF" | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === "CEO" || payload.role === "STAFF" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const role = await readRole(token);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  // Not signed in: only the login page (and its API) is reachable.
  if (!role && !isPublic) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Authentication required", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in and hitting /login: bounce to the right home screen.
  if (role && pathname === "/login") {
    return NextResponse.redirect(new URL(role === "CEO" ? "/ceo/dashboard" : "/staff/my-day", request.url));
  }

  // Signed in and hitting root: route to the right home screen.
  if (role && pathname === "/") {
    return NextResponse.redirect(new URL(role === "CEO" ? "/ceo/dashboard" : "/staff/my-day", request.url));
  }

  // The /ceo section is executive-only.
  if (role && pathname.startsWith("/ceo") && role !== "CEO") {
    return NextResponse.redirect(new URL("/staff/my-day", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico)$).*)"],
};
