import zlib from "node:zlib";

/**
 * Pulls the visible text out of a PDF buffer by inflating its content streams
 * and decoding the operands inside each BT/ET text block.
 *
 * Only useful for documents drawn with the standard 14 fonts: react-pdf writes
 * show-text operands as hex strings, and for an embedded TrueType subset those
 * bytes are glyph indices, which carry no relationship to the characters.
 */
export function extractPdfText(buf: Buffer): string {
  const raw = buf.toString("latin1");
  const blocks: string[] = [];

  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let stream: RegExpExecArray | null;

  while ((stream = streamRe.exec(raw)) !== null) {
    const body = Buffer.from(stream[1] ?? "", "latin1");
    let content: string;
    try {
      content = zlib.inflateSync(body).toString("latin1");
    } catch {
      continue; // not a Flate-encoded content stream (font file, image, …)
    }

    const textBlockRe = /BT\b([\s\S]*?)\bET\b/g;
    let block: RegExpExecArray | null;
    while ((block = textBlockRe.exec(content)) !== null) {
      const decoded = decodeOperands(block[1] ?? "");
      if (decoded) blocks.push(decoded);
    }
  }

  return blocks.join(" ");
}

function decodeOperands(block: string): string {
  const operandRe = /<([0-9a-fA-F\s]*)>|\(((?:\\.|[^\\()])*)\)/g;
  const parts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = operandRe.exec(block)) !== null) {
    if (match[1] !== undefined) {
      const hex = match[1].replace(/\s+/g, "");
      if (hex.length % 2 === 0) parts.push(Buffer.from(hex, "hex").toString("latin1"));
    } else {
      parts.push(unescapePdfString(match[2] ?? ""));
    }
  }

  return parts.join("");
}

function unescapePdfString(s: string): string {
  return s.replace(/\\([nrtbf()\\])/g, (_, c: string) => {
    switch (c) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return c;
    }
  });
}
