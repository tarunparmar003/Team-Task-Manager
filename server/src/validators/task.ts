import { z } from 'zod';

const isoDate = z
  .string()
  .datetime({ message: 'dueDate must be an ISO-8601 datetime string' })
  .optional()
  .nullable();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: isoDate,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  assignedToId: z.string().uuid().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: isoDate,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
});

export const taskFiltersSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assignedToId: z.string().uuid().optional(),
  overdue: z.enum(['true', 'false']).optional(),
});
