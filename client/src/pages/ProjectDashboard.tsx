import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, projectsApi } from '../lib/api';
import { MetricCard } from '../components/MetricCard';

export function ProjectDashboard() {
  const { id = '' } = useParams<{ id: string }>();

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => projectsApi.get(id) });
  const dashQ = useQuery({
    queryKey: ['project-dashboard', id],
    queryFn: () => dashboardApi.project(id),
  });

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${id}`} className="text-sm text-brand-600 hover:text-brand-700">
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Dashboard — {projectQ.data?.name ?? '…'}
        </h1>
      </div>

      {dashQ.isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : dashQ.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total tasks" value={dashQ.data.totalTasks} />
            <MetricCard label="To do" value={dashQ.data.byStatus.TODO} />
            <MetricCard
              label="In progress"
              value={dashQ.data.byStatus.IN_PROGRESS}
              tone="warn"
            />
            <MetricCard label="Done" value={dashQ.data.byStatus.DONE} tone="good" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="text-base font-semibold text-slate-900">Overdue tasks</h2>
              <div className="mt-2 text-4xl font-semibold text-red-600">
                {dashQ.data.overdueTasks}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Past due date and not yet marked done.
              </p>
            </div>

            <div className="card p-5">
              <h2 className="text-base font-semibold text-slate-900">Tasks per user</h2>
              {dashQ.data.tasksPerUser.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No tasks yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dashQ.data.tasksPerUser.map((row, i) => (
                    <li
                      key={row.user?.id ?? `unassigned-${i}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700">
                        {row.user ? row.user.name : <em className="text-slate-400">Unassigned</em>}
                      </span>
                      <span className="font-medium text-slate-900">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
