import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireRole, requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { getCeoDashboardData } from "@/lib/queries/dashboard";

export async function GET() {
  try {
    const session = requireSession(await getSession());
    requireRole(session, ["CEO"]);
    const data = await getCeoDashboardData(session);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
