import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireProjectAdmin, requireProjectMembership } from '../middleware/projectAccess';
import { createProjectSchema, updateProjectSchema } from '../validators/project';
import { NotFound } from '../lib/errors';

const router = Router();

router.use(requireAuth);

// List all projects the caller is a member of
router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user!.sub },
      include: {
        project: {
          include: {
            _count: { select: { tasks: true, members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json({
      projects: memberships.map((m) => ({
        id: m.project.id,
        name: m.project.name,
        description: m.project.description,
        role: m.role,
        memberCount: m.project._count.members,
        taskCount: m.project._count.tasks,
        createdAt: m.project.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Create a project — caller becomes ADMIN
router.post('/', async (req, res, next) => {
  try {
    const body = createProjectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        createdById: req.user!.sub,
        members: {
          create: { userId: req.user!.sub, role: 'ADMIN' },
        },
      },
    });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// Project detail (members get a view)
router.get('/:id', requireProjectMembership, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.membership!.projectId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { tasks: true } },
      },
    });
    if (!project) throw NotFound('Project not found');
    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        myRole: req.membership!.role,
        taskCount: project._count.tasks,
        members: project.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update project (admin only)
router.patch('/:id', requireProjectMembership, requireProjectAdmin, async (req, res, next) => {
  try {
    const body = updateProjectSchema.parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.membership!.projectId },
      data: body,
    });
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// Delete project (admin only)
router.delete('/:id', requireProjectMembership, requireProjectAdmin, async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.membership!.projectId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
