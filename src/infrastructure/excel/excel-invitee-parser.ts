import * as XLSX from "xlsx";
import { InviteeContactPolicy, type ContactValidation } from "@/domain/invitee/invitee-contact-policy";

export type ParsedRow = {
  rowIndex: number;
  primary_first_name: string;
  primary_last_name: string;
  partner_first_name: string | null;
  partner_last_name: string | null;
  email: string | null;
  mobile_no: string | null;
  validation: ContactValidation;
};

const HEADER_ALIASES: Record<string, string[]> = {
  primary_first_name: ["first_name", "firstname", "first name", "name"],
  primary_last_name: ["last_name", "lastname", "last name", "surname"],
  partner_first_name: ["partner_first_name", "partner first name", "partner"],
  partner_last_name: ["partner_last_name", "partner last name", "partner surname"],
  email: ["email", "e-mail", "email address"],
  mobile_no: ["mobile_no", "mobile", "cell", "cellphone", "cellphone_num", "phone", "mobile number"],
};

const MAX_ROWS = 5000;

export class ExcelInviteeParser {
  constructor(private readonly contactPolicy = new InviteeContactPolicy()) {}

  parse(buffer: Uint8Array): ParsedRow[] {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    if (raw.length === 0) return [];
    if (raw.length > MAX_ROWS) {
      throw new Error(`File has too many rows (max ${MAX_ROWS})`);
    }

    const firstRow = raw[0];
    if (!firstRow) return [];
    const headerMap = buildHeaderMap(Object.keys(firstRow));
    const rows: ParsedRow[] = [];

    raw.forEach((row, idx) => {
      const get = (logical: string): string => {
        const physical = headerMap[logical];
        if (!physical) return "";
        const v = row[physical];
        return v === null || v === undefined ? "" : String(v).trim();
      };
      const primary_first_name = get("primary_first_name");
      const primary_last_name = get("primary_last_name");
      const partner_first_name = get("partner_first_name") || null;
      const partner_last_name = get("partner_last_name") || null;
      const email = get("email") || null;
      const mobile_no = get("mobile_no") || null;
      const validation = this.contactPolicy.validate({
        first_name: primary_first_name,
        last_name: primary_last_name,
        email,
        mobile_no,
      });
      rows.push({
        rowIndex: idx + 2,
        primary_first_name,
        primary_last_name,
        partner_first_name,
        partner_last_name,
        email,
        mobile_no,
        validation,
      });
    });

    return rows;
  }
}

function buildHeaderMap(headers: string[]): Record<string, string> {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {};
  for (const [logical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const h of headers) {
      const n = norm(h);
      if (aliases.includes(n) || aliases.includes(h.toLowerCase())) {
        map[logical] = h;
        break;
      }
    }
  }
  return map;
}
