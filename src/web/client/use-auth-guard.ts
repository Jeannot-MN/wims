"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadToken } from "./auth-storage";

export type AuthState =
  | { loading: true }
  | { loading: false; token: string };

export function useAuthGuard(): AuthState {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ loading: true });

  useEffect(() => {
    const t = loadToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setState({ loading: false, token: t.token });
  }, [router]);

  return state;
}
