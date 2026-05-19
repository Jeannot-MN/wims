"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";
import { ImportPanel } from "./import-panel";

const LIST = `
  query L($eventId: ID!, $status: String, $search: String) {
    eventInviteesList(eventId: $eventId, status: $status, search: $search) {
      id invite_token primary_first_name primary_last_name partner_first_name partner_last_name
      email mobile_no rsvp_status is_couple invite_url
    }
  }
`;
const ADD = `
  mutation A($eventId: ID!, $input: InviteeInput!) {
    addInvitee(eventId: $eventId, input: $input) { id }
  }
`;
const DEL = `mutation D($id: ID!) { deleteInvitee(id: $id) }`;
const EXPORT = `mutation E($eventId: ID!) { exportInvitees(eventId: $eventId) { filename base64 } }`;

type Row = {
  id: string;
  invite_token: string;
  primary_first_name: string; primary_last_name: string;
  partner_first_name: string | null; partner_last_name: string | null;
  email: string | null; mobile_no: string | null;
  rsvp_status: string; is_couple: boolean;
  invite_url: string;
};

export function InviteesClient({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await gql<{ eventInviteesList: Row[] }>(LIST, {
        eventId,
        status: statusFilter === "all" ? null : statusFilter,
        search: search || null,
      });
      setRows(data.eventInviteesList);
    } catch (e) {
      setError(e instanceof GraphQLRequestError ? e.message : "Load failed");
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDelete = async (id: string) => {
    if (!confirm("Remove this invitee? Their invite URL will stop working.")) return;
    await gql(DEL, { id });
    void load();
  };

  const onExport = async () => {
    const d = await gql<{ exportInvitees: { filename: string; base64: string } }>(EXPORT, { eventId });
    const blob = await (await fetch(`data:application/octet-stream;base64,${d.exportInvitees.base64}`)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = d.exportInvitees.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/events/${eventId}`} className="text-sm text-ink/60 hover:underline">← back to event</Link>
          <h1 className="font-display text-3xl mt-1">Invitees</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowImport(true)}>Upload Excel</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>Add invitee</button>
          <button className="btn-ghost" onClick={onExport}>Export</button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <input className="input flex-1" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="maybe">Maybe</option>
        </select>
      </div>

      {error && <p className="text-rose text-sm">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-xs uppercase tracking-wider text-ink/60">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Invite URL</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-ink/50">No invitees yet.</td>
              </tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-ink/5">
                <td className="p-3">
                  <div>{r.primary_first_name} {r.primary_last_name}</div>
                  {r.is_couple && (
                    <div className="text-xs text-ink/60">& {r.partner_first_name} {r.partner_last_name}</div>
                  )}
                </td>
                <td className="p-3 text-xs text-ink/70">
                  {r.email ? <div>{r.email}</div> : <div className="text-ink/40">no email</div>}
                  {r.mobile_no ? <div>{r.mobile_no}</div> : <div className="text-ink/40">no phone</div>}
                </td>
                <td className="p-3">
                  <span className={`badge-${r.rsvp_status}`}>{r.rsvp_status}</span>
                </td>
                <td className="p-3">
                  <button className="text-xs underline text-ink/70" onClick={() => navigator.clipboard.writeText(r.invite_url)}>
                    Copy URL
                  </button>
                  <a className="text-xs underline text-ink/70 ml-3" href={`/invite/${r.invite_token}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                </td>
                <td className="p-3 text-right">
                  <button className="text-xs text-rose hover:underline" onClick={() => onDelete(r.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddInviteeModal eventId={eventId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); void load(); }} />}
      {showImport && <ImportPanel eventId={eventId} onClose={() => setShowImport(false)} onCommitted={() => { setShowImport(false); void load(); }} />}
    </div>
  );
}

function AddInviteeModal({ eventId, onClose, onSaved }: { eventId: string; onClose: () => void; onSaved: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isCouple, setIsCouple] = useState(false);
  const [partnerFirst, setPartnerFirst] = useState("");
  const [partnerLast, setPartnerLast] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await gql(ADD, {
        eventId,
        input: {
          primary_first_name: firstName,
          primary_last_name: lastName,
          partner_first_name: isCouple ? partnerFirst : null,
          partner_last_name: isCouple ? partnerLast : null,
          email: emailAddr || null,
          mobile_no: mobile || null,
        },
      });
      onSaved();
    } catch (e) {
      setError(e instanceof GraphQLRequestError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-20">
      <form onSubmit={submit} className="bg-white rounded-lg p-6 w-full max-w-md space-y-3">
        <h2 className="font-display text-2xl">Add invitee</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className="input" placeholder="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isCouple} onChange={(e) => setIsCouple(e.target.checked)} />
          This is a couple invite
        </label>
        {isCouple && (
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Partner first name" value={partnerFirst} onChange={(e) => setPartnerFirst(e.target.value)} />
            <input className="input" placeholder="Partner last name" value={partnerLast} onChange={(e) => setPartnerLast(e.target.value)} />
          </div>
        )}
        <input className="input" type="email" placeholder="Email (optional)" value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} />
        <input className="input" type="tel" placeholder="Mobile (optional)" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        {error && <p className="text-rose text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Add"}</button>
        </div>
      </form>
    </div>
  );
}
