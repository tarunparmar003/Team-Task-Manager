import { useQuery } from '@tanstack/react-query';
import { dashboardApi, projectsApi } from '../lib/api';
import { MetricCard } from '../components/MetricCard';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const dashQ = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.global });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          A snapshot of work across all your projects.
        </p>
      </div>

      {dashQ.isLoading ? (
        <div className="text-slate-500">Loading metrics…</div>
      ) : dashQ.isError ? (
        <div className="text-red-600">Failed to load metrics.</div>
      ) : dashQ.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total tasks" value={dashQ.data.totalTasks} />
          <MetricCard label="In progress" value={dashQ.data.byStatus.IN_PROGRESS} tone="warn" />
          <MetricCard label="Assigned to me" value={dashQ.data.myAssignedTasks} />
          <MetricCard label="Overdue" value={dashQ.data.overdueTasks} tone="bad" />
        </div>
      ) : null}

      {dashQ.data && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">Status breakdown</h2>
          <div className="mt-4 space-y-3">
            {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((s) => {
              const count = dashQ.data.byStatus[s];
              const total = dashQ.data.totalTasks || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{statusLabel(s)}</span>
                    <span className="text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${statusBar(s)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your projects</h2>
          <Link to="/projects" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        {projectsQ.isLoading ? (
          <div className="mt-4 text-slate-500">Loading…</div>
        ) : projectsQ.data && projectsQ.data.length === 0 ? (
          <div className="mt-4 card p-6 text-center text-slate-500">
            You're not in any projects yet.{' '}
            <Link to="/projects" className="font-medium text-brand-600">
              Create one
            </Link>
            .
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectsQ.data?.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="card block p-4 transition hover:ring-brand-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{p.name}</span>
                    <span className={p.role === 'ADMIN' ? 'badge bg-brand-50 text-brand-700' : 'badge bg-slate-100 text-slate-600'}>
                      {p.role}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {p.taskCount} tasks · {p.memberCount} members
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: 'TODO' | 'IN_PROGRESS' | 'DONE'): string {
  return s === 'TODO' ? 'To do' : s === 'IN_PROGRESS' ? 'In progress' : 'Done';
}
function statusBar(s: 'TODO' | 'IN_PROGRESS' | 'DONE'): string {
  return s === 'TODO' ? 'bg-slate-400' : s === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-emerald-500';
}
