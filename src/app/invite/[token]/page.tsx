import { InvitePageClient } from "./client";

export default function InvitePage({ params }: { params: { token: string } }) {
  return <InvitePageClient token={params.token} />;
}
