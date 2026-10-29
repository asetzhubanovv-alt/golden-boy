import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer container">
      <Link className="footer-brand" href="/">
        foundly<span>.</span>
      </Link>
      <span>Создано для людей и вещей, которые должны найтись.</span>
      <Link href="/about">О проекте</Link>
    </footer>
  );
}
