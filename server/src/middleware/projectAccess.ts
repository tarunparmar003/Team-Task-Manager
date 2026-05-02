import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { Forbidden, NotFound, Unauthorized } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      membership?: { id: string; projectId: string; userId: string; role: Role };
    }
  }
}

/**
 * Loads the caller's ProjectMember row for `:projectId` (or `:id` on the projects route)
 * and attaches it as `req.membership`. 404s if project doesn't exist; 403s if not a member.
 */
export async function requireProjectMembership(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) return next(Unauthorized());
  const projectId = req.params.projectId ?? req.params.id;
  if (!projectId) return next(NotFound('Project id missing in route'));

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return next(NotFound('Project not found'));

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.sub } },
    select: { id: true, projectId: true, userId: true, role: true },
  });
  if (!membership) return next(Forbidden('You are not a member of this project'));

  req.membership = membership;
  return next();
}

export function requireProjectAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.membership) return next(Forbidden());
  if (req.membership.role !== 'ADMIN') {
    return next(Forbidden('Admin role required'));
  }
  return next();
}
