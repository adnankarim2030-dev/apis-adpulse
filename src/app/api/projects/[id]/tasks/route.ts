import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { getAuthorizedProject } from "@/lib/authz";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    await getAuthorizedProject(params.id, session); // enforces membership for staff

    const tasks = await prisma.task.findMany({
      where: { projectId: params.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        startDate: true,
        progressPercent: true,
        estimatedHours: true,
        actualHours: true,
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    return handleApiError(error);
  }
}
