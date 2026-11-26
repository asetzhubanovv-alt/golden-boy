"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getStoredItems, type Item } from "@/lib/items";
import { getSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";
import { localizedError, translate } from "@/lib/messages";

export function useStoredItems(): {
  items: Item[];
  error: string;
  isReady: boolean;
} {
  const { language } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const currentItems = await getStoredItems();
      setItems(currentItems);
      setError("");
    } catch (loadError) {
      setError(localizedError(language, loadError, "items.error.load"));
    } finally {
      setIsReady(true);
    }
  }, [language]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const currentItems = await getStoredItems();
        if (active) {
          setItems(currentItems);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(localizedError(language, loadError, "items.error.load"));
        }
      } finally {
        if (active) setIsReady(true);
      }
    };
    void load();

    const onItemsChanged = () => void refresh();
    window.addEventListener("foundly-items-updated", onItemsChanged);

    let removeChannel = () => {};
    void Promise.resolve()
      .then(() => {
        if (!active) return;
        const supabase = getSupabaseClient();
        const channel = supabase
          .channel("items-feed")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "items" },
            onItemsChanged,
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR" && active) {
            setError(translate(language, "items.error.realtime"));
            }
          });
        removeChannel = () => {
          void supabase.removeChannel(channel);
        };
      })
      .catch((connectionError: unknown) => {
        if (!active) return;
        setError(localizedError(language, connectionError, "items.error.connect"));
        setIsReady(true);
      });

    return () => {
      active = false;
      window.removeEventListener("foundly-items-updated", onItemsChanged);
      removeChannel();
    };
  }, [language, refresh]);

  return {
    items,
    error,
    isReady,
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
