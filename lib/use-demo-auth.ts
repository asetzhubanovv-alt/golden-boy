"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getDemoSessionSnapshot,
  getServerAuthSnapshot,
  parseDemoSessionSnapshot,
  subscribeToDemoAuth,
} from "@/lib/demo-auth";

export function useDemoAuth() {
  const snapshot = useSyncExternalStore(
    subscribeToDemoAuth,
    getDemoSessionSnapshot,
    getServerAuthSnapshot,
  );
  const result = useMemo(() => {
    try {
      return { user: parseDemoSessionSnapshot(snapshot), error: "" };
    } catch (error) {
      return {
        user: null,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить демо-сессию.",
      };
    }
  }, [snapshot]);

  return {
    ...result,
    isReady: snapshot !== getServerAuthSnapshot(),
  };
}
