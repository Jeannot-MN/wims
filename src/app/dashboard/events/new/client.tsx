"use client";

import { useRouter } from "next/navigation";
import { EventForm, emptyFormValues } from "@/web/client/event-form";

export function NewEventClient() {
  const router = useRouter();
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">New event</h1>
      <EventForm initial={emptyFormValues()} onSaved={(id) => router.push(`/dashboard/events/${id}`)} />
    </div>
  );
}
