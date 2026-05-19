"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gql } from "@/web/client/graphql-client";
import { EventForm, type EventFormValues } from "@/web/client/event-form";

const Q = `
  query Q($id: ID!) {
    event(id: $id) {
      id title description starts_at ends_at rsvp_deadline_at
      location { place_id formatted_address latitude longitude address_text }
      dress_code gift_registry_url cover_image_url
      schedule { time title description }
      custom_sections { heading body }
    }
  }
`;

function toLocalDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export function EditEventClient({ id }: { id: string }) {
  const router = useRouter();
  const [initial, setInitial] = useState<EventFormValues | null>(null);

  useEffect(() => {
    gql<{ event: any }>(Q, { id }).then((d) => {
      const e = d.event;
      setInitial({
        id: e.id,
        title: e.title,
        description: e.description,
        starts_at: toLocalDateTime(e.starts_at),
        ends_at: toLocalDateTime(e.ends_at),
        rsvp_deadline_at: toLocalDateTime(e.rsvp_deadline_at),
        location: {
          place_id: e.location.place_id,
          formatted_address: e.location.formatted_address ?? e.location.address_text,
          latitude: e.location.latitude,
          longitude: e.location.longitude,
          address_text: e.location.address_text,
        },
        dress_code: e.dress_code,
        gift_registry_url: e.gift_registry_url,
        cover_image_url: e.cover_image_url,
        schedule: e.schedule,
        custom_sections: e.custom_sections,
      });
    });
  }, [id]);

  if (!initial) return <p className="text-ink/60 text-sm">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Edit event</h1>
      <EventForm initial={initial} onSaved={() => router.push(`/dashboard/events/${id}`)} />
    </div>
  );
}
