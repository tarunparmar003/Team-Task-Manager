import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, membersApi, projectsApi } from '../lib/api';
import type { Role } from '../types';

export function ProjectMembers() {
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => projectsApi.get(id) });
  const membersQ = useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.list(id),
  });

  const isAdmin = projectQ.data?.myRole === 'ADMIN';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [error, setError] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: () => membersApi.add(id, { email, role }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['members', id] });
      await qc.invalidateQueries({ queryKey: ['project', id] });
      setEmail('');
      setRole('MEMBER');
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const roleMut = useMutation({
    mutationFn: (vars: { userId: string; role: Role }) =>
      membersApi.updateRole(id, vars.userId, vars.role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['members', id] });
    },
    onError: (err) => alert(apiErrorMessage(err)),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => membersApi.remove(id, userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['members', id] });
      await qc.invalidateQueries({ queryKey: ['project', id] });
    },
    onError: (err) => alert(apiErrorMessage(err)),
  });

  function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    addMut.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${id}`} className="text-sm text-brand-600 hover:text-brand-700">
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Members</h1>
        <p className="mt-1 text-sm text-slate-500">{projectQ.data?.name}</p>
      </div>

      {isAdmin && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">Add a member</h2>
          <p className="mt-1 text-xs text-slate-500">
            The user must already have an account on Team Task Manager.
          </p>
          <form onSubmit={onAdd} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              type="email"
              required
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="input"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" disabled={addMut.isPending} className="btn-primary">
              {addMut.isPending ? 'Adding…' : 'Add'}
            </button>
            {error && <div className="sm:col-span-3 text-sm text-red-600">{error}</div>}
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
              {isAdmin && <th className="px-5 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {membersQ.data?.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 font-medium text-slate-900">{m.name}</td>
                <td className="px-5 py-3 text-slate-600">{m.email}</td>
                <td className="px-5 py-3">
                  {isAdmin ? (
                    <select
                      value={m.role}
                      onChange={(e) =>
                        roleMut.mutate({ userId: m.id, role: e.target.value as Role })
                      }
                      className="input py-1 text-xs"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={
                        m.role === 'ADMIN'
                          ? 'badge bg-brand-50 text-brand-700'
                          : 'badge bg-slate-100 text-slate-600'
                      }
                    >
                      {m.role}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-500">
                  {new Date(m.joinedAt).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${m.name} from this project?`)) {
                          removeMut.mutate(m.id);
                        }
                      }}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {membersQ.data && membersQ.data.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-5 py-6 text-center text-slate-500">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
