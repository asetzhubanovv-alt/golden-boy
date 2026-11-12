"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  createOwnershipClaim,
  getOwnershipClaims,
  subscribeToOwnershipClaims,
  updateOwnershipClaimStatus,
  type OwnershipClaim,
  type OwnershipClaimStatus,
} from "@/lib/ownership-claims";

type OwnershipVerificationProps = {
  itemId: string;
  ownerId: string;
  isClosed: boolean;
  userId: string | null;
};

export default function OwnershipVerification({
  itemId,
  ownerId,
  isClosed,
  userId,
}: OwnershipVerificationProps) {
  const { t } = useLanguage();
  const isOwner = userId === ownerId;
  const [claims, setClaims] = useState<OwnershipClaim[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isSaving, setIsSaving] = useState(false);

  const loadClaims = useCallback(async () => {
    if (!userId) {
      setClaims([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      setClaims(await getOwnershipClaims(itemId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить запросы.");
    } finally {
      setIsLoading(false);
    }
  }, [itemId, userId]);

  useEffect(() => {
    const task = window.setTimeout(() => void loadClaims(), 0);
    return () => window.clearTimeout(task);
  }, [loadClaims]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToOwnershipClaims(
      itemId,
      () => void loadClaims(),
      setError,
    );
  }, [itemId, loadClaims, userId]);

  const ownClaims = claims.filter((claim) => claim.user_id === userId);
  const hasPendingClaim = ownClaims.some((claim) => claim.status === "pending");
  const hasConfirmedClaim = claims.some((claim) => claim.status === "confirmed");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    setError("");
    try {
      await createOwnershipClaim(itemId, userId, message);
      setMessage("");
      await loadClaims();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить запрос.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReview(
    claimId: string,
    status: Exclude<OwnershipClaimStatus, "pending">,
  ) {
    setIsSaving(true);
    setError("");
    try {
      await updateOwnershipClaimStatus(claimId, status);
      await loadClaims();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Не удалось обновить статус запроса.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="ownership-verification-title" className="ownership-panel">
      <h2 id="ownership-verification-title">{t("ownership.title")}</h2>
      <p>{isOwner ? t("ownership.ownerIntro") : t("ownership.intro")}</p>

      {error && <Alert severity="error">{error}</Alert>}

      {!isOwner && isClosed ? (
        <Alert severity="info">{t("ownership.closed")}</Alert>
      ) : !userId ? (
        <p>
          {t("ownership.login")}{" "}
          <Link href="/login">{t("nav.login")}</Link>
        </p>
      ) : isLoading ? (
        <p aria-live="polite">{t("ownership.loading")}</p>
      ) : isOwner ? (
        claims.length ? (
          <ul className="ownership-claim-list">
            {claims.map((claim) => (
              <li className="ownership-claim" key={claim.id}>
                <div className="ownership-claim-heading">
                  <strong>
                    {claim.full_name || `@${claim.username ?? claim.user_id.slice(0, 8)}`}
                  </strong>
                  <span className={`ownership-claim-status ${claim.status}`}>
                    {t(`ownership.status.${claim.status}`)}
                  </span>
                </div>
                <p>{claim.message}</p>
                {claim.status === "pending" && (
                  <div className="ownership-claim-actions">
                    {hasConfirmedClaim && <small>{t("ownership.alreadyConfirmed")}</small>}
                    <Button
                      disabled={isSaving || hasConfirmedClaim}
                      onClick={() => void handleReview(claim.id, "confirmed")}
                      variant="contained"
                    >
                      {t("ownership.confirm")}
                    </Button>
                    <Button
                      disabled={isSaving}
                      onClick={() => void handleReview(claim.id, "rejected")}
                      variant="outlined"
                    >
                      {t("ownership.reject")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("ownership.empty")}</p>
        )
      ) : (
        <>
          {ownClaims.map((claim) => (
            <Alert
              key={claim.id}
              severity={claim.status === "rejected" ? "warning" : "info"}
            >
              {t(`ownership.status.${claim.status}`)}
            </Alert>
          ))}
          {!isClosed && !hasPendingClaim && !ownClaims.some((claim) => claim.status === "confirmed") && (
            <form className="ownership-claim-form" onSubmit={handleSubmit}>
              <label htmlFor={`ownership-message-${itemId}`}>{t("ownership.prompt")}</label>
              <textarea
                id={`ownership-message-${itemId}`}
                maxLength={1200}
                minLength={10}
                onChange={(event) => setMessage(event.target.value)}
                required
                rows={4}
                value={message}
              />
              <small>{t("ownership.privateNote")}</small>
              <Button disabled={isSaving} type="submit" variant="contained">
                {isSaving ? t("ownership.sending") : t("ownership.submit")}
              </Button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
