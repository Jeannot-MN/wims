"use client";

import { useEffect, useRef, useState } from "react";

export type SelectedPlace = {
  place_id: string | null;
  formatted_address: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (input: HTMLInputElement, opts: object) => {
            addListener: (event: string, fn: () => void) => void;
            getPlace: () => {
              place_id?: string;
              formatted_address?: string;
              geometry?: { location?: { lat: () => number; lng: () => number } };
            };
          };
        };
      };
    };
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const SCRIPT_ID = "wims-google-places-script";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!API_KEY) return reject(new Error("No API key"));
    if (typeof window === "undefined") return reject(new Error("ssr"));
    if (window.google?.maps?.places) return resolve();
    if (document.getElementById(SCRIPT_ID)) {
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Places"));
    document.head.appendChild(script);
  });
}

export function PlacesAutocomplete({
  initial,
  onChange,
}: {
  initial?: Partial<SelectedPlace>;
  onChange: (place: SelectedPlace) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [available, setAvailable] = useState(Boolean(API_KEY));
  const [text, setText] = useState(initial?.formatted_address ?? initial?.address_text ?? "");

  useEffect(() => {
    if (!API_KEY) return;
    loadScript()
      .then(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode", "establishment"] as unknown as object,
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          const result: SelectedPlace = {
            place_id: place.place_id ?? null,
            formatted_address: place.formatted_address ?? "",
            latitude: loc?.lat() ?? null,
            longitude: loc?.lng() ?? null,
            address_text: place.formatted_address ?? "",
          };
          setText(result.formatted_address);
          onChange(result);
        });
      })
      .catch(() => setAvailable(false));
  }, [onChange]);

  if (!available) {
    return (
      <div className="space-y-1">
        <input
          className="input"
          placeholder="Enter address"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onChange({
              place_id: null,
              formatted_address: e.target.value,
              latitude: null,
              longitude: null,
              address_text: e.target.value,
            });
          }}
        />
        <p className="text-xs text-ink/50">
          Google Places not configured — using plain text. Set NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to enable the picker.
        </p>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      className="input"
      placeholder="Search for a venue or address"
      defaultValue={text}
      onChange={(e) => setText(e.target.value)}
    />
  );
}
