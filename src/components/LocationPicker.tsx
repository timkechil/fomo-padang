'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import CoordHelp from './CoordHelp';

/**
 * V1.3 §13/§14 — one location component for all four forms (admin event,
 * admin place, public Kasih Info Event, public Kasih Info Tempat).
 *
 * Google Places Autocomplete is used **only if** NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * is configured. It is a progressive enhancement, never a dependency:
 *
 *   - no key            → the search box is not rendered at all
 *   - script fails/blocked → we surface a quiet note and keep going
 *   - quota exceeded    → same
 *
 * In every one of those cases the venue, address, latitude and longitude
 * inputs remain ordinary editable fields with the `?` coordinate help beside
 * them, so location entry never depends on a third party being reachable.
 */

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface Suggestion {
  description: string;
  placeId: string;
}

declare global {
  interface Window {
    google?: any;
    __fomoGoogleMapsPromise?: Promise<void>;
  }
}

function loadGoogle(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('server'));
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__fomoGoogleMapsPromise) return window.__fomoGoogleMapsPromise;

  window.__fomoGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&language=id&region=ID`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google-maps-failed'));
    document.head.appendChild(script);
  });
  return window.__fomoGoogleMapsPromise;
}

export interface LocationValue {
  venue: string;
  address: string;
  latitude: string;
  longitude: string;
}

export default function LocationPicker({
  names, defaults, venueLabel = 'Nama tempat', showVenue = true,
}: {
  names: { venue: string; address: string; latitude: string; longitude: string };
  defaults?: Partial<LocationValue>;
  venueLabel?: string;
  showVenue?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const [venue, setVenue] = useState(defaults?.venue ?? '');
  const [address, setAddress] = useState(defaults?.address ?? '');
  const [lat, setLat] = useState(defaults?.latitude ?? '');
  const [lng, setLng] = useState(defaults?.longitude ?? '');

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [googleState, setGoogleState] = useState<'off' | 'loading' | 'ready' | 'failed'>(
    GOOGLE_KEY ? 'loading' : 'off',
  );
  const serviceRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!GOOGLE_KEY) return;
    let cancelled = false;
    loadGoogle()
      .then(() => {
        if (cancelled) return;
        serviceRef.current = new window.google.maps.places.AutocompleteService();
        placesRef.current = new window.google.maps.places.PlacesService(
          document.createElement('div'),
        );
        setGoogleState('ready');
      })
      .catch(() => { if (!cancelled) setGoogleState('failed'); });
    return () => { cancelled = true; };
  }, []);

  function search(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (googleState !== 'ready' || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    // Debounced: Places bills per keystroke otherwise.
    timerRef.current = setTimeout(() => {
      setSearching(true);
      serviceRef.current.getPlacePredictions(
        {
          input: value,
          language: 'id',
          componentRestrictions: { country: 'id' },
          locationBias: {
            center: { lat: -0.9471, lng: 100.4172 },   // Padang
            radius: 40000,
          },
        },
        (predictions: any[], status: string) => {
          setSearching(false);
          if (status !== 'OK' || !predictions) { setSuggestions([]); return; }
          setSuggestions(predictions.slice(0, 5).map((p) => ({
            description: p.description, placeId: p.place_id,
          })));
        },
      );
    }, 350);
  }

  function choose(s: Suggestion) {
    setSuggestions([]);
    setQuery(s.description);
    placesRef.current.getDetails(
      { placeId: s.placeId, fields: ['name', 'formatted_address', 'geometry'] },
      (place: any, status: string) => {
        if (status !== 'OK' || !place) return;
        if (place.name) setVenue(place.name);
        if (place.formatted_address) setAddress(place.formatted_address);
        const loc = place.geometry?.location;
        if (loc) {
          setLat(String(loc.lat().toFixed(6)));
          setLng(String(loc.lng().toFixed(6)));
        }
      },
    );
  }

  return (
    <>
      {googleState !== 'off' ? (
        <div className="field locsearch">
          <label htmlFor={`loc-${uid}`}>Cari lokasi</label>
          <p className="hint">
            Ketik nama tempatnya, pilih dari saran, dan alamat serta titik peta terisi otomatis.
          </p>
          <input id={`loc-${uid}`} type="text" autoComplete="off"
            value={query}
            disabled={googleState === 'loading'}
            placeholder={googleState === 'loading' ? 'Menyiapkan pencarian…' : 'Misal: Youth Center Padang'}
            onChange={(e) => search(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />

          {searching ? <p className="hint">Mencari…</p> : null}

          {suggestions.length ? (
            <ul className="locsearch-list" role="listbox">
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button type="button" onClick={() => choose(s)}>
                    <Icon name="pin" size={14} /> {s.description}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {googleState === 'failed' ? (
            <p className="hint">
              Pencarian lokasi otomatis lagi nggak bisa dipakai. Isi manual aja di bawah — sama aja hasilnya.
            </p>
          ) : null}
        </div>
      ) : null}

      {showVenue ? (
        <div className="field">
          <label htmlFor={`venue-${uid}`}>{venueLabel}</label>
          <input id={`venue-${uid}`} name={names.venue} value={venue}
            onChange={(e) => setVenue(e.target.value)} />
        </div>
      ) : null}

      <div className="field">
        <label htmlFor={`addr-${uid}`}>Alamat</label>
        <input id={`addr-${uid}`} name={names.address} value={address}
          onChange={(e) => setAddress(e.target.value)} />
      </div>

      <div className="formgrid">
        <div className="field">
          <label htmlFor={`lat-${uid}`}>Latitude <CoordHelp /></label>
          <input id={`lat-${uid}`} name={names.latitude} inputMode="decimal"
            placeholder="-0.9471" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`lng-${uid}`}>Longitude <CoordHelp /></label>
          <input id={`lng-${uid}`} name={names.longitude} inputMode="decimal"
            placeholder="100.4172" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>
    </>
  );
}
