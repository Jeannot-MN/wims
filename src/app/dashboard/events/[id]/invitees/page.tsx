import { InviteesClient } from "./client";

export default function InviteesPage({ params }: { params: { id: string } }) {
  return <InviteesClient eventId={params.id} />;
}
