import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireRole, requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { createStaffSchema } from "@/lib/validators/staff";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { listStaffWithWorkload } from "@/lib/queries/staff";

export async function GET() {
  try {
    const session = requireSession(await getSession());
    requireRole(session, ["CEO"]);

    const data = await listStaffWithWorkload();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    requireRole(session, ["CEO"]);

    const body = await request.json();
    const input = createStaffSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists", code: "EMAIL_TAKEN" }, { status: 409 });
    }

    const passwordHash = await hashPassword(input.password);
    const staff = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: "STAFF",
        department: input.department,
        jobTitle: input.jobTitle,
      },
      select: { id: true, name: true, email: true, department: true, jobTitle: true },
    });

    await logActivity({
      entityType: "USER",
      entityId: staff.id,
      actorId: session.userId,
      action: "STAFF_ACCOUNT_CREATED",
      metadata: { staffId: staff.id, email: staff.email },
    });

    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
