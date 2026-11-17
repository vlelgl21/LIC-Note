import React, { useState } from 'react';
import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Trash2,
} from 'lucide-react';
import type { Lead } from '../types';
import {
  buildCoordinateDirectionsUrl,
  buildTelUrl,
  buildWhatsAppUrl,
  formatDisplayDate,
  formatLastContacted,
  formatTimestamp,
  getChanceColorMeta,
  getStatusLabelMeta,
  getTodayISO,
} from '../utils';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onLogVisit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onOpenMap: (lead: Lead) => void;
  onContact: (id: string, method: 'Call' | 'WhatsApp') => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onEdit,
  onLogVisit,
  onDelete,
  onOpenMap,
  onContact,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const today = getTodayISO();
  const isFollowUpToday = lead.nextFollowUp === today;
  const isOverdue =
    Boolean(lead.nextFollowUp) &&
    lead.nextFollowUp < today &&
    lead.status !== 'Policy Done' &&
    lead.status !== 'Not Interested';

  const chanceMeta = getChanceColorMeta(lead.conversionChance);
  const statusMeta = getStatusLabelMeta(lead.status);
  const telUrl = buildTelUrl(lead.mobile);
  const waUrl = buildWhatsAppUrl(lead);
  const directionsUrl = buildCoordinateDirectionsUrl(lead);

  const displayName =
    lead.name.trim() ||
    (lead.village.trim() ? `Visit · ${lead.village.trim()}` : '') ||
    (lead.mobile.trim() ? `Client · ${lead.mobile.trim()}` : 'Quick Field Note');

  const secondaryMetaParts = [
    lead.ageOccupation.trim(),
    lead.mobile.trim(),
  ].filter(Boolean);

  const historyList = lead.history || [];

  return (
    <article
      className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition-colors ${
        isFollowUpToday
          ? 'border-[#FDB913] bg-amber-50/30'
          : isOverdue
            ? 'border-amber-300'
            : 'border-slate-200'
      }`}
    >
      <div>
        {/* Card Header: Name + Conversion Chance */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-slate-900">{displayName}</h3>
            {(lead.village.trim() || directionsUrl || secondaryMetaParts.length > 0) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600 tabular-nums">
                {(lead.village.trim() || directionsUrl) && (
                  <button
                    type="button"
                    onClick={() => onOpenMap(lead)}
                    title="View address on map & navigate"
                    className="inline-flex min-h-[28px] items-center gap-1 font-semibold text-[#00529B] hover:underline focus-visible:outline-2 focus-visible:outline-[#00529B]"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate max-w-[180px]">
                      {lead.village.trim() ||
                        (lead.location
                          ? `${lead.location.lat.toFixed(4)}, ${lead.location.lng.toFixed(4)}`
                          : '')}
                    </span>
                  </button>
                )}
                {directionsUrl && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[28px] items-center gap-1 font-semibold text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-700"
                    >
                      <Navigation className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>Get Directions</span>
                    </a>
                  </>
                )}
                {(lead.village.trim() || directionsUrl) && secondaryMetaParts.length > 0 && (
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                )}
                {secondaryMetaParts.length > 0 && (
                  <span className="truncate">{secondaryMetaParts.join(' · ')}</span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <div className={`font-mono-tabular text-sm font-bold ${chanceMeta.textClass}`}>
              {lead.conversionChance}% · {chanceMeta.tierLabel}
            </div>
            <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${chanceMeta.barClass}`}
                style={{ width: `${lead.conversionChance}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status badge, Plan & Follow-up Metadata Line */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
          >
            {lead.status}
          </span>
          {lead.plan && (
            <>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-medium text-slate-700">{lead.plan}</span>
            </>
          )}
          {lead.nextFollowUp && (
            <>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span
                className={`tabular-nums font-semibold ${
                  isFollowUpToday
                    ? 'text-[#713F12]'
                    : isOverdue
                      ? 'text-red-700'
                      : 'text-slate-600'
                }`}
              >
                {isFollowUpToday
                  ? `Follow-up Today (${formatDisplayDate(lead.nextFollowUp)})`
                  : isOverdue
                    ? `Due ${formatDisplayDate(lead.nextFollowUp)}`
                    : `Next: ${formatDisplayDate(lead.nextFollowUp)}`}
              </span>
            </>
          )}
        </div>

        {/* Notes */}
        {lead.notes && (
          <p className="mt-2.5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
            {lead.notes}
          </p>
        )}

        {/* Last Contacted Badge */}
        {lead.lastContactedAt && (
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-[#003B73] tabular-nums">
              <Clock className="h-3 w-3 text-[#00529B]" aria-hidden="true" />
              <span>
                Last Contacted{lead.lastContactMethod ? ` (${lead.lastContactMethod})` : ''}:{' '}
                {formatLastContacted(lead.lastContactedAt)}
              </span>
            </span>
          </div>
        )}

        {/* Visit Date & Expandable History */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="tabular-nums">
            Last visit: {formatDisplayDate(lead.visitDate) || 'Today'}
          </span>
          {historyList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#00529B] hover:bg-sky-50"
            >
              <span className="tabular-nums">
                {historyList.length} {historyList.length === 1 ? 'visit log' : 'visit logs'}
              </span>
              {showHistory ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {showHistory && historyList.length > 0 && (
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2.5">
            {historyList.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2 text-slate-500">
                  <span className="tabular-nums font-medium text-slate-700">
                    {formatTimestamp(entry.createdAt) || formatDisplayDate(entry.date)}
                  </span>
                  <span className="tabular-nums font-semibold text-slate-600">
                    {entry.status} · {entry.conversionChance}%
                  </span>
                </div>
                {entry.note && <p className="mt-1 text-slate-700">{entry.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick One-Tap Field Actions (>= 44px touch targets) */}
      <div className="mt-3.5 border-t border-slate-100 pt-3">
        {confirmDelete ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2">
            <span className="text-xs font-semibold text-red-800">Delete this client?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDelete(lead.id)}
                className="min-h-[40px] rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {telUrl ? (
              <a
                href={telUrl}
                onClick={() => onContact(lead.id, 'Call')}
                className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-[#00529B]/10 px-1 py-1.5 text-[11px] font-semibold text-[#00529B] transition-colors hover:bg-[#00529B]/20"
                title={`Call ${lead.mobile}`}
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span className="mt-0.5">Call</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-slate-100 px-1 py-1.5 text-[11px] font-medium text-slate-400 cursor-not-allowed"
                title="No mobile number added"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span className="mt-0.5">Call</span>
              </button>
            )}

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onContact(lead.id, 'WhatsApp')}
                className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-emerald-50 px-1 py-1.5 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                title="Send WhatsApp greeting"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span className="mt-0.5">WhatsApp</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-slate-100 px-1 py-1.5 text-[11px] font-medium text-slate-400 cursor-not-allowed"
                title="Add a 10-digit mobile number for WhatsApp"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span className="mt-0.5">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onLogVisit(lead)}
              className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-amber-50 px-1 py-1.5 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-100"
              title="Log new visit or follow-up note"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              <span className="mt-0.5 whitespace-nowrap">Follow-up</span>
            </button>

            <button
              type="button"
              onClick={() => onEdit(lead)}
              className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-slate-100 px-1 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              title="Edit client"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              <span className="mt-0.5">Edit</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-slate-100 px-1 py-1.5 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-50"
              title="Delete client"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="mt-0.5">Delete</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
