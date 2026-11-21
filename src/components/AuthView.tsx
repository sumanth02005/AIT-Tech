import React, { useState } from 'react';
import {
  Building2,
  KeyRound,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  User,
  UserCog,
} from 'lucide-react';
import { DEPARTMENTS } from '../data/seedData';
import { UserRole } from '../types/civiclens';

export type OAuthProvider = 'google' | 'municipal_sso';

interface AuthViewProps {
  backendMode: 'live' | 'demo';
  onLogin: (params: {
    role: UserRole;
    email: string;
    password: string;
    department_code?: string;
    isDemoQuickLogin?: boolean;
  }) => Promise<void>;
  onSignup: (params: {
    role: UserRole;
    full_name: string;
    email: string;
    password: string;
    department_code?: string;
  }) => Promise<void>;
  onOAuthClick: (
    provider: OAuthProvider,
    role: UserRole,
    department_code?: string
  ) => Promise<void>;
  onOpenPublicTracker: () => void;
}

const ROLE_OPTIONS: {
  id: UserRole;
  label: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'citizen',
    label: 'User (Citizen)',
    subtitle: 'Report issues & track your complaint ID',
    Icon: User,
  },
  {
    id: 'officer',
    label: 'Dept Officer',
    subtitle: 'Department-scoped triage & field resolution',
    Icon: ShieldCheck,
  },
  {
    id: 'admin',
    label: 'City Admin',
    subtitle: 'All departments, SLA analytics & final closure',
    Icon: UserCog,
  },
];

export function AuthView({
  backendMode,
  onLogin,
  onSignup,
  onOAuthClick,
  onOpenPublicTracker,
}: AuthViewProps) {
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('citizen');
  const [departmentCode, setDepartmentCode] = useState<string>(DEPARTMENTS[0].code);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOauthNotice(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }
    if (authTab === 'signup' && !fullName.trim()) {
      setError('Please enter your full name to create an account.');
      return;
    }

    setBusy(true);
    try {
      if (authTab === 'login') {
        await onLogin({
          role: selectedRole,
          email: email.trim(),
          password,
          department_code: selectedRole === 'officer' ? departmentCode : undefined,
        });
      } else {
        await onSignup({
          role: selectedRole,
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          department_code: selectedRole === 'officer' ? departmentCode : undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setOauthNotice(null);
    setBusy(true);
    try {
      await onOAuthClick(
        provider,
        selectedRole,
        selectedRole === 'officer' ? departmentCode : undefined
      );
      if (backendMode === 'demo') {
        setOauthNotice(
          `OAuth provider (${
            provider === 'google' ? 'Google' : 'Municipal SSO'
          }) is wired for /api/v1/auth/oauth/${provider}. Connect your FastAPI/Supabase OAuth credentials to redirect users automatically.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth sign-in unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoQuickLogin(role: UserRole) {
    setError(null);
    setOauthNotice(null);
    setBusy(true);
    try {
      await onLogin({
        role,
        email:
          role === 'citizen'
            ? 'citizen@civiclens.local'
            : role === 'officer'
            ? 'deshmukh.eng@city.gov'
            : 'commissioner@city.gov',
        password: 'demo-session',
        department_code: role === 'officer' ? departmentCode : undefined,
        isDemoQuickLogin: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Context Column */}
        <div className="lg:col-span-5 space-y-6 pt-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-balance">
              CivicLens Municipal Portal
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Sign in as a Citizen User, Department Officer, or City Administrator to submit civic hazards, inspect multimodal AI triage, or monitor city-wide SLAs.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Role Access Boundaries
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <div className="font-semibold text-slate-900">User (Citizen)</div>
                <p className="text-slate-600 mt-0.5">
                  Submit multilingual complaints with EXIF/GPS pins and track personal or entered Complaint IDs.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-100">
                <div className="font-semibold text-slate-900">Department Officer</div>
                <p className="text-slate-600 mt-0.5">
                  Tactical triage queue & map scoped strictly to your assigned department, duplicate verification, and field resolution up to RESOLVED.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-100">
                <div className="font-semibold text-slate-900">City Administrator</div>
                <p className="text-slate-600 mt-0.5">
                  Cross-department visibility across all 6 units, Analytics & Hotspot console, AI override governance, and final CLOSED sign-off.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-700">
              <div className="font-semibold text-slate-900">
                Have a Complaint ID already?
              </div>
              <div>Check status publicly without signing in.</div>
            </div>
            <button
              type="button"
              onClick={onOpenPublicTracker}
              className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track ID</span>
            </button>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          {/* Login / Sign Up Switch */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="inline-flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setError(null);
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signup');
                  setError(null);
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  authTab === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            <span className="text-xs font-mono text-slate-500">
              {backendMode === 'live' ? 'FastAPI Auth Ready' : 'Demo Auth Fallback'}
            </span>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              1. Select Account Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.Icon;
                const active = selectedRole === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedRole(opt.id)}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-700 bg-blue-50/70'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          active ? 'text-blue-950' : 'text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                      {opt.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Assignment when logging in as Officer */}
          {selectedRole === 'officer' && (
            <div>
              <label
                htmlFor="officer-department"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Assigned Municipal Department (Officer Scope)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  id="officer-department"
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              {error}
            </div>
          )}

          {oauthNotice && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
              {oauthNotice}
            </div>
          )}

          {/* OAuth Provider Elements (Prepared for Backend Integration) */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-700">
              2. OAuth Single Sign-On (Backend Integration Slot)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleOAuth('google')}
                data-oauth-provider="google"
                className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleOAuth('municipal_sso')}
                data-oauth-provider="municipal_sso"
                className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Continue with Municipal SSO</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              or credentials
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authTab === 'signup' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === 'citizen'
                      ? 'citizen@example.org'
                      : selectedRole === 'officer'
                      ? 'officer@city.gov'
                      : 'admin@city.gov'
                  }
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              {authTab === 'login'
                ? `Sign In as ${
                    ROLE_OPTIONS.find((r) => r.id === selectedRole)?.label
                  }`
                : `Create ${
                    ROLE_OPTIONS.find((r) => r.id === selectedRole)?.label
                  } Account`}
            </button>
          </form>

          {/* Demo Instant Access */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="text-xs font-medium text-slate-500">
              Quick Demo Access (Simulated Local Session):
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDemoQuickLogin('citizen')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded-md text-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Demo User (Citizen)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDemoQuickLogin('officer')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded-md text-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Demo Officer ({departmentCode})
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDemoQuickLogin('admin')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded-md text-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Demo City Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
