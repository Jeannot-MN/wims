"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";
import { PlacesAutocomplete, type SelectedPlace } from "./places-autocomplete";

export type EventFormValues = {
  id?: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  rsvp_deadline_at: string;
  location: SelectedPlace;
  dress_code: string;
  gift_registry_url: string;
  cover_image_url: string;
  schedule: { time: string; title: string; description: string }[];
  custom_sections: { heading: string; body: string }[];
};

const CREATE = `
  mutation Create($input: EventCreateInput!) { createEvent(input: $input) { id } }
`;
const UPDATE = `
  mutation Update($id: ID!, $input: EventUpdateInput!) { updateEvent(id: $id, input: $input) { id } }
`;

const blankPlace: SelectedPlace = {
  place_id: null,
  formatted_address: "",
  latitude: null,
  longitude: null,
  address_text: "",
};

export function emptyFormValues(): EventFormValues {
  return {
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    rsvp_deadline_at: "",
    location: blankPlace,
    dress_code: "",
    gift_registry_url: "",
    cover_image_url: "",
    schedule: [],
    custom_sections: [],
  };
}

export function EventForm({ initial, onSaved }: { initial: EventFormValues; onSaved: (id: string) => void }) {
  const router = useRouter();
  const [v, setV] = useState<EventFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
    setV((cur) => ({ ...cur, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const input: Record<string, unknown> = {
        title: v.title,
        description: v.description,
        starts_at: new Date(v.starts_at).toISOString(),
        ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
        rsvp_deadline_at: v.rsvp_deadline_at ? new Date(v.rsvp_deadline_at).toISOString() : null,
        location: {
          place_id: v.location.place_id,
          formatted_address: v.location.formatted_address || null,
          latitude: v.location.latitude,
          longitude: v.location.longitude,
          address_text: v.location.address_text || null,
        },
        dress_code: v.dress_code,
        gift_registry_url: v.gift_registry_url,
        cover_image_url: v.cover_image_url,
        schedule: v.schedule,
        custom_sections: v.custom_sections,
      };
      if (v.id) {
        await gql<{ updateEvent: { id: string } }>(UPDATE, { id: v.id, input });
        onSaved(v.id);
      } else {
        const r = await gql<{ createEvent: { id: string } }>(CREATE, { input });
        onSaved(r.createEvent.id);
      }
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const addScheduleItem = () =>
    set("schedule", [...v.schedule, { time: "", title: "", description: "" }]);
  const removeScheduleItem = (i: number) =>
    set("schedule", v.schedule.filter((_, idx) => idx !== i));
  const addSection = () =>
    set("custom_sections", [...v.custom_sections, { heading: "", body: "" }]);
  const removeSection = (i: number) =>
    set("custom_sections", v.custom_sections.filter((_, idx) => idx !== i));

  return (
    <form className="space-y-8" onSubmit={submit}>
      <section className="card space-y-4">
        <h2 className="font-display text-2xl">Basics</h2>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input" required value={v.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" className="input min-h-[120px]" value={v.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="starts">Starts at</label>
            <input id="starts" className="input" type="datetime-local" required value={v.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ends">Ends at (optional)</label>
            <input id="ends" className="input" type="datetime-local" value={v.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="deadline">RSVP deadline (optional — defaults to 30 days before)</label>
          <input id="deadline" className="input" type="datetime-local" value={v.rsvp_deadline_at} onChange={(e) => set("rsvp_deadline_at", e.target.value)} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-2xl">Location</h2>
        <PlacesAutocomplete initial={v.location} onChange={(p) => set("location", p)} />
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-2xl">Details</h2>
        <div>
          <label className="label">Dress code</label>
          <input className="input" value={v.dress_code} onChange={(e) => set("dress_code", e.target.value)} />
        </div>
        <div>
          <label className="label">Gift registry URL</label>
          <input className="input" type="url" value={v.gift_registry_url} onChange={(e) => set("gift_registry_url", e.target.value)} />
        </div>
        <div>
          <label className="label">Cover image URL</label>
          <input className="input" type="url" value={v.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} />
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Schedule</h2>
          <button type="button" className="btn-secondary text-sm" onClick={addScheduleItem}>Add item</button>
        </div>
        {v.schedule.length === 0 ? (
          <p className="text-ink/50 text-sm">No items yet.</p>
        ) : (
          v.schedule.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input className="input col-span-2" placeholder="15:00" value={it.time} onChange={(e) => set("schedule", v.schedule.map((s, idx) => idx === i ? { ...s, time: e.target.value } : s))} />
              <input className="input col-span-4" placeholder="Title" value={it.title} onChange={(e) => set("schedule", v.schedule.map((s, idx) => idx === i ? { ...s, title: e.target.value } : s))} />
              <input className="input col-span-5" placeholder="Description" value={it.description} onChange={(e) => set("schedule", v.schedule.map((s, idx) => idx === i ? { ...s, description: e.target.value } : s))} />
              <button type="button" className="btn-ghost text-xs col-span-1" onClick={() => removeScheduleItem(i)}>Remove</button>
            </div>
          ))
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Custom sections</h2>
          <button type="button" className="btn-secondary text-sm" onClick={addSection}>Add section</button>
        </div>
        {v.custom_sections.length === 0 ? (
          <p className="text-ink/50 text-sm">e.g. Accommodation, Travel, FAQ.</p>
        ) : (
          v.custom_sections.map((s, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <input className="input" placeholder="Heading" value={s.heading} onChange={(e) => set("custom_sections", v.custom_sections.map((c, idx) => idx === i ? { ...c, heading: e.target.value } : c))} />
                <button type="button" className="btn-ghost text-xs ml-2" onClick={() => removeSection(i)}>Remove</button>
              </div>
              <textarea className="input min-h-[80px]" placeholder="Body" value={s.body} onChange={(e) => set("custom_sections", v.custom_sections.map((c, idx) => idx === i ? { ...c, body: e.target.value } : c))} />
            </div>
          ))
        )}
      </section>

      {error && <p className="text-rose text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : v.id ? "Save changes" : "Create event"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
