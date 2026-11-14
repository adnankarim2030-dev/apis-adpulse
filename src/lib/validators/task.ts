import { z } from "zod";

const priorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const taskStatusEnum = z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]);

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2, "Task title is required"),
  description: z.string().max(4000).optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  priority: priorityEnum.optional(),
  status: taskStatusEnum.optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).max(2000).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  actualHours: z.number().min(0).max(2000).optional().nullable(),
  progressPercent: z.number().int().min(0).max(100).optional(),
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

export const updateTaskProgressSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
