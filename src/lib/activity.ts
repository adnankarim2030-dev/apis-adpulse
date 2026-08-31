import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface LogActivityInput {
  entityType: "PROJECT" | "TASK" | "USER";
  entityId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Every meaningful write in APIS should call this. It backs both the
 * project activity feed (section 23) and the audit trail (section 24) —
 * in Phase 1 they share one table; Phase 3+ can split immutable audit
 * events into their own table without touching call sites.
 */
export async function logActivity(input: LogActivityInput) {
  await prisma.activityLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId,
      taskId: input.taskId,
      actorId: input.actorId,
      action: input.action,
      metadata: input.metadata,
    },
  });
}
