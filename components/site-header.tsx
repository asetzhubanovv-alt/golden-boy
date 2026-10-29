import Button from "@mui/material/Button";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

type SiteHeaderProps = {
  active?: "feed" | "none";
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
            className={`nav-link ${active === "feed" ? "active" : ""}`}
            href="/"
          >
            {t("nav.feed")}
          </Link>
          <Link className="nav-link" href="/about">
            {t("nav.about")}
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
          <Button className="login-button" href="/login">
            {t("nav.login")}
          </Button>
          <Button className="publish-button" variant="contained" href="/add">
            <span aria-hidden="true">＋</span> {t("nav.publish")}
          </Button>
        </div>
      </div>
    </header>
  );
}
