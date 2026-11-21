import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnalyticsMonitoringView } from './components/AnalyticsMonitoringView';
import { AuthView, OAuthProvider } from './components/AuthView';
import { CitizenIntakeView } from './components/CitizenIntakeView';
import { CitizenTrackerView } from './components/CitizenTrackerView';
import { ActiveView, Header } from './components/Header';
import { OfficerDashboardView } from './components/OfficerDashboardView';
import { TicketInspectionDrawer } from './components/TicketInspectionDrawer';
import { apiClient, sortTicketsByPriority } from './services/apiClient';
import {
  BackendHealth,
  CitizenNotification,
  ComplaintCategory,
  CreateComplaintPayload,
  PipelineStage,
  Ticket,
  TicketSeverity,
  TicketStatus,
  UserRole,
  UserSession,
} from './types/civiclens';

const INITIAL_HEALTH: BackendHealth = {
  mode: 'demo',
  backend_reachable: false,
  fastapi_status: 'unreachable',
  services: {
    supabase_postgis: false,
    pgvector: false,
    celery_redis: false,
    gemini_pro: false,
    laya_decisions: false,
    sentence_transformers: false,
  },
  checked_at: new Date().toISOString(),
};

const MY_SUBMISSIONS_KEY = 'civiclens_my_submissions_v1';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('auth');
  const [modePreference, setModePreference] = useState<'auto' | 'demo'>('auto');
  const [health, setHealth] = useState<BackendHealth>(INITIAL_HEALTH);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketCode, setSelectedTicketCode] = useState<string | null>(null);
  const [trackerQueryCode, setTrackerQueryCode] = useState<string>('');
  const [mySubmittedCodes, setMySubmittedCodes] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(MY_SUBMISSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  }, []);

  const loadWorkspaceData = useCallback(
    async (pref: 'auto' | 'demo') => {
      setLoadingTickets(true);
      try {
        const nextHealth = await apiClient.checkHealth(pref);
        setHealth(nextHealth);
        const [loadedTickets, loadedNotifs] = await Promise.all([
          apiClient.fetchTickets(nextHealth.mode),
          apiClient.fetchNotifications(nextHealth.mode),
        ]);
        setTickets(loadedTickets);
        setNotifications(loadedNotifs);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Unable to refresh workspace data.'
        );
      } finally {
        setLoadingTickets(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadWorkspaceData(modePreference);
  }, [loadWorkspaceData, modePreference]);

  function routeAfterAuth(role: UserRole) {
    if (role === 'citizen') setActiveView('submit');
    else if (role === 'officer') setActiveView('officer');
    else setActiveView('analytics');
  }

  async function handleLogin(params: {
    role: UserRole;
    email: string;
    password: string;
    department_code?: string;
    isDemoQuickLogin?: boolean;
  }) {
    const loggedIn = await apiClient.login(params, health.mode);
    setSession(loggedIn);
    setSelectedTicketCode(null);
    routeAfterAuth(loggedIn.role);
    showToast(
      `Signed in as ${loggedIn.full_name} (${loggedIn.role.toUpperCase()})`
    );
  }

  async function handleSignup(params: {
    role: UserRole;
    full_name: string;
    email: string;
    password: string;
    department_code?: string;
  }) {
    const created = await apiClient.signup(params, health.mode);
    setSession(created);
    setSelectedTicketCode(null);
    routeAfterAuth(created.role);
    showToast(`Account created for ${created.full_name}`);
  }

  async function handleOAuthClick(
    provider: OAuthProvider,
    role: UserRole,
    departmentCode?: string
  ) {
    const res = await apiClient.initiateOAuth(
      provider,
      role,
      departmentCode,
      health.mode
    );
    if (res.redirectUrl) {
      window.location.assign(res.redirectUrl);
    }
  }

  function handleSignOut() {
    setSession(null);
    setSelectedTicketCode(null);
    setActiveView('auth');
    showToast('Signed out.');
  }

  async function handleSubmitComplaint(
    payload: CreateComplaintPayload,
    onStageChange: (stage: PipelineStage) => void
  ) {
    const res = await apiClient.submitComplaint(payload, health.mode, onStageChange);
    const updatedTickets = await apiClient.fetchTickets(health.mode);
    const updatedNotifs = await apiClient.fetchNotifications(health.mode);
    setTickets(updatedTickets);
    setNotifications(updatedNotifs);

    setMySubmittedCodes((prev) => {
      const next = [res.complaint.complaint_code, ...prev].slice(0, 8);
      try {
        sessionStorage.setItem(MY_SUBMISSIONS_KEY, JSON.stringify(next));
      } catch {
        // Ignore sessionStorage errors
      }
      return next;
    });

    showToast(
      res.duplicate_outcome === 'likely_duplicate'
        ? `Linked ${res.complaint.complaint_code} to active ticket ${res.ticket.ticket_code}`
        : `Created ticket ${res.ticket.ticket_code} (${res.ticket.severity.toUpperCase()})`
    );
    return res;
  }

  async function handleTransitionStatus(
    ticketCode: string,
    nextStatus: TicketStatus,
    options?: {
      assigned_officer?: string;
      resolution_notes?: string;
      resolution_image_url?: string;
    }
  ) {
    if (!session) return;
    const updated = await apiClient.transitionStatus(
      ticketCode,
      nextStatus,
      session.full_name,
      session.role,
      health.mode,
      options
    );
    setTickets((prev) =>
      sortTicketsByPriority(
        prev.map((t) => (t.ticket_code === ticketCode ? updated : t))
      )
    );
    const nextNotifs = await apiClient.fetchNotifications(health.mode);
    setNotifications(nextNotifs);
    showToast(`Ticket ${ticketCode} updated to ${nextStatus}`);
  }

  async function handleOverrideDecision(
    ticketCode: string,
    updates: {
      severity?: TicketSeverity;
      category?: ComplaintCategory;
      department_code?: string;
      reason: string;
    }
  ) {
    if (!session) return;
    const updated = await apiClient.overrideDecision(
      ticketCode,
      updates,
      session.full_name,
      session.role,
      health.mode
    );
    setTickets((prev) =>
      sortTicketsByPriority(
        prev.map((t) => (t.ticket_code === ticketCode ? updated : t))
      )
    );
    showToast(`Audited override recorded on ${ticketCode}`);
  }

  async function handleResolveDuplicate(
    ticketCode: string,
    matchId: string,
    decision: 'confirm_merge' | 'keep_separate'
  ) {
    if (!session) return;
    const updatedList = await apiClient.resolveDuplicateMatch(
      ticketCode,
      matchId,
      decision,
      session.full_name,
      session.role,
      health.mode
    );
    setTickets(updatedList);
    if (decision === 'confirm_merge') {
      setSelectedTicketCode(null);
      showToast(`Confirmed duplicate merge and preserved citizen complaint record.`);
    } else {
      showToast(`Rejected duplicate suggestion; kept as independent incident.`);
    }
  }

  function handleResetDemo() {
    const reset = apiClient.resetDemoState();
    setTickets(reset);
    setSelectedTicketCode(null);
    apiClient.fetchNotifications('demo').then(setNotifications);
    showToast('Demo dataset reset to initial realistic incidents.');
  }

  function handleMarkNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.ticket_code === selectedTicketCode) ?? null,
    [tickets, selectedTicketCode]
  );

  const analyticsOverview = useMemo(
    () => apiClient.computeAnalytics(tickets),
    [tickets]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== 'officer') setSelectedTicketCode(null);
        }}
        session={session}
        onSignOut={handleSignOut}
        health={health}
        modePreference={modePreference}
        onToggleModePreference={(mode) => setModePreference(mode)}
        onResetDemo={handleResetDemo}
      />

      <main className="flex-1">
        {activeView === 'auth' && (
          <AuthView
            backendMode={health.mode}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onOAuthClick={handleOAuthClick}
            onOpenPublicTracker={() => {
              setTrackerQueryCode('');
              setActiveView('track');
            }}
          />
        )}

        {activeView === 'submit' && (
          <CitizenIntakeView
            mode={health.mode}
            onSubmitComplaint={handleSubmitComplaint}
            onOpenTracker={(code) => {
              setTrackerQueryCode(code);
              setActiveView('track');
            }}
            canOpenOfficerDesk={
              session?.role === 'officer' || session?.role === 'admin'
            }
            onOpenOfficerTicket={(ticketCode) => {
              setActiveView('officer');
              setSelectedTicketCode(ticketCode);
            }}
          />
        )}

        {activeView === 'track' && (
          <CitizenTrackerView
            tickets={tickets}
            notifications={notifications}
            initialSearchCode={trackerQueryCode}
            mySubmittedCodes={mySubmittedCodes}
            viewerRole={session?.role ?? null}
            onMarkNotificationsRead={handleMarkNotificationsRead}
          />
        )}

        {activeView === 'officer' &&
          (session?.role === 'officer' || session?.role === 'admin') && (
            <OfficerDashboardView
              tickets={tickets}
              loading={loadingTickets}
              selectedTicketCode={selectedTicketCode}
              onSelectTicket={(code) => setSelectedTicketCode(code)}
              sessionRole={session.role}
              officerDepartmentCode={session.department_code}
            />
          )}

        {activeView === 'analytics' && session?.role === 'admin' && (
          <AnalyticsMonitoringView
            analytics={analyticsOverview}
            tickets={tickets}
            onInspectTicket={(code) => {
              setActiveView('officer');
              setSelectedTicketCode(code);
            }}
          />
        )}
      </main>

      {(session?.role === 'officer' || session?.role === 'admin') && (
        <TicketInspectionDrawer
          ticket={selectedTicket}
          sessionRole={session.role}
          onClose={() => setSelectedTicketCode(null)}
          onTransitionStatus={handleTransitionStatus}
          onOverrideDecision={handleOverrideDecision}
          onResolveDuplicate={handleResolveDuplicate}
        />
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg border border-slate-700"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
