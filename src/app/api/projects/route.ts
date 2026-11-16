import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireRole, requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { createProjectSchema } from "@/lib/validators/project";
import { logActivity } from "@/lib/activity";
import { listProjects } from "@/lib/queries/projects";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const { searchParams } = new URL(request.url);

    const projects = await listProjects(session, {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      department: searchParams.get("department") || undefined,
      search: searchParams.get("search") || undefined,
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(await getSession());

    const body = await request.json();
    const input = createProjectSchema.parse(body);
    const { memberIds, startDate, expectedCompletionDate, ...rest } = input;

    // If memberIds not provided, automatically include all active team members
    let finalMemberIds = memberIds;
    if (!finalMemberIds || finalMemberIds.length === 0) {
      const allUsers = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
      finalMemberIds = allUsers.map((u) => u.id);
    }

    // Auto-generate code if omitted (e.g. from quick inline creation)
    let finalCode = rest.code;
    if (!finalCode) {
      const prefix = rest.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PROJ";
      finalCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const project = await prisma.project.create({
      data: {
        ...rest,
        code: finalCode,
        startDate: startDate ? new Date(startDate) : undefined,
        expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
        createdById: session.userId,
        members: {
          create: finalMemberIds.map((userId) => ({ userId })),
        },
      },
      include: { members: true },
    });

    await logActivity({
      entityType: "PROJECT",
      entityId: project.id,
      projectId: project.id,
      actorId: session.userId,
      action: "PROJECT_CREATED",
      metadata: { name: project.name, code: project.code },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
