import React, { useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react';
import type { Lead } from '../types';
import {
  addDaysISO,
  buildTelUrl,
  buildWhatsAppUrl,
  formatDisplayDate,
  getTodayISO,
} from '../utils';

interface TodaysAlertsProps {
  leads: Lead[];
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotification: () => Promise<void>;
  onLogVisit: (lead: Lead) => void;
  onOpenMap: (lead: Lead) => void;
  onContact: (id: string, method: 'Call' | 'WhatsApp') => void;
  onViewTodayTab: () => void;
}

export const TodaysAlerts: React.FC<TodaysAlertsProps> = ({
  leads,
  notificationPermission,
  onRequestNotification,
  onLogVisit,
  onOpenMap,
  onContact,
  onViewTodayTab,
}) => {
  const today = getTodayISO();
  const tomorrow = addDaysISO(1);

  const [dismissedForToday, setDismissedForToday] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(`lic_alerts_dismissed_${today}`) === '1';
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(false);

  const alertItems = useMemo(() => {
    const active = leads.filter(
      (lead) =>
        Boolean(lead.nextFollowUp) &&
        lead.status !== 'Policy Done' &&
        lead.status !== 'Not Interested'
    );

    const overdue = active
      .filter((l) => l.nextFollowUp < today)
      .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));

    const dueToday = active.filter((l) => l.nextFollowUp === today);
    const dueTomorrow = active.filter((l) => l.nextFollowUp === tomorrow);

    return {
      overdue,
      dueToday,
      dueTomorrow,
      urgentList: [...dueToday, ...overdue],
    };
  }, [leads, today, tomorrow]);

  const urgentCount = alertItems.urgentList.length;
  const tomorrowCount = alertItems.dueTomorrow.length;

  if (dismissedForToday || (urgentCount === 0 && tomorrowCount === 0)) {
    return null;
  }

  const displayList =
    urgentCount > 0 ? alertItems.urgentList : alertItems.dueTomorrow;
  const visibleRows = expanded ? displayList : displayList.slice(0, 3);

  const handleDismiss = () => {
    try {
      window.sessionStorage.setItem(`lic_alerts_dismissed_${today}`, '1');
    } catch {
      // Ignore storage failures
    }
    setDismissedForToday(true);
  };

  return (
    <section
      aria-label="Today's follow-up alerts"
      className="mt-4 rounded-2xl border border-[#FDB913] bg-amber-50/75 p-3.5 shadow-xs sm:p-4"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDB913] text-[#002B54]">
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#003B73]">
              Today&apos;s Alerts <span className="font-semibold text-[#713F12]">(আজকের রিমাইন্ডার)</span>
            </h2>
            <p className="text-xs font-medium text-amber-950/80 tabular-nums">
              {urgentCount > 0 ? (
                <>
                  {alertItems.dueToday.length} due today
                  {alertItems.overdue.length > 0 && ` · ${alertItems.overdue.length} overdue`}
                </>
              ) : (
                <>{tomorrowCount} scheduled for tomorrow</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {notificationPermission === 'default' && (
            <button
              type="button"
              onClick={() => void onRequestNotification()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#00529B] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#003B73]"
            >
              <Bell className="h-3.5 w-3.5 text-[#FDB913]" aria-hidden="true" />
              <span>Enable Alerts</span>
            </button>
          )}
          {notificationPermission === 'granted' && (
            <button
              type="button"
              onClick={() => void onRequestNotification()}
              title="Send reminder notification now"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#003B73] hover:bg-amber-100/50"
            >
              <Bell className="h-3.5 w-3.5 text-[#00529B]" aria-hidden="true" />
              <span className="hidden sm:inline">Alerts Active</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Hide Today's Alerts for now"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl text-amber-900/70 hover:bg-amber-200/50 hover:text-amber-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alert Rows */}
      <div className="mt-3 space-y-2">
        {visibleRows.map((lead) => {
          const isToday = lead.nextFollowUp === today;
          const isOverdue = lead.nextFollowUp < today;
          const telUrl = buildTelUrl(lead.mobile);
          const waUrl = buildWhatsAppUrl(lead);
          const nameLabel =
            lead.name.trim() ||
            lead.village.trim() ||
            lead.mobile.trim() ||
            'Unnamed Lead';

          return (
            <div
              key={lead.id}
              className="flex flex-col justify-between gap-2.5 rounded-xl border border-amber-200/90 bg-white px-3.5 py-2.5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="truncate text-sm font-bold text-slate-900">{nameLabel}</span>
                  <span
                    className={`tabular-nums text-xs font-semibold ${
                      isToday
                        ? 'text-[#00529B]'
                        : isOverdue
                          ? 'text-red-700'
                          : 'text-slate-600'
                    }`}
                  >
                    {isToday
                      ? '· Due Today'
                      : isOverdue
                        ? `· Overdue (${formatDisplayDate(lead.nextFollowUp)})`
                        : `· Tomorrow (${formatDisplayDate(lead.nextFollowUp)})`}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                  {lead.village.trim() && (
                    <button
                      type="button"
                      onClick={() => onOpenMap(lead)}
                      className="inline-flex items-center gap-1 font-medium text-[#00529B] hover:underline"
                    >
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      <span>{lead.village.trim()}</span>
                    </button>
                  )}
                  {lead.plan && (
                    <span>
                      {lead.village.trim() ? '· ' : ''}
                      {lead.plan}
                    </span>
                  )}
                  {lead.notes && (
                    <span className="truncate max-w-md text-slate-500">
                      · {lead.notes.split('\n')[0]}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {telUrl && (
                  <a
                    href={telUrl}
                    onClick={() => onContact(lead.id, 'Call')}
                    aria-label={`Call ${nameLabel}`}
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-lg bg-[#00529B]/10 px-2.5 text-xs font-semibold text-[#00529B] hover:bg-[#00529B]/20"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Call</span>
                  </a>
                )}
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onContact(lead.id, 'WhatsApp')}
                    aria-label={`WhatsApp ${nameLabel}`}
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>WA</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onLogVisit(lead)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-lg bg-amber-100 px-2.5 text-xs font-semibold text-amber-950 hover:bg-amber-200"
                >
                  <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Log</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Show More / Filter Jump */}
      {(displayList.length > 3 || alertItems.dueToday.length > 0) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 text-xs">
          {displayList.length > 3 ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex min-h-[36px] items-center gap-1 font-semibold text-[#003B73] hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Show fewer</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="tabular-nums">
                    Show all {displayList.length} reminders
                  </span>
                </>
              )}
            </button>
          ) : (
            <span />
          )}

          {alertItems.dueToday.length > 0 && (
            <button
              type="button"
              onClick={onViewTodayTab}
              className="min-h-[36px] font-semibold text-[#00529B] hover:underline"
            >
              Filter Today&apos;s Follow-up &rarr;
            </button>
          )}
        </div>
      )}
    </section>
  );
};
