import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireProjectMembership } from '../middleware/projectAccess';

const router = Router();

// Global dashboard: aggregates across every project the caller belongs to.
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    if (projectIds.length === 0) {
      res.json({
        totalTasks: 0,
        byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
        myAssignedTasks: 0,
        overdueTasks: 0,
      });
      return;
    }

    const [byStatus, myAssigned, overdue, total] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, assignedToId: userId, status: { not: 'DONE' } },
      }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, dueDate: { lt: new Date() }, status: { not: 'DONE' } },
      }),
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
    ]);

    const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 } as Record<string, number>;
    for (const row of byStatus) counts[row.status] = row._count._all;

    res.json({
      totalTasks: total,
      byStatus: counts,
      myAssignedTasks: myAssigned,
      overdueTasks: overdue,
    });
  } catch (err) {
    next(err);
  }
});

// Per-project dashboard
router.get(
  '/projects/:id/dashboard',
  requireAuth,
  requireProjectMembership,
  async (req, res, next) => {
    try {
      const projectId = req.membership!.projectId;

      const [byStatus, byUser, overdue, total] = await Promise.all([
        prisma.task.groupBy({
          by: ['status'],
          where: { projectId },
          _count: { _all: true },
        }),
        prisma.task.groupBy({
          by: ['assignedToId'],
          where: { projectId },
          _count: { _all: true },
        }),
        prisma.task.count({
          where: { projectId, dueDate: { lt: new Date() }, status: { not: 'DONE' } },
        }),
        prisma.task.count({ where: { projectId } }),
      ]);

      const userIds = byUser.map((b) => b.assignedToId).filter((id): id is string => !!id);
      const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 } as Record<string, number>;
      for (const row of byStatus) counts[row.status] = row._count._all;

      res.json({
        totalTasks: total,
        byStatus: counts,
        overdueTasks: overdue,
        tasksPerUser: byUser.map((b) => ({
          user: b.assignedToId ? userMap.get(b.assignedToId) ?? null : null,
          count: b._count._all,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
