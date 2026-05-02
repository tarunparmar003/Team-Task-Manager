import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, projectsApi, tasksApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Priority, Status, Task } from '../types';

const STATUSES: Status[] = ['TODO', 'IN_PROGRESS', 'DONE'];
const STATUS_LABELS: Record<Status, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};
const PRIORITY_BADGE: Record<Priority, string> = {
  LOW: 'badge bg-slate-100 text-slate-600',
  MEDIUM: 'badge bg-amber-50 text-amber-700',
  HIGH: 'badge bg-red-50 text-red-700',
};

export function ProjectDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => projectsApi.get(id) });
  const tasksQ = useQuery({ queryKey: ['tasks', id], queryFn: () => tasksApi.list(id) });

  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = projectQ.data?.myRole === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {projectQ.data?.name ?? 'Loading…'}
            </h1>
            {projectQ.data && (
              <span
                className={
                  projectQ.data.myRole === 'ADMIN'
                    ? 'badge bg-brand-50 text-brand-700'
                    : 'badge bg-slate-100 text-slate-600'
                }
              >
                {projectQ.data.myRole}
              </span>
            )}
          </div>
          {projectQ.data?.description && (
            <p className="mt-1 text-sm text-slate-500">{projectQ.data.description}</p>
          )}
          <div className="mt-2 flex gap-3 text-sm">
            <Link to={`/projects/${id}/members`} className="text-brand-600 hover:text-brand-700">
              Members ({projectQ.data?.members.length ?? 0})
            </Link>
            <span className="text-slate-300">·</span>
            <Link to={`/projects/${id}/dashboard`} className="text-brand-600 hover:text-brand-700">
              Dashboard
            </Link>
          </div>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          + New task
        </button>
      </div>

      {tasksQ.isLoading ? (
        <div className="text-slate-500">Loading tasks…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {STATUSES.map((s) => {
            const items = (tasksQ.data ?? []).filter((t) => t.status === s);
            return (
              <div key={s} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    {STATUS_LABELS[s]}
                  </h2>
                  <span className="text-xs text-slate-500">{items.length}</span>
                </div>
                <ul className="space-y-2">
                  {items.length === 0 && (
                    <li className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                      No tasks
                    </li>
                  )}
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-md border border-slate-200 bg-white p-3 hover:border-brand-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            onClick={() => setEditing(t)}
                            className="text-left text-sm font-medium text-slate-900 hover:text-brand-700"
                          >
                            {t.title}
                          </button>
                          {t.description && (
                            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>
                        <span className={PRIORITY_BADGE[t.priority]}>{t.priority}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{t.assignedTo ? `@${t.assignedTo.name}` : 'Unassigned'}</span>
                        {t.dueDate && (
                          <span className={isOverdue(t) ? 'text-red-600 font-medium' : ''}>
                            {formatDue(t.dueDate)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && projectQ.data && (
        <TaskModal
          projectId={id}
          existing={editing}
          members={projectQ.data.members}
          isAdmin={isAdmin}
          isAssignee={!!editing && editing.assignedToId === user?.id}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ['tasks', id] });
            await qc.invalidateQueries({ queryKey: ['dashboard'] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function isOverdue(t: Task) {
  if (!t.dueDate || t.status === 'DONE') return false;
  return new Date(t.dueDate).getTime() < Date.now();
}
function formatDue(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface TaskModalProps {
  projectId: string;
  existing: Task | null;
  members: Array<{ id: string; name: string; email: string }>;
  isAdmin: boolean;
  isAssignee: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function TaskModal({
  projectId,
  existing,
  members,
  isAdmin,
  isAssignee,
  onClose,
  onSaved,
}: TaskModalProps) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [dueDate, setDueDate] = useState(
    existing?.dueDate ? existing.dueDate.slice(0, 10) : '',
  );
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<Status>(existing?.status ?? 'TODO');
  const [assignedToId, setAssignedToId] = useState<string>(existing?.assignedToId ?? '');
  const [error, setError] = useState<string | null>(null);

  // Members can only update status on tasks assigned to them; everything else is admin-only
  const canEditFields = !existing || isAdmin;
  const canChangeStatus = isAdmin || isAssignee || !existing;

  const create = useMutation({
    mutationFn: () =>
      tasksApi.create(projectId, {
        title,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        status,
        assignedToId: assignedToId || null,
      } as never),
    onSuccess: onSaved,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const update = useMutation({
    mutationFn: () => {
      if (!existing) throw new Error('No task');
      const patch: Record<string, unknown> = {};
      if (canEditFields) {
        patch.title = title;
        patch.description = description || null;
        patch.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
        patch.priority = priority;
        patch.assignedToId = assignedToId || null;
      }
      if (canChangeStatus) patch.status = status;
      return tasksApi.update(existing.id, patch);
    },
    onSuccess: onSaved,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!existing) throw new Error('No task');
      return tasksApi.remove(existing.id);
    },
    onSuccess: onSaved,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (existing) update.mutate();
    else create.mutate();
  }

  const submitting = create.isPending || update.isPending || remove.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {existing ? 'Edit task' : 'New task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input
              required
              disabled={!canEditFields}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              disabled={!canEditFields}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1 min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Due date</label>
              <input
                type="date"
                disabled={!canEditFields}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Priority</label>
              <select
                disabled={!canEditFields}
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="input mt-1"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                disabled={!canChangeStatus}
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="input mt-1"
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Assignee</label>
              <select
                disabled={!canEditFields}
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="input mt-1"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!canEditFields && (
            <p className="text-xs text-slate-500">
              Only admins can edit task fields. You can update status on tasks assigned to you.
            </p>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center justify-between pt-2">
            <div>
              {existing && isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this task?')) remove.mutate();
                  }}
                  className="btn-danger"
                  disabled={submitting}
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving…' : existing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
