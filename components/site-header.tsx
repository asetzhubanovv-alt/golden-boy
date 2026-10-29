"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import HeaderAccount from "@/components/header-account";

type SiteHeaderProps = {
  active?: "feed" | "add" | "item" | "none";
};

export default function SiteHeader({ active = "none" }: SiteHeaderProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="brand" href="/" aria-label={t("brand.home")}>
          <span className="brand-mark">f</span>
          <span>foundly</span>
        </Link>

        <nav className="main-nav" aria-label={t("nav.feed")}>
          <Link
            aria-current={active === "feed" ? "page" : undefined}
            className={`nav-link ${active === "feed" ? "active" : ""}`}
            href="/"
          >
            {t("nav.feed")}
          </Link>
          <Link className="nav-link" href="/about">
            {t("nav.about")}
          </Link>
          <Link
            aria-current={active === "add" ? "page" : undefined}
            className={`nav-link ${active === "add" ? "active" : ""}`}
            href="/add"
          >
            Добавить
          </Link>
          <Link
            aria-current={active === "item" ? "page" : undefined}
            className={`nav-link ${active === "item" ? "active" : ""}`}
            href="/item/blue-headphones"
          >
            Пример
          </Link>
        </nav>

        <div className="header-actions">
          <label className="language-select-wrap">
            <span>{t("language.label")}:</span>
            <select
              aria-label={t("language.label")}
              value={language}
              onChange={(event) => setLanguage(event.target.value as "kk" | "ru" | "en")}
            >
              <option value="kk">Қазақша</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
