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
    requireRole(session, ["CEO"]);

    const body = await request.json();
    const input = createProjectSchema.parse(body);
    const { memberIds, startDate, expectedCompletionDate, ...rest } = input;

    const project = await prisma.project.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
        createdById: session.userId,
        members: memberIds?.length
          ? { create: memberIds.map((userId) => ({ userId })) }
          : undefined,
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
