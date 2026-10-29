"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { translate, type Language } from "@/lib/messages";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_STORAGE_KEY = "foundly-language";
const LANGUAGE_CHANGE_EVENT = "foundly-language-updated";

function getStoredLanguage(): Language {
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "kk" || storedLanguage === "ru" || storedLanguage === "en"
    ? storedLanguage
    : "ru";
}

function subscribeToLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<Language>(
    subscribeToLanguage,
    getStoredLanguage,
    () => "ru",
  );

  function setLanguage(nextLanguage: Language) {
    document.documentElement.lang = nextLanguage;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }

  const value = {
    language,
    setLanguage,
    t: (key: string) => translate(language, key),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}