"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { DemoUser } from "@/lib/demo-auth";
import { useLanguage } from "@/components/language-provider";
import { localizedError, translate } from "@/lib/messages";

export function useDemoAuth() {
  const { language } = useLanguage();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const initialize = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          const account = session?.user;
          setUser(
            account
              ? {
                  id: account.id,
                  name:
                    (typeof account.user_metadata.name === "string" &&
                      account.user_metadata.name) ||
                    account.email ||
                    translate(language, "auth.defaultName"),
                  email: account.email ?? "",
                }
              : null,
          );
          setError("");
          setIsReady(true);
        });
        unsubscribe = () => data.subscription.unsubscribe();

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (!active) return;
        if (sessionError) {
          setError(localizedError(language, sessionError, "auth.error.session"));
          setIsReady(true);
          return;
        }
        const account = sessionData.session?.user;
        setUser(
          account
            ? {
                id: account.id,
                name:
                  (typeof account.user_metadata.name === "string" &&
                    account.user_metadata.name) ||
                  account.email ||
                  translate(language, "auth.defaultName"),
                email: account.email ?? "",
              }
            : null,
        );
        setIsReady(true);
      } catch (authError) {
        if (!active) return;
        setError(localizedError(language, authError, "auth.error.session"));
        setIsReady(true);
      }
    };

    void initialize();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [language]);

  return { user, error, isReady };
}
