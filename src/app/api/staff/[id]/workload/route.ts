import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireSession, ForbiddenError } from "@/lib/rbac";
import { handleApiError, NotFoundError } from "@/lib/api-utils";
import { getStaffWorkloadDetail } from "@/lib/queries/staff";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    if (session.role !== "CEO" && session.userId !== params.id) {
      throw new ForbiddenError("You can only view your own workload");
    }

    const detail = await getStaffWorkloadDetail(params.id);
    if (!detail) throw new NotFoundError("Staff member not found");

    return NextResponse.json({ data: detail });
  } catch (error) {
    return handleApiError(error);
  }
}
