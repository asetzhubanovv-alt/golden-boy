"use client";

import { useLanguage } from "@/components/language-provider";

export default function VerifiedBadge({ size = 18 }: { size?: number }) {
  const { t } = useLanguage();

  return (
    <svg
      aria-label={t("accessibility.verifiedUser")}
      className="verified-badge"
      height={size}
      role="img"
      viewBox="0 0 24 24"
      width={size}
    >
      <circle cx="12" cy="12" r="11" fill="#0b766f" />
      <path
        d="m7.2 12.2 3.1 3.1 6.7-6.8"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}
