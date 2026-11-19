"use client";

import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import BackLink from "@/components/back-link";
import { useLanguage } from "@/components/language-provider";

const faq = [
  ["about.faq1Question", "about.faq1Answer"],
  ["about.faq2Question", "about.faq2Answer"],
  ["about.faq3Question", "about.faq3Answer"],
  ["about.faq4Question", "about.faq4Answer"],
] as const;

export default function AboutContent() {
  const { t } = useLanguage();

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="about" />
      <section className="about-page container">
        <BackLink />
        <div className="about-hero">
          <span className="section-kicker">{t("about.heroKicker")}</span>
          <h1>{t("about.heroTitle")}</h1>
          <p>{t("about.heroDescription")}</p>
        </div>

        <section className="about-section">
          <span className="section-kicker">{t("about.stepsKicker")}</span>
          <h2>{t("about.stepsTitle")}</h2>
          <div className="about-step-grid">
            <article><span>01</span><h3>{t("about.step1Title")}</h3><p>{t("about.step1Description")}</p></article>
            <article><span>02</span><h3>{t("about.step2Title")}</h3><p>{t("about.step2Description")}</p></article>
            <article><span>03</span><h3>{t("about.step3Title")}</h3><p>{t("about.step3Description")}</p></article>
          </div>
        </section>

        <section className="about-section about-rules">
          <span className="section-kicker">{t("about.rulesKicker")}</span>
          <h2>{t("about.rulesTitle")}</h2>
          <ul>
            <li>{t("about.rule1")}</li>
            <li>{t("about.rule2")}</li>
            <li>{t("about.rule3")}</li>
            <li>{t("about.rule4")}</li>
            <li>{t("about.rule5")}</li>
          </ul>
        </section>

        <section className="about-section about-faq">
          <span className="section-kicker">{t("about.helpKicker")}</span>
          <h2>{t("about.helpTitle")}</h2>
          <div className="about-faq-list">
            {faq.map(([questionKey, answerKey]) => (
              <details key={questionKey}>
                <summary>{t(questionKey)}<span aria-hidden="true">＋</span></summary>
                <p>{t(answerKey)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="about-contact">
          <div>
            <span className="section-kicker">{t("about.contactKicker")}</span>
            <h2>{t("about.contactTitle")}</h2>
            <p>{t("about.contactDescription")}</p>
          </div>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
