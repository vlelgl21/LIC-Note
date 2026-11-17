import React, { useEffect, useState } from 'react';
import { Calendar, Check, Loader2, MapPin, RefreshCw, X } from 'lucide-react';
import type { Lead, LeadLocation, LeadStatus, LicPlan } from '../types';
import { addDaysISO, getTodayISO } from '../utils';
import { VoiceDictationControl } from './VoiceDictationControl';

interface LeadFormModalProps {
  isOpen: boolean;
  editingLead: Lead | null;
  onClose: () => void;
  onSave: (data: {
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
  }) => void;
  onError: (msg: string) => void;
}

const VILLAGE_SUGGESTIONS = ['Chuapukur', 'Sagia', 'Lalgola', 'Bhagwangola', 'Jangipur'];
const CHANCE_PRESETS = [25, 50, 75, 90];
const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'Interested', label: 'Interested (আগ্রহী)' },
  { value: 'Follow-up Needed', label: 'Follow-up Needed (ফলো-আপ দরকার)' },
  { value: 'Policy Done', label: 'Policy Done (পলিসি সম্পন্ন)' },
  { value: 'Not Interested', label: 'Not Interested (আগ্রহী নন)' },
];

const PLAN_OPTIONS: { value: LicPlan; label: string }[] = [
  { value: '', label: 'Select Plan (ঐচ্ছিক / Optional)' },
  { value: 'Jeevan Labh', label: 'Jeevan Labh (জীবন লাভ)' },
  { value: 'Jeevan Umang', label: 'Jeevan Umang (জীবন উমঙ্গ)' },
  { value: 'Children Plan', label: 'Children Plan (শিশুদের প্ল্যান)' },
  { value: 'Term Insurance', label: 'Term Insurance (টার্ম ইনস্যুরেন্স)' },
  { value: 'Pension / Other', label: 'Pension / Other (পেনশন / অন্যান্য)' },
];

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  editingLead,
  onClose,
  onSave,
  onError,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [ageOccupation, setAgeOccupation] = useState('');
  const [visitDate, setVisitDate] = useState(getTodayISO());
  const [notes, setNotes] = useState('');
  const [conversionChance, setConversionChance] = useState(50);
  const [status, setStatus] = useState<LeadStatus>('Interested');
  const [plan, setPlan] = useState<LicPlan>('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [pinToMap, setPinToMap] = useState(false);
  const [location, setLocation] = useState<LeadLocation | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLocLoading(false);
    setLocError('');
    if (editingLead) {
      setName(editingLead.name);
      setMobile(editingLead.mobile);
      setVillage(editingLead.village);
      setAgeOccupation(editingLead.ageOccupation);
      setVisitDate(editingLead.visitDate || getTodayISO());
      setNotes(editingLead.notes);
      setConversionChance(editingLead.conversionChance);
      setStatus(editingLead.status);
      setPlan(editingLead.plan);
      setNextFollowUp(editingLead.nextFollowUp);
      const existingLoc = editingLead.location || null;
      setLocation(existingLoc);
      setPinToMap(Boolean(existingLoc));
    } else {
      setName('');
      setMobile('');
      setVillage('');
      setAgeOccupation('');
      setVisitDate(getTodayISO());
      setNotes('');
      setConversionChance(50);
      setStatus('Interested');
      setPlan('');
      setNextFollowUp('');
      setLocation(null);
      setPinToMap(false);
    }
  }, [isOpen, editingLead]);

  if (!isOpen) return null;

  const captureCurrentCoordinates = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocError('GPS location is not supported on this device/browser.');
      setPinToMap(false);
      return;
    }

    setLocLoading(true);
    setLocError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          capturedAt: new Date().toISOString(),
        });
        setPinToMap(true);
        setLocLoading(false);
      },
      (err) => {
        setLocLoading(false);
        setPinToMap(false);
        setLocation(null);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError('Location permission denied. Allow GPS access to pin coordinates.');
        } else if (err.code === err.TIMEOUT) {
          setLocError('GPS timed out. Try again outdoors with location enabled.');
        } else {
          setLocError('Unable to fetch current GPS coordinates.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleTogglePinToMap = () => {
    if (pinToMap) {
      setPinToMap(false);
      setLocation(null);
      setLocError('');
      setLocLoading(false);
    } else {
      setPinToMap(true);
      captureCurrentCoordinates();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasAnyCoreDetail =
      name.trim() !== '' ||
      mobile.trim() !== '' ||
      village.trim() !== '' ||
      ageOccupation.trim() !== '' ||
      notes.trim() !== '' ||
      plan !== '' ||
      location !== null;

    if (!hasAnyCoreDetail) {
      onError('Please enter at least one detail (Name, Mobile, Village, Note, or GPS Pin).');
      return;
    }

    onSave({
      name: name.trim(),
      mobile: mobile.trim(),
      village: village.trim(),
      ageOccupation: ageOccupation.trim(),
      visitDate: visitDate || getTodayISO(),
      notes: notes.trim(),
      conversionChance,
      status,
      plan,
      nextFollowUp,
      location: pinToMap ? location : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-form-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Drag handle on mobile */}
        <div className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 id="lead-form-title" className="text-lg font-bold text-[#003B73]">
              {editingLead ? 'Edit Client Visit' : 'Quick Add Field Visit'}
            </h2>
            <p className="text-xs text-slate-500">
              সকল তথ্য ঐচ্ছিক — শুধু নাম, মোবাইল বা নোট দিয়েও সেভ করা যাবে
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-name" className="block text-sm font-semibold text-slate-800">
                Client Name <span className="font-normal text-slate-500">(নাম)</span>
              </label>
              <input
                id="lead-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abdul Karim"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              />
            </div>

            <div>
              <label htmlFor="lead-mobile" className="block text-sm font-semibold text-slate-800">
                Mobile Number <span className="font-normal text-slate-500">(মোবাইল নাম্বার)</span>
              </label>
              <input
                id="lead-mobile"
                type="tel"
                inputMode="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit number"
                className="font-mono-tabular mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              />
            </div>
          </div>

          {/* Village / Area with quick tap helpers */}
          <div>
            <label htmlFor="lead-village" className="block text-sm font-semibold text-slate-800">
              Address / Village / Area{' '}
              <span className="font-normal text-slate-500">(ঠিকানা / গ্রাম)</span>
            </label>
            <input
              id="lead-village"
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Chuapukur, Sagia, Lalgola"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VILLAGE_SUGGESTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVillage(v)}
                  className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    village.trim().toLowerCase() === v.toLowerCase()
                      ? 'border-[#00529B] bg-[#00529B] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Pin to Map GPS Toggle */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <MapPin className="h-4 w-4 text-[#00529B]" aria-hidden="true" />
                  <span>Pin to Map</span>
                  <span className="font-normal text-slate-500">(GPS পিন)</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Saves your current phone GPS coordinates for direct navigation later.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={pinToMap}
                aria-label="Pin to Map"
                onClick={handleTogglePinToMap}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00529B] ${
                  pinToMap ? 'bg-[#00529B]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    pinToMap ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {locLoading && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[#00529B]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Capturing current GPS coordinates...</span>
              </p>
            )}

            {!locLoading && location && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                <span className="font-mono-tabular font-semibold text-emerald-900">
                  Pinned: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={captureCurrentCoordinates}
                  className="inline-flex items-center gap-1 font-semibold text-[#00529B] hover:underline"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  <span>Refresh GPS</span>
                </button>
              </div>
            )}

            {locError && (
              <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                {locError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-age-occ" className="block text-sm font-semibold text-slate-800">
                Age & Occupation{' '}
                <span className="font-normal text-slate-500">(বয়স ও পেশা)</span>
              </label>
              <input
                id="lead-age-occ"
                type="text"
                value={ageOccupation}
                onChange={(e) => setAgeOccupation(e.target.value)}
                placeholder="e.g. 35 yrs, Business / Farmer"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              />
            </div>

            <div>
              <label htmlFor="lead-visit-date" className="block text-sm font-semibold text-slate-800">
                Visit Date <span className="font-normal text-slate-500">(ভিজিটের তারিখ)</span>
              </label>
              <input
                id="lead-visit-date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="tabular-nums mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="lead-notes" className="block text-sm font-semibold text-slate-800">
              Discussion Notes / Response{' '}
              <span className="font-normal text-slate-500">(কী কথা হলো / নোটস)</span>
            </label>
            <textarea
              id="lead-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write or dictate client interest, budget, or family details..."
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
            />
            <VoiceDictationControl
              onAppendTranscript={(spoken) =>
                setNotes((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
              }
            />
          </div>

          {/* Conversion Chance Slider + Presets */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="lead-chance" className="text-sm font-semibold text-slate-800">
                Conversion Chance % <span className="font-normal text-slate-500">(সম্ভাবনা)</span>
              </label>
              <span className="font-mono-tabular text-base font-bold text-[#00529B]">
                {conversionChance}%
              </span>
            </div>
            <input
              id="lead-chance"
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
              <label htmlFor="lead-status" className="block text-sm font-semibold text-slate-800">
                Status <span className="font-normal text-slate-500">(স্ট্যাটাস)</span>
              </label>
              <select
                id="lead-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="lead-plan" className="block text-sm font-semibold text-slate-800">
                Suggested LIC Plan{' '}
                <span className="font-normal text-slate-500">(প্রস্তাবিত প্ল্যান)</span>
              </label>
              <select
                id="lead-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value as LicPlan)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
              >
                {PLAN_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div>
            <label htmlFor="lead-followup" className="block text-sm font-semibold text-slate-800">
              Next Follow-up Date{' '}
              <span className="font-normal text-slate-500">(পরবর্তী দেখা করার তারিখ)</span>
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="lead-followup"
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="tabular-nums min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pr-3 pl-9 py-2 text-base text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
                />
              </div>
              {nextFollowUp && (
                <button
                  type="button"
                  onClick={() => setNextFollowUp('')}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNextFollowUp(getTodayISO())}
                className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Today
              </button>
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
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white px-5 pt-3 pb-1 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-xl bg-[#00529B] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#003B73] active:scale-[0.99]"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>{editingLead ? 'Update Visit (আপডেট)' : 'Save Visit (সেভ করুন)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
