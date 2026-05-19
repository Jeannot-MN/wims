"use client";

import { useState } from "react";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const PREVIEW = `
  mutation P($eventId: ID!, $fileBase64: String!) {
    previewInviteeImport(eventId: $eventId, fileBase64: $fileBase64) {
      previewId
      rows { rowIndex status reason primary_first_name primary_last_name email mobile_no }
    }
  }
`;
const COMMIT = `
  mutation C($previewId: String!, $skipRowIndices: [Int!]) {
    commitInviteeImport(previewId: $previewId, skipRowIndices: $skipRowIndices) { id }
  }
`;

type Row = {
  rowIndex: number;
  status: string;
  reason: string | null;
  primary_first_name: string;
  primary_last_name: string;
  email: string | null;
  mobile_no: string | null;
};

export function ImportPanel({ eventId, onClose, onCommitted }: { eventId: string; onClose: () => void; onCommitted: () => void }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const fileBase64 = btoa(String.fromCharCode(...buf));
      const data = await gql<{ previewInviteeImport: { previewId: string; rows: Row[] } }>(PREVIEW, {
        eventId,
        fileBase64,
      });
      setPreviewId(data.previewInviteeImport.previewId);
      setRows(data.previewInviteeImport.rows);
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleSkip = (idx: number) => {
    const next = new Set(skip);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSkip(next);
  };

  const onCommit = async () => {
    if (!previewId) return;
    setBusy(true);
    setError(null);
    try {
      await gql(COMMIT, { previewId, skipRowIndices: Array.from(skip) });
      onCommitted();
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  };

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-20">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Import invitees from Excel</h2>
          <button className="btn-ghost text-sm" onClick={onClose}>Close</button>
        </div>
        <p className="text-ink/60 text-sm">
          Expected columns: <code>first_name</code>, <code>last_name</code>, <code>email</code>, <code>mobile_no</code>.
          Email and mobile are optional — we&apos;ll warn you about missing data.
        </p>
        {!previewId && (
          <input type="file" accept=".xlsx" onChange={onFile} className="block" disabled={busy} />
        )}
        {error && <p className="text-rose text-sm">{error}</p>}
        {previewId && (
          <>
            <div className="flex gap-3 text-sm">
              <span className="badge-pending">OK: {counts["ok"] ?? 0}</span>
              <span className="badge-maybe">Warnings: {counts["warning"] ?? 0}</span>
              <span className="badge-declined">Errors: {counts["error"] ?? 0}</span>
              <span className="badge-pending">Duplicates: {counts["duplicate"] ?? 0}</span>
            </div>
            <div className="overflow-x-auto border border-ink/10 rounded">
              <table className="w-full text-sm">
                <thead className="bg-ink/5 text-xs uppercase text-ink/60">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Mobile</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Skip?</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowIndex} className="border-t border-ink/5">
                      <td className="p-2 text-ink/50">{r.rowIndex}</td>
                      <td className="p-2">{r.primary_first_name} {r.primary_last_name}</td>
                      <td className="p-2 text-ink/70">{r.email ?? "—"}</td>
                      <td className="p-2 text-ink/70">{r.mobile_no ?? "—"}</td>
                      <td className="p-2">
                        <span className={badgeFor(r.status)}>{r.status}{r.reason ? ` (${r.reason})` : ""}</span>
                      </td>
                      <td className="p-2">
                        {r.status !== "error" && (
                          <input type="checkbox" checked={skip.has(r.rowIndex)} onChange={() => toggleSkip(r.rowIndex)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={onCommit}>
                {busy ? "Importing…" : "Import these"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function badgeFor(status: string): string {
  switch (status) {
    case "ok": return "badge-accepted";
    case "warning": return "badge-maybe";
    case "duplicate": return "badge-pending";
    case "error": return "badge-declined";
    default: return "badge-pending";
  }
}
