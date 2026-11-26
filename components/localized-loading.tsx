"use client";

import { useLanguage } from "@/components/language-provider";

export default function LocalizedLoading({
  translationKey,
  className,
  wrapperClassName,
}: {
  translationKey: string;
  className: string;
  wrapperClassName?: string;
}) {
  const { t } = useLanguage();

  const content = <p>{t(translationKey)}</p>;

  return wrapperClassName ? (
    <main aria-busy="true" aria-live="polite" className={wrapperClassName}>
      <section className={className}>{content}</section>
    </main>
  ) : (
    <main aria-busy="true" aria-live="polite" className={className}>
      {t(translationKey)}
    </main>
  );
}
