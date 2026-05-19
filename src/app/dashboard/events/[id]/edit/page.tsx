import { EditEventClient } from "./client";

export default function EditEventPage({ params }: { params: { id: string } }) {
  return <EditEventClient id={params.id} />;
}
