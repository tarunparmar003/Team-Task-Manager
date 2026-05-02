import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Layout() {
  const { user, signout } = useAuth();

  const navItem =
    'block rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700';
  const navItemActive = 'bg-slate-900 text-white';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="text-lg font-semibold tracking-tight">
                Team Task Manager
              </Link>
              <nav className="hidden gap-1 sm:flex">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/projects"
                  className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}
                >
                  Projects
                </NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-300 sm:inline">
                {user?.name} <span className="text-slate-500">·</span> {user?.email}
              </span>
              <button onClick={signout} className="btn-secondary">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
        Team Task Manager · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
