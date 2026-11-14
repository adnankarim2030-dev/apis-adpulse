import { z } from "zod";

const priorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const statusEnum = z.enum([
  "PLANNING",
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "AT_RISK",
  "DELAYED",
  "COMPLETED",
  "CANCELLED",
]);

export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  code: z
    .string()
    .min(2, "Project code is required")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only"),
  clientId: z.string().uuid().optional().nullable(),
  projectManagerId: z.string().uuid().optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  expectedCompletionDate: z.string().datetime().optional().nullable(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  description: z.string().max(4000).optional().nullable(),
  objectives: z.string().max(4000).optional().nullable(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  progressPercent: z.number().int().min(0).max(100).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
