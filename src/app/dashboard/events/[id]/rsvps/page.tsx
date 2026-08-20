import { RsvpDetailsClient } from "./client";

export default function RsvpDetailsPage({ params }: { params: { id: string } }) {
  return <RsvpDetailsClient eventId={params.id} />;
}
