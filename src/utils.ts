import type { BackupPayload, Lead, LeadStatus, LicPlan, VisitHistoryEntry } from './types';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const d = new Date(year, month, day);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimestamp(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLastContacted(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const timePart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameDay) {
    return `Today, ${timePart}`;
  }
  const datePart = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
  return `${datePart}, ${timePart}`;
}

export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

export function buildTelUrl(mobile: string): string | null {
  const cleaned = mobile.replace(/[^\d+]/g, '');
  if (!cleaned || cleaned.replace(/\D/g, '').length < 6) return null;
  return `tel:${cleaned}`;
}

export function buildWhatsAppUrl(lead: Lead): string | null {
  const normalized = normalizeIndianPhone(lead.mobile);
  if (!normalized || normalized.length < 10) return null;

  const clientGreeting = lead.name.trim()
    ? `নমস্কার / আদাব ${lead.name.trim()} জী,`
    : `নমস্কার / আদাব,`;

  const planLine = lead.plan
    ? `আপনার সাথে "${lead.plan}" LIC পলিসি নিয়ে যে কথা হয়েছিল, সেই বিষয়ে কিছু তথ্য শেয়ার করার ছিল।`
    : `আপনার ও আপনার পরিবারের সুরক্ষার জন্য উপযুক্ত LIC পলিসি নিয়ে কথা বলার ছিল।`;

  const message = [
    clientGreeting,
    `আমি আনসারিয়া খাতুন (LIC Advisor · Zahid Computer) বলছি।`,
    planLine,
    `কখন কথা বললে আপনার সুবিধা হবে জানাবেন। ধন্যবাদ!`,
  ].join('\n');

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function getChanceColorMeta(chance: number): {
  barClass: string;
  textClass: string;
  tierLabel: string;
} {
  if (chance >= 70) {
    return {
      barClass: 'bg-emerald-600',
      textClass: 'text-emerald-700',
      tierLabel: 'High',
    };
  }
  if (chance >= 40) {
    return {
      barClass: 'bg-amber-500',
      textClass: 'text-amber-800',
      tierLabel: 'Medium',
    };
  }
  return {
    barClass: 'bg-slate-400',
    textClass: 'text-slate-600',
    tierLabel: 'Low',
  };
}

export function getStatusLabelMeta(status: LeadStatus): {
  textClass: string;
  bgClass: string;
  bengali: string;
} {
  switch (status) {
    case 'Policy Done':
      return {
        textClass: 'text-emerald-800',
        bgClass: 'bg-emerald-50 border-emerald-200',
        bengali: 'পলিসি সম্পন্ন',
      };
    case 'Interested':
      return {
        textClass: 'text-[#00529B]',
        bgClass: 'bg-sky-50 border-sky-200',
        bengali: 'আগ্রহী',
      };
    case 'Follow-up Needed':
      return {
        textClass: 'text-amber-900',
        bgClass: 'bg-amber-50 border-amber-300',
        bengali: 'ফলো-আপ দরকার',
      };
    case 'Not Interested':
      return {
        textClass: 'text-red-700',
        bgClass: 'bg-red-50 border-red-200',
        bengali: 'আগ্রহী নন',
      };
  }
}

export function exportLeadsToJSON(leads: Lead[]): void {
  const payload: BackupPayload = {
    app: 'LIC Field Visit & Lead Tracker',
    agency: 'Ansariya Khatun / Zahid Computer',
    exportedAt: new Date().toISOString(),
    version: 1,
    leads,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  triggerDownload(blob, `lic-leads-backup-${getTodayISO()}.json`);
}

function escapeCSV(val: string | number | undefined): string {
  const str = String(val ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCoordinateDirectionsUrl(lead: Lead): string | null {
  if (
    lead.location &&
    typeof lead.location.lat === 'number' &&
    typeof lead.location.lng === 'number' &&
    Number.isFinite(lead.location.lat) &&
    Number.isFinite(lead.location.lng)
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lead.location.lat},${lead.location.lng}`;
  }
  return null;
}

export function exportLeadsToCSV(leads: Lead[]): void {
  const headers = [
    'Client Name',
    'Mobile Number',
    'Village / Area',
    'GPS Coordinates',
    'Age & Occupation',
    'Visit Date',
    'Conversion Chance %',
    'Status',
    'Suggested LIC Plan',
    'Next Follow-up Date',
    'Last Contacted',
    'Latest Notes',
    'Total Visits Logged',
    'Full Visit History',
  ];

  const rows = leads.map((lead) => {
    const historySummary = (lead.history || [])
      .map((h) => `[${h.date}] (${h.status}, ${h.conversionChance}%) ${h.note}`)
      .join(' | ');

    const coordStr =
      lead.location && Number.isFinite(lead.location.lat) && Number.isFinite(lead.location.lng)
        ? `${lead.location.lat.toFixed(6)}, ${lead.location.lng.toFixed(6)}`
        : '';

    const lastContactStr = lead.lastContactedAt
      ? `${lead.lastContactMethod || 'Contact'} · ${formatTimestamp(lead.lastContactedAt)}`
      : '';

    return [
      escapeCSV(lead.name),
      escapeCSV(lead.mobile),
      escapeCSV(lead.village),
      escapeCSV(coordStr),
      escapeCSV(lead.ageOccupation),
      escapeCSV(lead.visitDate),
      escapeCSV(lead.conversionChance),
      escapeCSV(lead.status),
      escapeCSV(lead.plan),
      escapeCSV(lead.nextFollowUp),
      escapeCSV(lastContactStr),
      escapeCSV(lead.notes),
      escapeCSV(Math.max(1, (lead.history || []).length)),
      escapeCSV(historySummary),
    ].join(',');
  });

  // UTF-8 BOM ensures Bengali text renders cleanly in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `lic-field-visits-${getTodayISO()}.csv`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const VALID_STATUSES: LeadStatus[] = [
  'Interested',
  'Follow-up Needed',
  'Policy Done',
  'Not Interested',
];

const VALID_PLANS: LicPlan[] = [
  '',
  'Jeevan Labh',
  'Jeevan Umang',
  'Children Plan',
  'Term Insurance',
  'Pension / Other',
];

export function parseBackupJSON(rawText: string): Lead[] {
  const parsed = JSON.parse(rawText);
  const rawList: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as BackupPayload).leads)
      ? (parsed as BackupPayload).leads
      : [];

  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error('No lead records found in this JSON file.');
  }

  const nowIso = new Date().toISOString();
  const todayIso = getTodayISO();

  return rawList.map((item): Lead => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const status = VALID_STATUSES.includes(obj.status as LeadStatus)
      ? (obj.status as LeadStatus)
      : 'Interested';
    const plan = VALID_PLANS.includes(obj.plan as LicPlan) ? (obj.plan as LicPlan) : '';
    const chanceRaw = Number(obj.conversionChance);
    const conversionChance = Number.isFinite(chanceRaw)
      ? Math.min(100, Math.max(0, Math.round(chanceRaw)))
      : 50;

    const history: VisitHistoryEntry[] = Array.isArray(obj.history)
      ? obj.history.map((h) => {
          const ho = (h && typeof h === 'object' ? h : {}) as Record<string, unknown>;
          return {
            id: typeof ho.id === 'string' && ho.id ? ho.id : generateId(),
            date: typeof ho.date === 'string' ? ho.date : todayIso,
            createdAt: typeof ho.createdAt === 'string' ? ho.createdAt : nowIso,
            note: typeof ho.note === 'string' ? ho.note : '',
            conversionChance: Number.isFinite(Number(ho.conversionChance))
              ? Math.min(100, Math.max(0, Math.round(Number(ho.conversionChance))))
              : conversionChance,
            status: VALID_STATUSES.includes(ho.status as LeadStatus)
              ? (ho.status as LeadStatus)
              : status,
          };
        })
      : [];

    const rawLoc = obj.location as Record<string, unknown> | undefined | null;
    const location =
      rawLoc &&
      typeof rawLoc === 'object' &&
      Number.isFinite(Number(rawLoc.lat)) &&
      Number.isFinite(Number(rawLoc.lng))
        ? {
            lat: Number(rawLoc.lat),
            lng: Number(rawLoc.lng),
            capturedAt:
              typeof rawLoc.capturedAt === 'string' ? rawLoc.capturedAt : undefined,
          }
        : null;

    return {
      id: typeof obj.id === 'string' && obj.id ? obj.id : generateId(),
      name: typeof obj.name === 'string' ? obj.name : '',
      mobile: typeof obj.mobile === 'string' ? obj.mobile : '',
      village: typeof obj.village === 'string' ? obj.village : '',
      ageOccupation: typeof obj.ageOccupation === 'string' ? obj.ageOccupation : '',
      visitDate: typeof obj.visitDate === 'string' ? obj.visitDate : todayIso,
      notes: typeof obj.notes === 'string' ? obj.notes : '',
      conversionChance,
      status,
      plan,
      nextFollowUp: typeof obj.nextFollowUp === 'string' ? obj.nextFollowUp : '',
      location,
      lastContactedAt: typeof obj.lastContactedAt === 'string' ? obj.lastContactedAt : null,
      lastContactMethod:
        obj.lastContactMethod === 'Call' || obj.lastContactMethod === 'WhatsApp'
          ? obj.lastContactMethod
          : null,
      history,
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : nowIso,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : nowIso,
    };
  });
}

export function createSampleLeads(): Lead[] {
  const today = getTodayISO();
  const tomorrow = addDaysISO(1);
  const now = new Date().toISOString();

  return [
    {
      id: generateId(),
      name: 'Abdul Karim Mondal',
      mobile: '9832145670',
      village: 'Chuapukur',
      ageOccupation: '36 yrs · Hardware Shop',
      visitDate: today,
      notes: 'Interested in 20-year Jeevan Labh for daughter education. Asked for yearly ₹24,000 premium chart.',
      conversionChance: 85,
      status: 'Interested',
      plan: 'Jeevan Labh',
      nextFollowUp: today,
      history: [
        {
          id: generateId(),
          date: today,
          createdAt: now,
          note: 'Initial shop visit. Discussed Jeevan Labh ₹24,000/yr savings plan.',
          conversionChance: 85,
          status: 'Interested',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Sabina Yasmin',
      mobile: '9734512890',
      village: 'Lalgola',
      ageOccupation: '31 yrs · Primary Teacher',
      visitDate: today,
      notes: 'Wants guaranteed lifelong pension option after age 55. Requested Aadhaar + PAN checklist.',
      conversionChance: 75,
      status: 'Follow-up Needed',
      plan: 'Jeevan Umang',
      nextFollowUp: tomorrow,
      history: [
        {
          id: generateId(),
          date: today,
          createdAt: now,
          note: 'Met near Lalgola school gate. Liked Jeevan Umang 15-year PPT.',
          conversionChance: 75,
          status: 'Follow-up Needed',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Rafikul Islam',
      mobile: '9434098712',
      village: 'Sagia',
      ageOccupation: '42 yrs · Wholesale Rice Trader',
      visitDate: today,
      notes: 'Proposal form submitted & first premium cheque collected. Policy bond awaited.',
      conversionChance: 100,
      status: 'Policy Done',
      plan: 'Jeevan Labh',
      nextFollowUp: '',
      history: [
        {
          id: generateId(),
          date: today,
          createdAt: now,
          note: 'Policy closed! 10L Sum Assured Jeevan Labh completed.',
          conversionChance: 100,
          status: 'Policy Done',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}
