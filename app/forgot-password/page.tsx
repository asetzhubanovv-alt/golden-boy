"use client";

import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";
import { localizedError } from "@/lib/messages";

export default function ForgotPasswordPage() {
  const { language, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw new Error(resetError.message);
      setSent(true);
    } catch (requestError) {
      setError(localizedError(language, requestError, "password.fallbackError"));
    } finally {
      setSaving(false);
    }
  }

  return <main className="foundly-shell container-fluid px-0"><SiteHeader /><section className="auth-page"><div className="auth-card">
    <span className="section-kicker">{t("password.forgotKicker")}</span><h1>{t("password.forgotTitle")}</h1>
    <p className="auth-intro">{t("password.forgotIntro")}</p>
    {error && <Alert severity="error">{localizedError(language, error, "password.fallbackError")}</Alert>}
    {sent ? <Alert severity="success">{t("password.emailSent")}</Alert> : <form className="auth-form" onSubmit={submit}>
      <label className="form-group"><span className="form-label">{t("auth.email")}</span><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
      <Button disabled={saving} type="submit" variant="contained">{saving ? t("password.sending") : t("password.sendLink")}</Button>
    </form>}
    <p className="auth-switch"><Link href="/login">{t("password.backToLogin")}</Link></p>
  </div></section><SiteFooter /></main>;
}
