"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gql } from "@/web/client/graphql-client";

const Q = `
  query Events {
    events { id title starts_at }
  }
`;

type Event = { id: string; title: string; starts_at: string };

export function EventsList() {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    gql<{ events: Event[] }>(Q).then((d) => setEvents(d.events)).catch(() => setEvents([]));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Your events</h1>
        <Link className="btn-primary" href="/dashboard/events/new">Create event</Link>
      </div>
      {events === null ? (
        <p className="text-ink/60 text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ink/60 mb-4">No events yet.</p>
          <Link className="btn-primary" href="/dashboard/events/new">Create your first event</Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link className="card block hover:border-rose/40 transition" href={`/dashboard/events/${e.id}`}>
                <div className="font-display text-2xl">{e.title}</div>
                <div className="text-ink/60 text-sm mt-1">
                  {new Date(e.starts_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
