"use client";

import { useLanguage } from "@/components/language-provider";

type RewardAmountFieldProps = {
  itemType: "lost" | "found";
  enabled: boolean;
  amount: string;
  onEnabledChange: (enabled: boolean) => void;
  onAmountChange: (amount: string) => void;
};

export default function RewardAmountField({
  itemType,
  enabled,
  amount,
  onEnabledChange,
  onAmountChange,
}: RewardAmountFieldProps) {
  const { t } = useLanguage();

  if (itemType !== "lost") return null;

  return (
    <div className="reward-option">
      <label className="reward-toggle">
        <span>{t("form.rewardToggle")}</span>
        <input
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          type="checkbox"
        />
      </label>
      {enabled && (
        <label className="form-group reward-amount-field">
          <span className="form-label">
            {t("form.rewardAmount")} <span>*</span>
          </span>
          <div className="reward-amount-control">
            <input
              inputMode="numeric"
              max={999_999_999_999}
              min={1}
              onChange={(event) => onAmountChange(event.target.value)}
              required
              step={1}
              type="number"
              value={amount}
            />
            <span aria-hidden="true">₸</span>
          </div>
        </label>
      )}
    </div>
  );
}
