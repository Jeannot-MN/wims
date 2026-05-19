const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export interface RandomBytesFn {
  (length: number): Uint8Array;
}

export class InviteTokenGenerator {
  static readonly DEFAULT_LENGTH = 10;

  constructor(private readonly random: RandomBytesFn, private readonly length = InviteTokenGenerator.DEFAULT_LENGTH) {
    if (length < 6 || length > 16) {
      throw new Error("Invite token length must be between 6 and 16");
    }
  }

  generate(): string {
    const bytes = this.random(this.length);
    let result = "";
    for (let i = 0; i < this.length; i++) {
      const byte = bytes[i] ?? 0;
      const idx = byte % ALPHABET.length;
      const ch = ALPHABET[idx];
      if (ch !== undefined) result += ch;
    }
    return result;
  }

  isValidShape(token: string): boolean {
    if (typeof token !== "string") return false;
    if (token.length !== this.length) return false;
    for (const ch of token) {
      if (!ALPHABET.includes(ch)) return false;
    }
    return true;
  }
}

export function nodeRandom(length: number): Uint8Array {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return new Uint8Array(crypto.randomBytes(length));
}
