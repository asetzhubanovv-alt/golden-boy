"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import HeaderAccount from "@/components/header-account";
import ThemeToggle from "@/components/theme-toggle";
import type { Language } from "@/lib/messages";

type SiteHeaderProps = {
  active?: "feed" | "add" | "item" | "about" | "favorites" | "messages" | "notifications" | "profile" | "none";
};

export default function SiteHeader({ active = "none" }: SiteHeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [unreadCounts, setUnreadCounts] = useState({ chat: 0, notifications: 0 });

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="brand" href="/" aria-label={t("brand.home")}>
          <span>Amanat</span>
        </Link>
        <Link className="header-home-link" href="/">
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
          </svg>
          <span>{t("nav.homeScreen")}</span>
        </Link>

        <div className="header-actions">
          <div className="header-language-switch" aria-label={t("language.label")}>
            {([
              ["kk", "Қаз", "Қазақша"],
              ["ru", "Рус", "Русский"],
            ] as const).map(([value, shortLabel, label]) => (
              <button
                aria-label={label}
                aria-pressed={language === value}
                className={language === value ? "active" : ""}
                key={value}
                onClick={() => setLanguage(value satisfies Language)}
                type="button"
              >
                {shortLabel}
              </button>
            ))}
          </div>
          <HeaderAccount onUnreadCountsChange={setUnreadCounts} />
          <ThemeToggle />
          <Link className="header-publish-link" href="/add">
            <span aria-hidden="true">＋</span>
            {t("nav.publish")}
          </Link>
        </div>
      </div>
      <nav className="mobile-tab-bar" aria-label={t("nav.mobilePrimary")}>
        <Link
          href="/"
          aria-current={active === "feed" ? "page" : undefined}
          aria-label={t("nav.mobileHome")}
        >
          <span aria-hidden="true">⌂</span>
          <small>{t("nav.mobileHome")}</small>
        </Link>
        <Link
          href="/messages"
          aria-current={active === "messages" ? "page" : undefined}
          aria-label={`${t("nav.messages")}${unreadCounts.chat ? `: ${unreadCounts.chat}` : ""}`}
        >
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.1A7.5 7.5 0 1 1 20 11.5Z" />
            <path d="M8.5 11.5h7M8.5 14.5h4" />
          </svg>
          <small>{t("nav.mobileMessages")}</small>
          {unreadCounts.chat > 0 && (
            <span aria-hidden="true" className="mobile-tab-count-badge">
              {unreadCounts.chat > 99 ? "99+" : unreadCounts.chat}
            </span>
          )}
        </Link>
        <Link
          href="/add"
          aria-current={active === "add" ? "page" : undefined}
          aria-label={t("nav.mobileAdd")}
        >
          <span aria-hidden="true">＋</span>
          <small>{t("nav.mobileAdd")}</small>
        </Link>
        <Link
          href="/notifications"
          aria-current={active === "notifications" ? "page" : undefined}
          aria-label={`${t("nav.notifications")}${unreadCounts.notifications ? `: ${unreadCounts.notifications}` : ""}`}
        >
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
          </svg>
          <small>{t("nav.notificationsShort")}</small>
          {unreadCounts.notifications > 0 && (
            <span aria-hidden="true" className="mobile-tab-count-badge">
              {unreadCounts.notifications > 99 ? "99+" : unreadCounts.notifications}
            </span>
          )}
        </Link>
        <Link
          href="/profile"
          aria-current={active === "profile" ? "page" : undefined}
          aria-label={t("nav.mobileProfile")}
        >
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="7.5" r="3.5" />
            <path d="M4.5 21c.4-4.1 3.4-6.5 7.5-6.5s7.1 2.4 7.5 6.5" />
          </svg>
          <small>{t("nav.mobileProfile")}</small>
        </Link>
      </nav>
    </header>
  );
}
