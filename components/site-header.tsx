import Link from "next/link";
import HeaderAccount from "@/components/header-account";

type SiteHeaderProps = {
  active?: "feed" | "add" | "item";
};

export default function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="brand" href="/" aria-label="Foundly — главная">
          <span className="brand-mark">f</span>
          <span>foundly</span>
        </Link>

        <nav className="main-nav" aria-label="Основная навигация">
          <Link
            aria-current={active === "feed" ? "page" : undefined}
            className={`nav-link ${active === "feed" ? "active" : ""}`}
            href="/"
          >
            Лента
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

        <HeaderAccount />
      </div>
    </header>
  );
}
