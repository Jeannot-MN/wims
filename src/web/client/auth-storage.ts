"use client";

const TOKEN_KEY = "wims.token";
const EXPIRES_KEY = "wims.token.exp";

export type StoredToken = {
  token: string;
  expiresAt: number;
};

export function saveToken(token: string, expiresAt: Date): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(EXPIRES_KEY, String(expiresAt.getTime()));
}

export function loadToken(): StoredToken | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  const expStr = window.localStorage.getItem(EXPIRES_KEY);
  if (!token || !expStr) return null;
  const expiresAt = Number(expStr);
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    clearToken();
    return null;
  }
  return { token, expiresAt };
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(EXPIRES_KEY);
}
