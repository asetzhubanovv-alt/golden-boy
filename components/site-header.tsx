import Button from "@mui/material/Button";
import Link from "next/link";

type SiteHeaderProps = {
  active?: "feed" | "none";
};

export default function SiteHeader({ active = "none" }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="brand" href="/" aria-label="Foundly — главная">
          <span className="brand-mark">f</span>
          <span>foundly</span>
        </Link>

        <nav className="main-nav" aria-label="Основная навигация">
          <Link
            className={`nav-link ${active === "feed" ? "active" : ""}`}
            href="/"
          >
            Лента
          </Link>
          <Link className="nav-link" href="/about">
            О проекте
          </Link>
        </nav>

        <div className="header-actions">
          <Button className="login-button" href="/login">
            Войти
          </Button>
          <Button className="publish-button" variant="contained" href="/add">
            <span aria-hidden="true">＋</span> Разместить объявление
          </Button>
        </div>
      </div>
    </header>
  );
}
