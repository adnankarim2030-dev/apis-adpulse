import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { getStaffDashboardData } from "@/lib/queries/dashboard";

export async function GET() {
  try {
    const session = requireSession(await getSession());
    const data = await getStaffDashboardData(session);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
