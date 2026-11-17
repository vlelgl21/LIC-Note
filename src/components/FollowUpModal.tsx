import React, { useEffect, useState } from 'react';
import { CalendarPlus, Check, X } from 'lucide-react';
import type { Lead, LeadStatus } from '../types';
import { addDaysISO, getTodayISO } from '../utils';
import { VoiceDictationControl } from './VoiceDictationControl';

interface FollowUpModalProps {
  lead: Lead | null;
  onClose: () => void;
  onLogVisit: (
    leadId: string,
    payload: {
      visitDate: string;
      note: string;
      conversionChance: number;
      status: LeadStatus;
      nextFollowUp: string;
    }
  ) => void;
}

const CHANCE_PRESETS = [25, 50, 75, 90];

export const FollowUpModal: React.FC<FollowUpModalProps> = ({ lead, onClose, onLogVisit }) => {
  const [visitDate, setVisitDate] = useState(getTodayISO());
  const [note, setNote] = useState('');
  const [conversionChance, setConversionChance] = useState(50);
  const [status, setStatus] = useState<LeadStatus>('Interested');
  const [nextFollowUp, setNextFollowUp] = useState('');

  useEffect(() => {
    if (!lead) return;
    setVisitDate(getTodayISO());
    setNote('');
    setConversionChance(lead.conversionChance);
    setStatus(lead.status);
    setNextFollowUp(lead.nextFollowUp || '');
  }, [lead]);

  if (!lead) return null;

  const displayTitle = lead.name.trim() || lead.village.trim() || lead.mobile.trim() || 'Client';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogVisit(lead.id, {
      visitDate: visitDate || getTodayISO(),
      note: note.trim(),
      conversionChance,
      status,
      nextFollowUp,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="followup-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 id="followup-modal-title" className="truncate text-lg font-bold text-[#003B73]">
              Log New Visit · {displayTitle}
            </h2>
            <p className="text-xs text-slate-500">
              নতুন নোট যোগ হবে (আগের কোনো নোট মুছে যাবে না)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
            aria-label="Close follow-up modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label htmlFor="fu-date" className="block text-sm font-semibold text-slate-800">
              Visit Date <span className="font-normal text-slate-500">(আজকের তারিখ)</span>
            </label>
            <input
              id="fu-date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="tabular-nums mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
            />
          </div>

          <div>
            <label htmlFor="fu-note" className="block text-sm font-semibold text-slate-800">
              New Visit / Call Note <span className="font-normal text-slate-500">(নতুন কী কথা হলো)</span>
            </label>
            <textarea
              id="fu-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Met again at home, spouse agreed, documents ready next week..."
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
            />
            <VoiceDictationControl
              onAppendTranscript={(spoken) =>
                setNote((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
              }
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="fu-chance" className="text-sm font-semibold text-slate-800">
                Updated Chance %
              </label>
              <span className="font-mono-tabular text-base font-bold text-[#00529B]">
                {conversionChance}%
              </span>
            </div>
            <input
              id="fu-chance"
              type="range"
              min={0}
              max={100}
              step={5}
              value={conversionChance}
              onChange={(e) => setConversionChance(Number(e.target.value))}
              className="lic-slider mt-3 w-full cursor-pointer bg-slate-200"
              style={{
                background: `linear-gradient(to right, #00529B 0%, #00529B ${conversionChance}%, #E2E8F0 ${conversionChance}%, #E2E8F0 100%)`,
              }}
            />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {CHANCE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setConversionChance(preset)}
                  className={`min-h-[40px] rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
                    conversionChance === preset
                      ? 'border-[#00529B] bg-[#00529B] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fu-status" className="block text-sm font-semibold text-slate-800">
                Updated Status
              </label>
              <select
                id="fu-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              >
                <option value="Interested">Interested (আগ্রহী)</option>
                <option value="Follow-up Needed">Follow-up Needed (ফলো-আপ দরকার)</option>
                <option value="Policy Done">Policy Done (পলিসি সম্পন্ন)</option>
                <option value="Not Interested">Not Interested (আগ্রহী নন)</option>
              </select>
            </div>

            <div>
              <label htmlFor="fu-next" className="block text-sm font-semibold text-slate-800">
                Next Follow-up Date
              </label>
              <input
                id="fu-next"
                type="date"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                className="tabular-nums mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setNextFollowUp(addDaysISO(1))}
              className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setNextFollowUp(addDaysISO(3))}
              className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => setNextFollowUp(addDaysISO(7))}
              className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              +1 Week
            </button>
            {nextFollowUp && (
              <button
                type="button"
                onClick={() => setNextFollowUp('')}
                className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Clear Date
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-xl bg-[#00529B] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#003B73]"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              <span>Append Visit Log</span>
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
