import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Columns,
  GitMerge,
  List,
  Map as MapIcon,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { CATEGORY_LABELS, DEPARTMENTS } from '../data/seedData';
import {
  ComplaintCategory,
  Ticket,
  TicketSeverity,
  TicketStatus,
} from '../types/civiclens';
import { formatRelativeTime } from '../utils/geo';
import { OfficerOperationsMap } from './maps/CivicMap';
import { LifecycleBadge, ProvenanceNotice, SeverityBadge } from './StatusPrimitives';

interface OfficerDashboardViewProps {
  tickets: Ticket[];
  loading: boolean;
  selectedTicketCode: string | null;
  onSelectTicket: (ticketCode: string) => void;
}

export function OfficerDashboardView({
  tickets,
  loading,
  selectedTicketCode,
  onSelectTicket,
}: OfficerDashboardViewProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<TicketSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'split' | 'table' | 'map'>('split');

  const stats = useMemo(() => {
    const totalComplaints = tickets.reduce((sum, t) => sum + t.duplicate_count, 0);
    const pending = tickets.filter(
      (t) => t.status === 'OPEN' || t.status === 'ASSIGNED'
    ).length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter(
      (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
    ).length;
    const criticalEscalated = tickets.filter(
      (t) => t.is_critical_escalated && t.status !== 'CLOSED' && t.status !== 'RESOLVED'
    ).length;
    const reviewNeeded = tickets.filter((t) => t.needs_human_review).length;

    return {
      totalComplaints,
      totalTickets: tickets.length,
      pending,
      inProgress,
      resolved,
      criticalEscalated,
      reviewNeeded,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (departmentFilter !== 'all' && t.department_code !== departmentFilter)
        return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (reviewOnly && !t.needs_human_review) return false;
      if (q) {
        const hay = `${t.ticket_code} ${t.primary_complaint_code} ${t.summary} ${t.location_label} ${t.department_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    tickets,
    search,
    severityFilter,
    categoryFilter,
    departmentFilter,
    statusFilter,
    reviewOnly,
  ]);

  function resetFilters() {
    setSearch('');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setReviewOnly(false);
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Municipal Officer Triage Desk
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Priority-sorted incident queue with Gemini Pro + Laya evaluation, PostGIS duplicate verification, and lifecycle dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer ${
                layoutMode === 'split'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer ${
                layoutMode === 'table'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Queue</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('map')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer ${
                layoutMode === 'map'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Total Complaints / Incidents
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.totalComplaints}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              across {stats.totalTickets} tickets
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Open & Assigned Pending
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.pending}
            </span>
            {stats.criticalEscalated > 0 && (
              <span className="text-xs font-medium text-red-700 font-mono tabular-nums">
                {stats.criticalEscalated} critical escalated
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">In Progress</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.inProgress}
            </span>
            <span className="text-xs text-slate-500">crews dispatched</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Resolved & Closed
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {stats.resolved}
            </span>
            {stats.reviewNeeded > 0 && (
              <button
                type="button"
                onClick={() => setReviewOnly((v) => !v)}
                className="text-xs font-medium text-amber-800 hover:underline cursor-pointer"
              >
                {stats.reviewNeeded} awaiting human review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket ID, summary, ward, or department..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as TicketSeverity | 'all')}
          className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as ComplaintCategory | 'all')
          }
          className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by department"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept.code} value={dept.code}>
              {dept.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by lifecycle status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
          className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
        >
          <option value="all">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <button
          type="button"
          onClick={() => setReviewOnly((v) => !v)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border inline-flex items-center gap-1.5 cursor-pointer ${
            reviewOnly
              ? 'bg-amber-50 border-amber-400 text-amber-900'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Needs Review ({stats.reviewNeeded})</span>
        </button>
      </div>

      {/* Main Content Area: Priority Table + Interactive Map */}
      <div
        className={`grid gap-6 items-start ${
          layoutMode === 'split' ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'
        }`}
      >
        {layoutMode !== 'map' && (
          <div
            className={`${
              layoutMode === 'split' ? 'xl:col-span-7' : ''
            } bg-white border border-slate-200 rounded-xl overflow-hidden`}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-900 font-mono tabular-nums">{filteredTickets.length}</strong> prioritized incidents
              </span>
              <ProvenanceNotice
                isSimulated={tickets[0]?.is_simulated ?? true}
                compact
              />
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-slate-100 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-800">
                  No tickets match your current filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-4">Priority / Ticket</th>
                      <th className="py-2.5 px-3">Issue & Location</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Lifecycle</th>
                      <th className="py-2.5 px-4 text-right">Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTickets.map((ticket) => {
                      const isSelected = ticket.ticket_code === selectedTicketCode;
                      return (
                        <tr
                          key={ticket.ticket_code}
                          onClick={() => onSelectTicket(ticket.ticket_code)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/70'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <SeverityBadge severity={ticket.severity} />
                              <span className="font-mono text-xs text-slate-500 tabular-nums">
                                P{ticket.priority_score}
                              </span>
                            </div>
                            <div className="mt-1 font-mono text-xs font-semibold text-slate-900">
                              {ticket.ticket_code}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top max-w-md">
                            <div className="font-medium text-slate-900 line-clamp-2">
                              {ticket.summary}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span>{CATEGORY_LABELS[ticket.category]}</span>
                              <span aria-hidden="true">·</span>
                              <span>{ticket.location_label}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">
                                {formatRelativeTime(ticket.created_at)}
                              </span>
                            </div>
                            {(ticket.is_critical_escalated ||
                              ticket.needs_human_review) && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                {ticket.is_critical_escalated && (
                                  <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Critical Escalation</span>
                                  </span>
                                )}
                                {ticket.needs_human_review && (
                                  <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Needs Human Verification</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 align-top text-xs text-slate-700">
                            <div className="font-medium text-slate-900">
                              {ticket.department_name}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              {ticket.assigned_officer || 'Unassigned'}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            <LifecycleBadge status={ticket.status} />
                          </td>

                          <td className="py-3 px-4 align-top text-right whitespace-nowrap font-mono tabular-nums">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                              {ticket.duplicate_count > 1 && (
                                <GitMerge className="w-3.5 h-3.5 text-blue-700" />
                              )}
                              <span>{ticket.duplicate_count}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {layoutMode !== 'table' && (
          <div
            className={`${
              layoutMode === 'split' ? 'xl:col-span-5' : ''
            } bg-white border border-slate-200 rounded-xl p-4 space-y-3`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Geographic Complaint Map
                </h2>
                <p className="text-slate-500">
                  Click any marker to inspect evidence. Dashed ring indicates 250m PostGIS duplicate radius.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                <span className="text-red-700">Critical</span>
                <span className="text-orange-700">High</span>
                <span className="text-amber-700">Medium</span>
                <span className="text-slate-600">Low</span>
              </div>
            </div>

            <OfficerOperationsMap
              tickets={filteredTickets}
              selectedTicketCode={selectedTicketCode}
              onSelectTicket={onSelectTicket}
              heightClass={layoutMode === 'map' ? 'h-[560px]' : 'h-[480px]'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
