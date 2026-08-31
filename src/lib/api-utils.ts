import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/rbac";

/**
 * Standardized API error envelope. Route handlers should catch and pass
 * errors here rather than leaking stack traces (see ARCHITECTURE.md, backend
 * error handling section).
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message, code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message, code: "FORBIDDEN" }, { status: 403 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: error.flatten() },
      { status: 400 }
    );
  }
  if (error instanceof Error && error.name === "NotFoundError") {
    return NextResponse.json({ error: error.message, code: "NOT_FOUND" }, { status: 404 });
  }

  console.error("[APIS API ERROR]", error);
  const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
