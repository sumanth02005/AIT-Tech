import React from 'react';
import { LogOut, RefreshCw, Server, Shield, UserCheck } from 'lucide-react';
import { DEPARTMENTS } from '../data/seedData';
import { BackendHealth, UserRole, UserSession } from '../types/civiclens';

export type ActiveView = 'auth' | 'submit' | 'track' | 'officer' | 'analytics';

interface HeaderProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  session: UserSession | null;
  onSignOut: () => void;
  health: BackendHealth;
  modePreference: 'auto' | 'demo';
  onToggleModePreference: (mode: 'auto' | 'demo') => void;
  onResetDemo: () => void;
}

export function Header({
  activeView,
  onNavigate,
  session,
  onSignOut,
  health,
  modePreference,
  onToggleModePreference,
  onResetDemo,
}: HeaderProps) {
  const navItems: { id: ActiveView; label: string; allowUnauth?: boolean; roles?: UserRole[] }[] = [
    { id: 'auth', label: 'Sign In', allowUnauth: true },
    { id: 'submit', label: 'Submit Issue', allowUnauth: true, roles: ['citizen'] },
    { id: 'track', label: 'Track Status', allowUnauth: true, roles: ['citizen', 'officer', 'admin'] },
    { id: 'officer', label: 'Officer Desk', roles: ['officer', 'admin'] },
    { id: 'analytics', label: 'Analytics', roles: ['admin'] },
  ];

  const visibleNav = navItems.filter((item) => {
    if (!session) return Boolean(item.allowUnauth);
    return item.roles ? item.roles.includes(session.role) : false;
  });

  const officerDeptName =
    session?.role === 'officer' && session.department_code
      ? DEPARTMENTS.find((d) => d.code === session.department_code)?.name ||
        session.department_code
      : null;

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Strict 3-Zone Top Bar */}
      <header className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() =>
            onNavigate(
              !session
                ? 'auth'
                : session.role === 'citizen'
                ? 'submit'
                : session.role === 'admin'
                ? 'analytics'
                : 'officer'
            )
          }
          className="text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0 cursor-pointer"
        >
          CivicLens
        </button>

        {/* Zone 2: Single-line Role-Aware Navigation Links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {visibleNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-700 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          {session ? (
            <button
              type="button"
              onClick={() =>
                onNavigate(session.role === 'citizen' ? 'submit' : 'track')
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {session.role === 'citizen' ? 'Report Issue' : 'Track Complaint ID'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Mobile Nav Row */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {visibleNav.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Workspace Control Strip (Authenticated Session + Data Provenance Control) */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Authenticated Session Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            {session ? (
              <>
                <span className="text-slate-700">
                  Signed in as <strong className="text-slate-900">{session.full_name}</strong>
                  <span aria-hidden="true"> · </span>
                  <span className="capitalize font-medium text-blue-800">
                    {session.role === 'citizen'
                      ? 'User (Citizen)'
                      : session.role === 'officer'
                      ? 'Dept Officer'
                      : 'City Admin'}
                  </span>
                  {officerDeptName && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="text-slate-600">{officerDeptName}</span>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <span className="text-slate-600">
                Public Visitor · Sign in as User, Officer, or Admin for role-specific access
              </span>
            )}
          </div>

          {/* Right: Live FastAPI vs Demo Provenance Control */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              {health.mode === 'live' ? (
                <span className="text-emerald-700 font-medium">
                  FastAPI + Supabase Connected
                </span>
              ) : (
                <span className="text-amber-800 font-medium">
                  Demo Simulation Mode · FastAPI offline (AI outputs simulated)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onToggleModePreference(modePreference === 'auto' ? 'demo' : 'auto')
                }
                className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
              >
                <UserCheck className="w-3 h-3" />
                <span>{modePreference === 'auto' ? 'Auto-Detect API' : 'Force Demo'}</span>
              </button>

              {health.mode === 'demo' && (
                <button
                  type="button"
                  onClick={onResetDemo}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Seed Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
