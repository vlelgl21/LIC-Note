import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  DatabaseBackup,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { BackupModal } from './components/BackupModal';
import { FollowUpModal } from './components/FollowUpModal';
import { LeadCard } from './components/LeadCard';
import { LeadFormModal } from './components/LeadFormModal';
import { MapPreviewModal } from './components/MapPreviewModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TodaysAlerts } from './components/TodaysAlerts';
import {
  deleteLeadById,
  getActiveStorageEngine,
  getAllLeads,
  restoreLeads,
  saveLead,
} from './db';
import type { FilterTab, Lead, LeadLocation, LeadStatus, LicPlan, VisitHistoryEntry } from './types';
import { createSampleLeads, formatDisplayDate, generateId, getTodayISO } from './utils';

interface ToastState {
  id: number;
  message: string;
  isError?: boolean;
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageEngine, setStorageEngine] = useState<'IndexedDB' | 'localStorage'>('IndexedDB');

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [mapLead, setMapLead] = useState<Lead | null>(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  const showToast = useCallback((message: string, isError = false) => {
    const id = Date.now();
    setToast({ id, message, isError });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getAllLeads();
      if (!active) return;
      setLeads(result.leads);
      setStorageEngine(result.engine);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const today = getTodayISO();

  const sendBrowserFollowUpNotification = useCallback(
    async (leadList: Lead[], force = false) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (window.Notification.permission !== 'granted') return;

      const lastNotifiedKey = 'lic_last_notified_date';
      try {
        if (!force && window.localStorage.getItem(lastNotifiedKey) === today) {
          return;
        }
      } catch {
        // Continue if localStorage blocked
      }

      const urgent = leadList.filter(
        (l) =>
          Boolean(l.nextFollowUp) &&
          l.nextFollowUp <= today &&
          l.status !== 'Policy Done' &&
          l.status !== 'Not Interested'
      );

      if (urgent.length === 0) return;

      const first = urgent[0];
      const firstLabel =
        first.name.trim() || first.village.trim() || first.mobile.trim() || 'Client';
      const title = `LIC Follow-up Reminder (${urgent.length} Pending)`;
      const body =
        urgent.length === 1
          ? `${firstLabel}${first.village ? ` (${first.village})` : ''} — Follow-up due today.`
          : `${firstLabel}${first.village ? ` (${first.village})` : ''} + ${urgent.length - 1} more follow-ups due.`;

      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `lic-daily-followup-${today}`,
            });
          } else {
            new window.Notification(title, {
              body,
              icon: '/pwa-192x192.png',
              tag: `lic-daily-followup-${today}`,
            });
          }
        } else {
          new window.Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: `lic-daily-followup-${today}`,
          });
        }
        window.localStorage.setItem(lastNotifiedKey, today);
      } catch {
        // Ignore browser notification restrictions
      }
    },
    [today]
  );

  useEffect(() => {
    if (!loading && leads.length > 0 && notifPermission === 'granted') {
      void sendBrowserFollowUpNotification(leads, false);
    }
  }, [loading, leads, notifPermission, sendBrowserFollowUpNotification]);

  const handleRequestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Browser notifications are not supported on this device.', true);
      return;
    }

    if (window.Notification.permission === 'granted') {
      await sendBrowserFollowUpNotification(leads, true);
      showToast('Follow-up reminder notification sent.');
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      await sendBrowserFollowUpNotification(leads, true);
      showToast('Phone follow-up reminders enabled!');
    } else if (permission === 'denied') {
      showToast('Notification permission blocked. Today’s Alerts remain visible here.', true);
    }
  };

  const metrics = useMemo(() => {
    let totalVisits = 0;
    let todayFollowUps = 0;
    let overdueFollowUps = 0;
    let highChance = 0;
    let policiesClosed = 0;

    for (const lead of leads) {
      totalVisits += Math.max(1, (lead.history || []).length);
      if (lead.nextFollowUp === today) {
        todayFollowUps += 1;
      } else if (
        lead.nextFollowUp &&
        lead.nextFollowUp < today &&
        lead.status !== 'Policy Done' &&
        lead.status !== 'Not Interested'
      ) {
        overdueFollowUps += 1;
      }
      if (lead.conversionChance >= 70) {
        highChance += 1;
      }
      if (lead.status === 'Policy Done') {
        policiesClosed += 1;
      }
    }

    return {
      totalVisits,
      totalClients: leads.length,
      todayFollowUps,
      overdueFollowUps,
      highChance,
      policiesClosed,
    };
  }, [leads, today]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      if (activeTab === 'today' && lead.nextFollowUp !== today) return false;
      if (activeTab === 'high' && lead.conversionChance < 70) return false;
      if (activeTab === 'done' && lead.status !== 'Policy Done') return false;

      if (!q) return true;

      const historyNotes = (lead.history || []).map((h) => h.note).join(' ');
      const haystack = [
        lead.name,
        lead.mobile,
        lead.village,
        lead.ageOccupation,
        lead.plan,
        lead.notes,
        lead.status,
        historyNotes,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [leads, activeTab, searchQuery, today]);

  const handleSaveLead = async (data: {
    name: string;
    mobile: string;
    village: string;
    ageOccupation: string;
    visitDate: string;
    notes: string;
    conversionChance: number;
    status: LeadStatus;
    plan: LicPlan;
    nextFollowUp: string;
    location: LeadLocation | null;
  }) => {
    const nowIso = new Date().toISOString();

    if (editingLead) {
      const updated: Lead = {
        ...editingLead,
        ...data,
        updatedAt: nowIso,
      };
      await saveLead(updated);
      setStorageEngine(getActiveStorageEngine());
      setLeads((prev) => [updated, ...prev.filter((item) => item.id !== updated.id)]);
      setIsFormOpen(false);
      setEditingLead(null);
      showToast('Client visit updated.');
    } else {
      const initialHistory: VisitHistoryEntry[] = [
        {
          id: generateId(),
          date: data.visitDate || today,
          createdAt: nowIso,
          note: data.notes || 'Field visit logged.',
          conversionChance: data.conversionChance,
          status: data.status,
        },
      ];

      const created: Lead = {
        id: generateId(),
        ...data,
        history: initialHistory,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await saveLead(created);
      setStorageEngine(getActiveStorageEngine());
      setLeads((prev) => [created, ...prev]);
      setIsFormOpen(false);
      showToast('New field visit saved locally.');
    }
  };

  const handleLogFollowUp = async (
    leadId: string,
    payload: {
      visitDate: string;
      note: string;
      conversionChance: number;
      status: LeadStatus;
      nextFollowUp: string;
    }
  ) => {
    const target = leads.find((item) => item.id === leadId);
    if (!target) return;

    const nowIso = new Date().toISOString();
    const newEntry: VisitHistoryEntry = {
      id: generateId(),
      date: payload.visitDate || today,
      createdAt: nowIso,
      note: payload.note || `Follow-up logged (${payload.status})`,
      conversionChance: payload.conversionChance,
      status: payload.status,
    };

    const existingHistory = target.history || [];
    const updatedNotes = payload.note
      ? target.notes
        ? `${payload.note}\n— Previous: ${target.notes.split('\n')[0]}`
        : payload.note
      : target.notes;

    const updated: Lead = {
      ...target,
      visitDate: payload.visitDate || today,
      notes: updatedNotes,
      conversionChance: payload.conversionChance,
      status: payload.status,
      nextFollowUp: payload.nextFollowUp,
      history: [newEntry, ...existingHistory],
      updatedAt: nowIso,
    };

    await saveLead(updated);
    setStorageEngine(getActiveStorageEngine());
    setLeads((prev) => [updated, ...prev.filter((item) => item.id !== updated.id)]);
    setFollowUpLead(null);
    showToast('Follow-up visit appended to client history.');
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLeadById(id);
    setStorageEngine(getActiveStorageEngine());
    setLeads((prev) => prev.filter((item) => item.id !== id));
    showToast('Client record deleted.');
  };

  const handleRecordContact = async (id: string, method: 'Call' | 'WhatsApp') => {
    const target = leads.find((item) => item.id === id);
    if (!target) return;

    const nowIso = new Date().toISOString();
    const updated: Lead = {
      ...target,
      lastContactedAt: nowIso,
      lastContactMethod: method,
      updatedAt: nowIso,
    };

    await saveLead(updated);
    setStorageEngine(getActiveStorageEngine());
    setLeads((prev) => prev.map((item) => (item.id === id ? updated : item)));
  };

  const handleRestore = async (incoming: Lead[], mode: 'merge' | 'replace') => {
    const updated = await restoreLeads(incoming, mode);
    setStorageEngine(getActiveStorageEngine());
    setLeads(updated);
    showToast(
      mode === 'replace'
        ? `Restored ${updated.length} leads from backup.`
        : `Merged backup successfully (${updated.length} total leads).`
    );
  };

  const handleLoadSamples = async () => {
    const samples = createSampleLeads();
    const updated = await restoreLeads(samples, 'merge');
    setStorageEngine(getActiveStorageEngine());
    setLeads(updated);
    setIsBackupOpen(false);
    showToast('Sample field leads added for Chuapukur, Lalgola & Sagia.');
  };

  const openNewForm = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  const openEditForm = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All Leads', count: metrics.totalClients },
    { id: 'today', label: "Today's Follow-up", count: metrics.todayFollowUps },
    { id: 'high', label: 'High Chance (70%+)', count: metrics.highChance },
    { id: 'done', label: 'Policy Done', count: metrics.policiesClosed },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24 text-slate-900">
      {/* Compact Sticky Top Bar (56px, <= 15% mobile viewport cap) */}
      <header className="sticky top-0 z-30 border-b border-[#003B73] bg-[#00529B] text-white shadow-xs">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon.svg"
              alt="LIC Field Tracker emblem"
              className="h-8 w-8 rounded-lg shrink-0"
            />
            <span className="truncate text-base font-bold tracking-tight whitespace-nowrap sm:text-lg">
              LIC Field Tracker
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 whitespace-nowrap"
              aria-label="Backup, Restore and Excel Export"
            >
              <DatabaseBackup className="h-4 w-4 text-[#FDB913]" aria-hidden="true" />
              <span className="hidden sm:inline">Backup & CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        {/* Agency Identity & Date Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 text-xs text-slate-600">
          <p className="font-semibold text-[#003B73]">
            Advisor: Ansariya Khatun · Zahid Computer
          </p>
          <p className="tabular-nums font-medium text-slate-500">
            {formatDisplayDate(today)}
          </p>
        </div>

        {/* 1. Top Dashboard Summary (4 Compact Cards) */}
        <section aria-label="Dashboard summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-2xl border p-3.5 text-left transition-colors ${
              activeTab === 'all'
                ? 'border-[#00529B] bg-white shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500">Total Visits (মোট ভিজিট)</p>
            <p className="font-mono-tabular mt-1 text-2xl font-bold text-[#003B73]">
              {metrics.totalVisits}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
              {metrics.totalClients} {metrics.totalClients === 1 ? 'client' : 'clients'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`rounded-2xl border p-3.5 text-left transition-colors ${
              activeTab === 'today'
                ? 'border-[#00529B] bg-amber-50 shadow-xs'
                : 'border-[#FDB913] bg-amber-50/70 hover:bg-amber-50'
            }`}
          >
            <p className="text-xs font-semibold text-[#713F12]">
              Today&apos;s Follow-ups (আজকে)
            </p>
            <p className="font-mono-tabular mt-1 text-2xl font-bold text-[#713F12]">
              {metrics.todayFollowUps}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-amber-900/80 tabular-nums">
              {metrics.overdueFollowUps > 0
                ? `${metrics.overdueFollowUps} earlier due`
                : 'Scheduled for today'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('high')}
            className={`rounded-2xl border p-3.5 text-left transition-colors ${
              activeTab === 'high'
                ? 'border-[#00529B] bg-white shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500">High Chance 70%+</p>
            <p className="font-mono-tabular mt-1 text-2xl font-bold text-emerald-700">
              {metrics.highChance}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">Strong prospects</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('done')}
            className={`rounded-2xl border p-3.5 text-left transition-colors ${
              activeTab === 'done'
                ? 'border-[#00529B] bg-white shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500">Policies Closed (সম্পন্ন)</p>
            <p className="font-mono-tabular mt-1 text-2xl font-bold text-[#00529B]">
              {metrics.policiesClosed}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">Completed policies</p>
          </button>
        </section>

        {/* Today's Alerts Reminder Section */}
        {!loading && (
          <TodaysAlerts
            leads={leads}
            notificationPermission={notifPermission}
            onRequestNotification={handleRequestNotification}
            onLogVisit={(item) => setFollowUpLead(item)}
            onOpenMap={(item) => setMapLead(item)}
            onContact={(id, method) => void handleRecordContact(id, method)}
            onViewTodayTab={() => setActiveTab('today')}
          />
        )}

        {/* 2. Instant Search & Filter Tabs */}
        <section aria-label="Search and filter leads" className="mt-4 space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, mobile, village (e.g. Chuapukur) or notes..."
              aria-label="Search leads"
              className="min-h-[46px] w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-10 py-2.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-1.5 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter leads by status"
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[44px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    selected
                      ? 'bg-[#00529B] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Lead Cards List */}
        <section aria-label="Client list" className="mt-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading offline field records...
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
              <h2 className="text-base font-bold text-slate-900">
                No Field Visits Recorded Yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
                Tap the <strong>+ Add Visit</strong> button to record a client visit in Chuapukur,
                Sagia, or Lalgola. Everything saves permanently on your phone even without
                internet.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openNewForm}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#00529B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#003B73]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add First Visit</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleLoadSamples()}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Sparkles className="h-4 w-4 text-[#00529B]" aria-hidden="true" />
                  <span>Load Sample Leads</span>
                </button>
              </div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No matching clients found for this filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
                className="mt-3 min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#00529B] hover:bg-slate-50"
              >
                Show All Leads
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onEdit={openEditForm}
                  onLogVisit={(item) => setFollowUpLead(item)}
                  onDelete={(id) => void handleDeleteLead(id)}
                  onOpenMap={(item) => setMapLead(item)}
                  onContact={(id, method) => void handleRecordContact(id, method)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating '+' Action Button (Bottom-Right Thumb Zone) */}
      <button
        type="button"
        onClick={openNewForm}
        aria-label="Add new field visit"
        className="fixed right-4 bottom-5 z-40 inline-flex h-14 min-w-[56px] items-center justify-center gap-2 rounded-full bg-[#00529B] px-4 text-white shadow-lg ring-2 ring-[#FDB913] transition-transform hover:bg-[#003B73] active:scale-95 sm:right-6 sm:bottom-6 sm:px-5"
      >
        <Plus className="h-6 w-6 text-[#FDB913]" aria-hidden="true" />
        <span className="hidden text-sm font-bold sm:inline">Add Visit</span>
      </button>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-16 right-4 left-4 z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.isError
              ? 'border-red-300 bg-red-50 text-red-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-950'
          }`}
        >
          <CheckCircle2
            className={`h-4 w-4 shrink-0 ${toast.isError ? 'text-red-600' : 'text-emerald-700'}`}
            aria-hidden="true"
          />
          <span className="flex-1">{toast.message}</span>
        </div>
      )}

      <OfflineIndicator />

      {/* Modals */}
      <LeadFormModal
        isOpen={isFormOpen}
        editingLead={editingLead}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLead(null);
        }}
        onSave={(data) => void handleSaveLead(data)}
        onError={(msg) => showToast(msg, true)}
      />

      <FollowUpModal
        lead={followUpLead}
        onClose={() => setFollowUpLead(null)}
        onLogVisit={(id, payload) => void handleLogFollowUp(id, payload)}
      />

      <BackupModal
        isOpen={isBackupOpen}
        leads={leads}
        storageEngine={storageEngine}
        onClose={() => setIsBackupOpen(false)}
        onRestore={handleRestore}
        onLoadSamples={handleLoadSamples}
        onNotify={showToast}
      />

      <MapPreviewModal lead={mapLead} onClose={() => setMapLead(null)} />
    </div>
  );
}
