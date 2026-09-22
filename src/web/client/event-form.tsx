"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";
import { PlacesAutocomplete, type SelectedPlace } from "./places-autocomplete";

export type EventFormValues = {
  id?: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  starts_at: string;
  ends_at: string;
  rsvp_deadline_at: string;
  location: SelectedPlace;
  dress_code: string;
  dress_code_fr: string;
  gift_registry_url: string;
  cover_image_url: string;
  schedule: { time: string; title: string; title_fr: string; description: string; description_fr: string }[];
  custom_sections: { heading: string; heading_fr: string; body: string; body_fr: string }[];
};

const CREATE = `
  mutation Create($input: EventCreateInput!) { createEvent(input: $input) { id } }
`;
const UPDATE = `
  mutation Update($id: ID!, $input: EventUpdateInput!) { updateEvent(id: $id, input: $input) { id } }
`;

/**
 * French is optional everywhere: a guest reading the invitation in French sees
 * the original text wherever the translation is blank.
 */
const FR_LABEL = "🇫🇷";
const FR_HINT = "French fields are optional — leave one blank and the English text is shown instead.";

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
    title_fr: "",
    description: "",
    description_fr: "",
    starts_at: "",
    ends_at: "",
    rsvp_deadline_at: "",
    location: blankPlace,
    dress_code: "",
    dress_code_fr: "",
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
        title_fr: v.title_fr,
        description: v.description,
        description_fr: v.description_fr,
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
        dress_code_fr: v.dress_code_fr,
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
    set("schedule", [
      ...v.schedule,
      { time: "", title: "", title_fr: "", description: "", description_fr: "" },
    ]);
  const removeScheduleItem = (i: number) =>
    set("schedule", v.schedule.filter((_, idx) => idx !== i));
  const addSection = () =>
    set("custom_sections", [
      ...v.custom_sections,
      { heading: "", heading_fr: "", body: "", body_fr: "" },
    ]);
  const removeSection = (i: number) =>
    set("custom_sections", v.custom_sections.filter((_, idx) => idx !== i));

  const setScheduleField = (i: number, key: keyof EventFormValues["schedule"][number], value: string) =>
    set("schedule", v.schedule.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  const setSectionField = (
    i: number,
    key: keyof EventFormValues["custom_sections"][number],
    value: string,
  ) => set("custom_sections", v.custom_sections.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));

  return (
    <form className="space-y-8" onSubmit={submit}>
      <section className="card space-y-4">
        <h2 className="font-display text-2xl">Basics</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" required value={v.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="title_fr">{FR_LABEL} Title</label>
            <input id="title_fr" className="input" value={v.title_fr} onChange={(e) => set("title_fr", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" className="input min-h-[120px]" value={v.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="description_fr">{FR_LABEL} Description</label>
            <textarea id="description_fr" className="input min-h-[120px]" value={v.description_fr} onChange={(e) => set("description_fr", e.target.value)} />
          </div>
        </div>
        <p className="text-ink/50 text-xs">{FR_HINT}</p>
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
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Dress code</label>
            <input className="input" value={v.dress_code} onChange={(e) => set("dress_code", e.target.value)} />
          </div>
          <div>
            <label className="label">{FR_LABEL} Dress code</label>
            <input className="input" value={v.dress_code_fr} onChange={(e) => set("dress_code_fr", e.target.value)} />
          </div>
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
            <div key={i} className="space-y-2 border-t border-ink/10 pt-3 first:border-t-0 first:pt-0">
              <div className="grid grid-cols-12 gap-2">
                <input className="input col-span-2" placeholder="15:00" value={it.time} onChange={(e) => setScheduleField(i, "time", e.target.value)} />
                <input className="input col-span-4" placeholder="Title" value={it.title} onChange={(e) => setScheduleField(i, "title", e.target.value)} />
                <input className="input col-span-5" placeholder="Description" value={it.description} onChange={(e) => setScheduleField(i, "description", e.target.value)} />
                <button type="button" className="btn-ghost text-xs col-span-1" onClick={() => removeScheduleItem(i)}>Remove</button>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-2 self-center text-right text-xs text-ink/40">{FR_LABEL}</span>
                <input className="input col-span-4" placeholder="Titre" value={it.title_fr} onChange={(e) => setScheduleField(i, "title_fr", e.target.value)} />
                <input className="input col-span-5" placeholder="Description" value={it.description_fr} onChange={(e) => setScheduleField(i, "description_fr", e.target.value)} />
              </div>
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
            <div key={i} className="space-y-2 border-t border-ink/10 pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between">
                <input className="input" placeholder="Heading" value={s.heading} onChange={(e) => setSectionField(i, "heading", e.target.value)} />
                <button type="button" className="btn-ghost text-xs ml-2" onClick={() => removeSection(i)}>Remove</button>
              </div>
              <textarea className="input min-h-[80px]" placeholder="Body" value={s.body} onChange={(e) => setSectionField(i, "body", e.target.value)} />
              <div className="grid gap-2 md:grid-cols-[auto_1fr] md:items-start">
                <span className="pt-2 text-xs text-ink/40">{FR_LABEL}</span>
                <div className="space-y-2">
                  <input className="input" placeholder="Titre" value={s.heading_fr} onChange={(e) => setSectionField(i, "heading_fr", e.target.value)} />
                  <textarea className="input min-h-[80px]" placeholder="Texte" value={s.body_fr} onChange={(e) => setSectionField(i, "body_fr", e.target.value)} />
                </div>
              </div>
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
