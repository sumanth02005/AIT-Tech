import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ImageOff,
  Info,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { TicketSeverity, TicketStatus } from '../types/civiclens';

export function SeverityBadge({ severity }: { severity: TicketSeverity }) {
  const config: Record<
    TicketSeverity,
    { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    critical: {
      label: 'Critical',
      classes: 'bg-red-50 text-red-700 border-red-200',
      Icon: AlertOctagon,
    },
    high: {
      label: 'High',
      classes: 'bg-orange-50 text-orange-700 border-orange-200',
      Icon: AlertTriangle,
    },
    medium: {
      label: 'Medium',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: Info,
    },
    low: {
      label: 'Low',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      Icon: Info,
    },
  };

  const { label, classes, Icon } = config[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border whitespace-nowrap shrink-0 ${classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function LifecycleBadge({ status }: { status: TicketStatus }) {
  const config: Record<
    TicketStatus,
    { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    OPEN: {
      label: 'OPEN',
      classes: 'bg-slate-100 text-slate-800 border-slate-300',
      Icon: Clock,
    },
    ASSIGNED: {
      label: 'ASSIGNED',
      classes: 'bg-blue-50 text-blue-800 border-blue-200',
      Icon: ShieldAlert,
    },
    IN_PROGRESS: {
      label: 'IN PROGRESS',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: Wrench,
    },
    RESOLVED: {
      label: 'RESOLVED',
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Icon: CheckCircle2,
    },
    CLOSED: {
      label: 'CLOSED',
      classes: 'bg-slate-50 text-slate-600 border-slate-200',
      Icon: CheckCircle2,
    },
  };

  const { label, classes, Icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium rounded border whitespace-nowrap shrink-0 ${classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function ProvenanceNotice({
  isSimulated,
  compact = false,
}: {
  isSimulated: boolean;
  compact?: boolean;
}) {
  if (!isSimulated) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>Live Gemini Pro + Laya Output</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 ${
        compact ? '' : 'bg-amber-50 border border-amber-200 px-2.5 py-1 rounded'
      }`}
    >
      <Info className="w-3.5 h-3.5 shrink-0" />
      <span>Simulated Demo Pipeline (Not Live AI)</span>
    </span>
  );
}

export function EvidenceImage({
  src,
  alt,
  className = 'w-full h-48 object-cover rounded-lg',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 rounded-lg p-6 ${className}`}
      >
        <ImageOff className="w-6 h-6 mb-2 text-slate-400" />
        <span className="text-xs font-medium text-slate-600 text-center">
          No photo evidence attached
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
