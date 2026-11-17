import React, { useEffect, useState } from 'react';
import { ExternalLink, MapPin, Navigation, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { Lead } from '../types';

interface MapPreviewModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export const MapPreviewModal: React.FC<MapPreviewModalProps> = ({ lead, onClose }) => {
  const isOnline = useOnlineStatus();
  const [includeDistrict, setIncludeDistrict] = useState(true);
  const [customQuery, setCustomQuery] = useState('');

  useEffect(() => {
    if (!lead) return;
    setCustomQuery(lead.village.trim());
    // Default to appending local Murshidabad/West Bengal context for short single-word village names
    setIncludeDistrict(!lead.village.includes(','));
  }, [lead]);

  if (!lead) return null;

  const hasPinnedCoords =
    Boolean(lead.location) &&
    Number.isFinite(lead.location?.lat) &&
    Number.isFinite(lead.location?.lng);

  const coordString = hasPinnedCoords
    ? `${lead.location!.lat},${lead.location!.lng}`
    : '';

  const baseAddress = customQuery.trim() || lead.village.trim();
  const effectiveQuery =
    includeDistrict && baseAddress && !baseAddress.toLowerCase().includes('murshidabad')
      ? `${baseAddress}, Murshidabad, West Bengal`
      : baseAddress;

  const mapQuery = coordString && customQuery.trim() === lead.village.trim()
    ? coordString
    : effectiveQuery || coordString;

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    mapQuery
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    mapQuery
  )}`;

  const osmUrl = hasPinnedCoords && customQuery.trim() === lead.village.trim()
    ? `https://www.openstreetmap.org/?mlat=${lead.location!.lat}&mlon=${lead.location!.lng}#map=16/${lead.location!.lat}/${lead.location!.lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(effectiveQuery)}`;

  const clientTitle = lead.name.trim() || 'Client Location';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 id="map-modal-title" className="truncate text-lg font-bold text-[#003B73]">
              {clientTitle}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#00529B]" aria-hidden="true" />
              <span className="truncate">{effectiveQuery}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close map preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Lightweight Map Viewport (Iframe when online, Static SVG Map Placeholder when offline) */}
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-72">
            {isOnline ? (
              <iframe
                title={`Map preview for ${effectiveQuery}`}
                src={embedUrl}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#EEF3F8] p-5 text-center">
                {/* Lightweight vector street-grid placeholder */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
                  viewBox="0 0 400 240"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect width="400" height="240" fill="#EEF3F8" />
                  <path
                    d="M0 55 H400 M0 120 H400 M0 185 H400 M80 0 V240 M200 0 V240 M320 0 V240"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                  />
                  <path
                    d="M-10 210 Q130 140 210 115 T410 40"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M40 -10 Q140 90 245 140 T380 250"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00529B] text-[#FDB913] shadow-md ring-4 ring-white">
                    <MapPin className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="mt-3 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 text-sm font-bold text-slate-900 shadow-xs">
                    {effectiveQuery}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-900">
                    <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Offline mode — tap Directions below when signal returns</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Search Refinement Control */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="map-query-input" className="text-xs font-semibold text-slate-700">
                Refine Location Query (ঠিকানা পরিবর্তন / সার্চ)
              </label>
              <button
                type="button"
                onClick={() => setIncludeDistrict((prev) => !prev)}
                className={`min-h-[34px] rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  includeDistrict
                    ? 'border-[#00529B] bg-[#00529B] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                + Murshidabad, WB
              </button>
            </div>
            <input
              id="map-query-input"
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Enter village, landmark, or PIN code"
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#00529B] focus:outline-none focus:ring-2 focus:ring-[#00529B]/20"
            />
          </div>

          {/* Navigation Actions */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-xl bg-[#00529B] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#003B73]"
            >
              <Navigation className="h-4 w-4 text-[#FDB913]" aria-hidden="true" />
              <span>Navigate in Google Maps</span>
            </a>

            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>OpenStreetMap</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
