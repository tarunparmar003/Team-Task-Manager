import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireProjectAdmin, requireProjectMembership } from '../middleware/projectAccess';
import { addMemberSchema, updateMemberRoleSchema } from '../validators/member';
import { BadRequest, Conflict, NotFound } from '../lib/errors';

// Mounted at /api/projects/:projectId/members
const router = Router({ mergeParams: true });

router.use(requireAuth, requireProjectMembership);

// List members
router.get('/', async (req, res, next) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.membership!.projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    res.json({
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Add member by email (admin only)
router.post('/', requireProjectAdmin, async (req, res, next) => {
  try {
    const body = addMemberSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw NotFound('No user found with that email — they need to sign up first');

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.membership!.projectId, userId: user.id } },
    });
    if (existing) throw Conflict('User is already a member of this project');

    const member = await prisma.projectMember.create({
      data: {
        projectId: req.membership!.projectId,
        userId: user.id,
        role: body.role,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({
      member: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        joinedAt: member.joinedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update a member's role (admin only). Guards against demoting the last admin.
router.patch('/:userId', requireProjectAdmin, async (req, res, next) => {
  try {
    const body = updateMemberRoleSchema.parse(req.body);
    const targetUserId = req.params.userId;
    const projectId = req.membership!.projectId;

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) throw NotFound('Member not found');

    if (target.role === 'ADMIN' && body.role === 'MEMBER') {
      const adminCount = await prisma.projectMember.count({
        where: { projectId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw BadRequest('Cannot demote the last admin — promote another member first');
      }
    }

    const updated = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      data: { role: body.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json({
      member: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
        joinedAt: updated.joinedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Remove a member (admin only). Tasks assigned to them are auto-unassigned (Prisma onDelete: SetNull).
router.delete('/:userId', requireProjectAdmin, async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const projectId = req.membership!.projectId;

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) throw NotFound('Member not found');

    if (target.role === 'ADMIN') {
      const adminCount = await prisma.projectMember.count({
        where: { projectId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw BadRequest('Cannot remove the last admin — promote another member first');
      }
    }

    // Unassign their tasks in this project before removing membership
    await prisma.task.updateMany({
      where: { projectId, assignedToId: targetUserId },
      data: { assignedToId: null },
    });

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
