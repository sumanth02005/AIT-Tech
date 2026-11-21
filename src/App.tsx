import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnalyticsMonitoringView } from './components/AnalyticsMonitoringView';
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

const ROLE_SESSIONS: Record<UserRole, UserSession> = {
  citizen: {
    id: 'usr-citizen-1',
    full_name: 'Citizen Reporter',
    email: 'citizen@civiclens.local',
    role: 'citizen',
    auth_mode: 'demo_role',
  },
  officer: {
    id: 'usr-officer-1',
    full_name: 'R. Deshmukh',
    email: 'deshmukh.eng@city.gov',
    role: 'officer',
    department_code: 'ELECTRICITY',
    auth_mode: 'demo_role',
  },
  admin: {
    id: 'usr-admin-1',
    full_name: 'Dr. Kavita Rao',
    email: 'commissioner@city.gov',
    role: 'admin',
    auth_mode: 'demo_role',
  },
};

export default function App() {
  const [session, setSession] = useState<UserSession>(ROLE_SESSIONS.officer);
  const [activeView, setActiveView] = useState<ActiveView>('officer');
  const [modePreference, setModePreference] = useState<'auto' | 'demo'>('auto');
  const [health, setHealth] = useState<BackendHealth>(INITIAL_HEALTH);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketCode, setSelectedTicketCode] = useState<string | null>(null);
  const [trackerQueryCode, setTrackerQueryCode] = useState<string>('');
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

  function handleRoleChange(role: UserRole) {
    setSession(ROLE_SESSIONS[role]);
    if (role === 'citizen' && (activeView === 'officer' || activeView === 'analytics')) {
      setActiveView('submit');
      setSelectedTicketCode(null);
    }
    showToast(`Switched workspace role to ${role.toUpperCase()}`);
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

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== 'officer') setSelectedTicketCode(null);
        }}
        session={session}
        onRoleChange={handleRoleChange}
        health={health}
        modePreference={modePreference}
        onToggleModePreference={(mode) => setModePreference(mode)}
        onResetDemo={handleResetDemo}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      <main className="flex-1">
        {activeView === 'submit' && (
          <CitizenIntakeView
            mode={health.mode}
            onSubmitComplaint={handleSubmitComplaint}
            onOpenTracker={(code) => {
              setTrackerQueryCode(code);
              setActiveView('track');
            }}
            canOpenOfficerDesk={session.role === 'officer' || session.role === 'admin'}
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
            onMarkNotificationsRead={handleMarkNotificationsRead}
          />
        )}

        {activeView === 'officer' && (
          <OfficerDashboardView
            tickets={tickets}
            loading={loadingTickets}
            selectedTicketCode={selectedTicketCode}
            onSelectTicket={(code) => setSelectedTicketCode(code)}
          />
        )}

        {activeView === 'analytics' && (
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

      {(session.role === 'officer' || session.role === 'admin') && (
        <TicketInspectionDrawer
          ticket={selectedTicket}
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
