import React from 'react';
import { RefreshCw, Shield, Server, UserCheck } from 'lucide-react';
import { BackendHealth, UserRole, UserSession } from '../types/civiclens';

export type ActiveView = 'submit' | 'track' | 'officer' | 'analytics';

interface HeaderProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  session: UserSession;
  onRoleChange: (role: UserRole) => void;
  health: BackendHealth;
  modePreference: 'auto' | 'demo';
  onToggleModePreference: (mode: 'auto' | 'demo') => void;
  onResetDemo: () => void;
  unreadNotificationsCount: number;
}

const ROLE_LABELS: Record<UserRole, { name: string; title: string }> = {
  citizen: { name: 'Citizen Reporter', title: 'Public Portal' },
  officer: { name: 'R. Deshmukh', title: 'Municipal Officer' },
  admin: { name: 'Dr. Kavita Rao', title: 'City Administrator' },
};

export function Header({
  activeView,
  onNavigate,
  session,
  onRoleChange,
  health,
  modePreference,
  onToggleModePreference,
  onResetDemo,
  unreadNotificationsCount,
}: HeaderProps) {
  const navItems: { id: ActiveView; label: string; roles: UserRole[] }[] = [
    { id: 'submit', label: 'Submit Issue', roles: ['citizen', 'officer', 'admin'] },
    { id: 'track', label: 'Track Status', roles: ['citizen', 'officer', 'admin'] },
    { id: 'officer', label: 'Officer Desk', roles: ['officer', 'admin'] },
    { id: 'analytics', label: 'Analytics', roles: ['admin', 'officer'] },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(session.role));

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Strict 3-Zone Top Bar */}
      <header className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate(session.role === 'citizen' ? 'submit' : 'officer')}
          className="text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0 cursor-pointer"
        >
          CivicLens
        </button>

        {/* Zone 2: Single-line Navigation Links */}
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
                {item.id === 'track' && unreadNotificationsCount > 0 && (
                  <span className="ml-1.5 text-xs font-mono text-blue-700 tabular-nums">
                    ({unreadNotificationsCount})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('submit')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Report Issue
          </button>
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

      {/* Workspace Control Strip (Role RBAC + Data Provenance Transparency) */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: RBAC Role Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Workspace Role:</span>
            </span>
            <div
              role="group"
              aria-label="Workspace role selector"
              className="inline-flex items-center bg-white border border-slate-200 rounded-md p-0.5"
            >
              {(['citizen', 'officer', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onRoleChange(role)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors whitespace-nowrap cursor-pointer ${
                    session.role === role
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <span className="hidden sm:inline text-slate-500">
              Signed in as <strong className="text-slate-800">{ROLE_LABELS[session.role].name}</strong> ({ROLE_LABELS[session.role].title})
            </span>
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
                  Demo Simulation Mode · FastAPI backend offline (AI outputs simulated)
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
                title="Probe FastAPI /api/v1/health or stay in demo mode"
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
