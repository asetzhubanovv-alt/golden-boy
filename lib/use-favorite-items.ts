"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";
import { localizedError, translate } from "@/lib/messages";

const FAVORITES_EVENT = "foundly-favorites-updated";
const STORAGE_ERROR = "__foundly_favorites_storage_error__";

function storageKey(userId: string) {
  return `foundly-favorites-v1:${userId}`;
}

function subscribe(callback: () => void) {
  window.addEventListener(FAVORITES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(userId: string | null): string {
  if (!userId) return "[]";
  try {
    return window.localStorage.getItem(storageKey(userId)) ?? "[]";
  } catch {
    return STORAGE_ERROR;
  }
}

function parseFavoriteIds(snapshot: string): { ids: string[]; error: string } {
  if (snapshot === STORAGE_ERROR) {
    return { ids: [], error: "Браузер не разрешил доступ к избранному." };
  }
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
      return { ids: [], error: "Данные избранного повреждены. Очистите данные сайта и войдите снова." };
    }
    return { ids: value, error: "" };
  } catch {
    return { ids: [], error: "Не удалось прочитать избранное. Очистите данные сайта и войдите снова." };
  }
}

export function useFavoriteItems(userId: string | null) {
  const { language } = useLanguage();
  const [actionError, setActionError] = useState("");
  const snapshot = useSyncExternalStore(
    subscribe,
    () => getSnapshot(userId),
    () => "[]",
  );
  const { ids: favoriteIds, error: snapshotError } = parseFavoriteIds(snapshot);

  const toggleFavorite = useCallback((itemId: string) => {
    if (!userId) {
      setActionError(translate(language, "favorites.error.loginRequired"));
      return;
    }
    try {
      const current = parseFavoriteIds(getSnapshot(userId));
      if (current.error) throw new Error(current.error);
      const nextIds = current.ids.includes(itemId)
        ? current.ids.filter((id) => id !== itemId)
        : [...current.ids, itemId];
      window.localStorage.setItem(storageKey(userId), JSON.stringify(nextIds));
      setActionError("");
      window.dispatchEvent(new Event(FAVORITES_EVENT));
    } catch (writeError) {
      setActionError(localizedError(language, writeError, "favorites.error.general"));
    }
  }, [language, userId]);

  return {
    favoriteIds,
    toggleFavorite,
    error: snapshotError || actionError
      ? localizedError(language, snapshotError || actionError, "favorites.error.general")
      : "",
  };
}
