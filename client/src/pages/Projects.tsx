import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiErrorMessage, projectsApi } from '../lib/api';

export function Projects() {
  const qc = useQueryClient();
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (data: { name: string; description?: string }) => projectsApi.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['projects'] });
      setName('');
      setDescription('');
      setShowCreate(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMut.mutate({ name, description: description || undefined });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New project
        </button>
      </div>

      {projectsQ.isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : projectsQ.data && projectsQ.data.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create one to start tracking work.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsQ.data?.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.id}`}
                className="card block p-5 transition hover:ring-brand-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    {p.description && (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <span
                    className={
                      p.role === 'ADMIN'
                        ? 'badge bg-brand-50 text-brand-700'
                        : 'badge bg-slate-100 text-slate-600'
                    }
                  >
                    {p.role}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span>{p.taskCount} tasks</span>
                  <span>·</span>
                  <span>{p.memberCount} members</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Create project">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input mt-1 min-h-[80px]"
              />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={createMut.isPending} className="btn-primary">
                {createMut.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
