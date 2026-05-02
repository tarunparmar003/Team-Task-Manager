import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireProjectMembership } from '../middleware/projectAccess';
import { createTaskSchema, updateTaskSchema, taskFiltersSchema } from '../validators/task';
import { BadRequest, Forbidden, NotFound } from '../lib/errors';

// Project-scoped task routes — mounted at /api/projects/:projectId/tasks
export const projectTaskRouter = Router({ mergeParams: true });

projectTaskRouter.use(requireAuth, requireProjectMembership);

// Verify an assignee belongs to this project before assigning
async function ensureAssigneeInProject(projectId: string, userId: string | null | undefined) {
  if (!userId) return;
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  });
  if (!m) throw BadRequest('Assignee must be a member of this project');
}

projectTaskRouter.get('/', async (req, res, next) => {
  try {
    const filters = taskFiltersSchema.parse(req.query);
    const where: Prisma.TaskWhereInput = { projectId: req.membership!.projectId };
    if (filters.status) where.status = filters.status;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'DONE' };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

projectTaskRouter.post('/', async (req, res, next) => {
  try {
    const body = createTaskSchema.parse(req.body);
    await ensureAssigneeInProject(req.membership!.projectId, body.assignedToId);

    const task = await prisma.task.create({
      data: {
        projectId: req.membership!.projectId,
        title: body.title,
        description: body.description ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority,
        status: body.status,
        assignedToId: body.assignedToId ?? null,
        createdById: req.user!.sub,
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

// Standalone task router — mounted at /api/tasks
export const taskRouter = Router();
taskRouter.use(requireAuth);

async function loadTaskWithMembership(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });
  if (!task) throw NotFound('Task not found');
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: task.projectId, userId } },
    select: { role: true },
  });
  if (!membership) throw Forbidden('You are not a member of this project');
  return { task, role: membership.role };
}

taskRouter.get('/:id', async (req, res, next) => {
  try {
    const { task } = await loadTaskWithMembership(req.params.id, req.user!.sub);
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

taskRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = updateTaskSchema.parse(req.body);
    const { task, role } = await loadTaskWithMembership(req.params.id, req.user!.sub);

    const isAdmin = role === 'ADMIN';
    const isAssignee = task.assignedToId === req.user!.sub;

    if (!isAdmin) {
      // Members can only update status, and only on tasks assigned to them
      const requestedFields = Object.keys(body) as (keyof typeof body)[];
      const onlyStatus = requestedFields.length === 1 && requestedFields[0] === 'status';
      if (!onlyStatus) throw Forbidden('Only admins can edit task fields other than status');
      if (!isAssignee) throw Forbidden('You can only update status on tasks assigned to you');
    }

    if (body.assignedToId !== undefined) {
      await ensureAssigneeInProject(task.projectId, body.assignedToId);
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        ...body,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

taskRouter.delete('/:id', async (req, res, next) => {
  try {
    const { task, role } = await loadTaskWithMembership(req.params.id, req.user!.sub);
    const isAdmin = role === 'ADMIN';
    const isCreator = task.createdById === req.user!.sub;
    if (!isAdmin && !isCreator) throw Forbidden('Only admins or the task creator can delete a task');

    await prisma.task.delete({ where: { id: task.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
