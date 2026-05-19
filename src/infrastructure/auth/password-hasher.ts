import { hash, verify } from "@node-rs/argon2";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

// Algorithm enum: 2 = Argon2id (matches @node-rs/argon2's Algorithm.Argon2id).
const ARGON_OPTS = {
  algorithm: 2 as const,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    if (password.length > 256) {
      throw new Error("Password is too long");
    }
    return await hash(password, ARGON_OPTS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    if (!password) return false;
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
