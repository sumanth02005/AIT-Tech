import React, { useMemo } from 'react';
import { BarChart3, Clock, GitMerge, History, MapPin, ShieldAlert } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/seedData';
import { AnalyticsOverview, Ticket } from '../types/civiclens';
import { formatDateTime } from '../utils/geo';
import { HotspotAnalyticsMap } from './maps/CivicMap';
import { ProvenanceNotice } from './StatusPrimitives';

interface AnalyticsMonitoringViewProps {
  analytics: AnalyticsOverview;
  tickets: Ticket[];
  onInspectTicket: (ticketCode: string) => void;
}

export function AnalyticsMonitoringView({
  analytics,
  tickets,
  onInspectTicket,
}: AnalyticsMonitoringViewProps) {
  const systemAuditLogs = useMemo(() => {
    return tickets
      .flatMap((t) => t.audit_logs)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 12);
  }, [tickets]);

  const recurringIncidents = useMemo(() => {
    return [...tickets]
      .filter((t) => t.duplicate_count > 1)
      .sort((a, b) => b.duplicate_count - a.duplicate_count);
  }, [tickets]);

  const maxDeptCount = Math.max(
    1,
    ...analytics.department_breakdown.map((d) => d.total)
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Civic Analytics & Operational Monitoring
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Department resolution SLAs, duplicate merge rates, critical hazard load, and geospatial complaint hotspots.
          </p>
        </div>
        <ProvenanceNotice isSimulated={tickets[0]?.is_simulated ?? true} />
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Total Complaints Received
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {analytics.total_complaints_received}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            {analytics.total_unique_tickets} unique incidents
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Resolved vs. Pending
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl font-bold text-emerald-700">
              {analytics.resolved_or_closed_tickets}
            </span>
            <span className="text-xs text-slate-500">
              / {analytics.pending_tickets + analytics.in_progress_tickets} active
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {analytics.in_progress_tickets} currently in progress
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 inline-flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Critical & High Severity</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-red-700">
            {analytics.critical_and_high_count}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {analytics.human_review_flagged_count} flagged for human review
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>Avg Resolution Time</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {analytics.avg_resolution_hours}h
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Across resolved tickets
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 inline-flex items-center gap-1">
            <GitMerge className="w-3.5 h-3.5 text-blue-700" />
            <span>Duplicate Compression</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-blue-700">
            {analytics.duplicate_rate_pct}%
          </div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            {analytics.duplicate_complaints_linked} reports linked cleanly
          </div>
        </div>
      </div>

      {/* Department Distribution + Hotspot Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Department Distribution & SLA Performance
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 px-2">Load</th>
                  <th className="py-2 px-2 text-right">Pending</th>
                  <th className="py-2 px-2 text-right">Resolved</th>
                  <th className="py-2 px-2 text-right">Avg Time</th>
                  <th className="py-2 pl-2 text-right">SLA %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.department_breakdown.map((dept) => (
                  <tr key={dept.department_code}>
                    <td className="py-3 pr-3 font-medium text-slate-900">
                      {dept.department_name}
                    </td>
                    <td className="py-3 px-2 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-700 rounded-full"
                            style={{
                              width: `${Math.round((dept.total / maxDeptCount) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-slate-700">
                          {dept.total}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-700">
                      {dept.open_or_assigned + dept.in_progress}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-emerald-700">
                      {dept.resolved_or_closed}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-700">
                      {dept.avg_resolution_hours}h
                    </td>
                    <td className="py-3 pl-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {dept.sla_compliance_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geographic Hotspots Map */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Geographic Complaint Hotspots (PostGIS Clusters)
              </h2>
            </div>
          </div>

          <HotspotAnalyticsMap hotspots={analytics.hotspots} heightClass="h-72" />

          <div className="space-y-2 pt-1">
            {analytics.hotspots.slice(0, 3).map((hs) => (
              <div
                key={hs.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
              >
                <div>
                  <span className="font-semibold text-slate-900">{hs.area_name}</span>
                  <span className="text-slate-500">
                    {' '}
                    · {CATEGORY_LABELS[hs.dominant_category]}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-700">
                  {hs.incident_count} reports ({hs.critical_or_high_count} crit/high)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recurring Incidents + System Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
            Recurring & Multi-Report Incidents
          </h2>
          {recurringIncidents.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              No duplicate-linked recurring incidents yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recurringIncidents.map((t) => (
                <button
                  key={t.ticket_code}
                  type="button"
                  onClick={() => onInspectTicket(t.ticket_code)}
                  className="w-full text-left py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-blue-700">
                      {t.ticket_code}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {t.duplicate_count} citizen reports
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-900 mt-0.5 line-clamp-1">
                    {t.summary}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t.location_label} · {t.department_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <History className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Recent AI, Override & Lifecycle Audit Logs
            </h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {systemAuditLogs.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-slate-900">
                    {log.ticket_code}
                  </span>{' '}
                  <span className="font-mono text-[11px] text-slate-500">
                    [{log.action_type}]
                  </span>{' '}
                  <span className="text-slate-700">{log.summary}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-500 shrink-0">
                  {log.actor_name} · {formatDateTime(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
