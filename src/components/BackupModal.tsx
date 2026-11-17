import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  FileUp,
  HardDrive,
  Sparkles,
  X,
} from 'lucide-react';
import type { Lead } from '../types';
import { exportLeadsToCSV, exportLeadsToJSON, parseBackupJSON } from '../utils';

interface BackupModalProps {
  isOpen: boolean;
  leads: Lead[];
  storageEngine: 'IndexedDB' | 'localStorage';
  onClose: () => void;
  onRestore: (incoming: Lead[], mode: 'merge' | 'replace') => Promise<void>;
  onLoadSamples: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  leads,
  storageEngine,
  onClose,
  onRestore,
  onLoadSamples,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Lead[] | null>(null);
  const [pendingFilename, setPendingFilename] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    if (leads.length === 0) {
      onNotify('No leads to export yet.', true);
      return;
    }
    exportLeadsToJSON(leads);
    onNotify(`JSON backup downloaded (${leads.length} leads). Save it to Google Drive or WhatsApp.`);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      onNotify('No leads to export yet.', true);
      return;
    }
    exportLeadsToCSV(leads);
    onNotify(`Excel / CSV report downloaded (${leads.length} leads).`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupJSON(text);
      setPendingRestore(parsed);
      setPendingFilename(file.name);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Invalid JSON backup file.', true);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmRestore = async (mode: 'merge' | 'replace') => {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      await onRestore(pendingRestore, mode);
      setPendingRestore(null);
      setPendingFilename('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 id="backup-modal-title" className="text-lg font-bold text-[#003B73]">
              Offline Backup & Reports
            </h2>
            <p className="text-xs text-slate-500">
              ব্যাকআপ ও এক্সেল রিপোর্ট — আপনার ফোনের ডেটা সুরক্ষিত রাখুন
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close backup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Storage summary strip */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2.5">
              <HardDrive className="h-4 w-4 text-[#00529B]" aria-hidden="true" />
              <span className="font-semibold text-slate-800">Local Phone Storage</span>
            </div>
            <span className="font-mono-tabular text-xs font-semibold text-slate-600">
              {storageEngine} · {leads.length} leads
            </span>
          </div>

          {/* Export JSON */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Export JSON Backup (ব্যাকআপ ডাউনলোড)
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Downloads a dated <code className="font-mono-tabular">.json</code> file. Save it
                  to Google Drive or send to your own WhatsApp weekly.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#00529B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#003B73]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          {/* Restore JSON */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Restore from JSON (ব্যাকআপ রিস্টোর)
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                Select a previously exported <code className="font-mono-tabular">.json</code>{' '}
                backup file to merge or restore leads.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {!pendingRestore ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <FileUp className="h-4 w-4 text-[#00529B]" aria-hidden="true" />
                <span>Choose Backup JSON File</span>
              </button>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-3">
                <p className="text-xs font-semibold text-amber-950">
                  Ready to restore <span className="tabular-nums">{pendingRestore.length}</span>{' '}
                  leads from <span className="underline">{pendingFilename}</span>
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmRestore('merge')}
                    className="min-h-[44px] flex-1 rounded-xl bg-[#00529B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#003B73] disabled:opacity-60"
                  >
                    Merge with Existing
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmRestore('replace')}
                    className="min-h-[44px] flex-1 rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Replace All Data
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPendingRestore(null)}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Excel / CSV */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Export to Excel / CSV (এক্সেল রিপোর্ট)
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                Creates a clean <code className="font-mono-tabular">.csv</code> spreadsheet with
                full Bengali support for Excel and Google Sheets.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#00529B] bg-sky-50 px-4 py-2.5 text-sm font-semibold text-[#00529B] hover:bg-sky-100"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Export Excel / CSV Report</span>
            </button>
          </div>

          {/* Sample data loader when testing */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Database className="h-4 w-4" aria-hidden="true" />
              <span>Agency: Ansariya Khatun · Zahid Computer</span>
            </div>
            <button
              type="button"
              onClick={() => void onLoadSamples()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#00529B] hover:bg-sky-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Demo Leads</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
