import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireRole, requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { updateProjectSchema } from "@/lib/validators/project";
import { getAuthorizedProject } from "@/lib/authz";
import { logActivity } from "@/lib/activity";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    const project = await getAuthorizedProject(params.id, session);
    return NextResponse.json({ data: project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    requireRole(session, ["CEO"]);
    await getAuthorizedProject(params.id, session); // 404s if it doesn't exist

    const body = await request.json();
    const input = updateProjectSchema.parse(body);
    const { memberIds, startDate, expectedCompletionDate, ...rest } = input;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
        ...(memberIds
          ? {
              members: {
                deleteMany: {},
                create: memberIds.map((userId) => ({ userId })),
              },
            }
          : {}),
      },
    });

    await logActivity({
      entityType: "PROJECT",
      entityId: project.id,
      projectId: project.id,
      actorId: session.userId,
      action: "PROJECT_UPDATED",
      metadata: { changes: Object.keys(rest) },
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    requireRole(session, ["CEO"]);
    await getAuthorizedProject(params.id, session);

    // Soft delete only — section 25/55 forbid hard-deleting business records
    // without explicit, separate authorization.
    await prisma.project.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

    await logActivity({
      entityType: "PROJECT",
      entityId: params.id,
      projectId: params.id,
      actorId: session.userId,
      action: "PROJECT_ARCHIVED",
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
