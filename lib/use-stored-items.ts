"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getItemsSnapshot,
  parseItemsSnapshot,
  SERVER_ITEMS_SNAPSHOT,
  subscribeToItems,
  type Item,
} from "@/lib/items";

export function useStoredItems(): {
  items: Item[];
  error: string;
  isReady: boolean;
} {
  const snapshot = useSyncExternalStore(
    subscribeToItems,
    getItemsSnapshot,
    () => SERVER_ITEMS_SNAPSHOT,
  );
  const result = useMemo(() => {
    try {
      return { items: parseItemsSnapshot(snapshot), error: "" };
    } catch (error) {
      return {
        items: [],
        error:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить сохранённые объявления.",
      };
    }
  }, [snapshot]);

  return {
    ...result,
    isReady: snapshot !== SERVER_ITEMS_SNAPSHOT,
  };
}

export function useTodayDate(): string {
  return useSyncExternalStore(
    () => () => {},
    () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    () => "",
  );
}
