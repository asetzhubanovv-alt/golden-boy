"use client";

import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { useLanguage } from "@/components/language-provider";
import { categoryTranslationKey, type Language } from "@/lib/messages";
import {
  DEMO_ITEMS,
  deleteStoredItem,
  formatItemDate,
  isStoredItem,
  saveItemReport,
  updateStoredItem,
  type Item,
  type ItemStatus,
} from "@/lib/items";
import { useStoredItems } from "@/lib/use-stored-items";
import { useDemoAuth } from "@/lib/use-demo-auth";

function formattedDate(item: Item, language: Language) {
  if (!item.date) {
    if (item.daysAgo === 0) return `${language === "en" ? "Today" : language === "kk" ? "Бүгін" : "Сегодня"}, ${item.time}`;
    if (item.daysAgo === 1) return `${language === "en" ? "Yesterday" : language === "kk" ? "Кеше" : "Вчера"}, ${item.time}`;
    if (language === "en") return `${item.daysAgo} days ago, ${item.time}`;
    if (language === "kk") return `${item.daysAgo} күн бұрын, ${item.time}`;
    return formatItemDate(item.daysAgo, item.time);
  }
  const [year, month, day] = item.date.split("-");
  const locale = language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU";
  return new Intl.DateTimeFormat(locale).format(
    new Date(Number(year), Number(month) - 1, Number(day)),
  );
}

export default function ItemDetail({ id }: { id: string }) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const { items: storedItems, error: storageError, isReady } = useStoredItems();
  const { user, isReady: isAuthReady } = useDemoAuth();
  const [actionError, setActionError] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const item =
    storedItems.find((storedItem) => storedItem.id === id) ??
    DEMO_ITEMS.find((demoItem) => demoItem.id === id) ??
    null;
  const isOwnDemoItem =
    isReady &&
    isAuthReady &&
    isStoredItem(id, storedItems, user?.id);
  const statusLabels: Record<ItemStatus, string> = {
    searching: t("status.searching"),
    found: t("status.found"),
    returned: t("status.returned"),
  };
  const reportReasons = [
    t("detail.reportRule"),
    t("detail.reportSpam"),
    t("detail.reportPrivacy"),
    t("detail.reportOther"),
  ];

  function handleStatusChange(status: ItemStatus) {
    setActionError("");
    try {
      if (!user) throw new Error("Войди в свой демо-аккаунт.");
      updateStoredItem(id, user.id, { status });
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : t("detail.error.update"),
      );
    }
  }

  function handleDelete() {
    if (!window.confirm(t("detail.deleteConfirm"))) {
      return;
    }

    setActionError("");
    try {
      if (!user) throw new Error("Войди в свой демо-аккаунт.");
      deleteStoredItem(id, user.id);
      router.push("/");
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : t("detail.error.delete"),
      );
    }
  }

  function handleReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportMessage("");
    setActionError("");
    if (!reportReason) {
      setActionError(t("detail.chooseReason"));
      return;
    }

    try {
      saveItemReport(id, reportReason);
      setReportMessage(
        t("detail.reportSaved"),
      );
      setReportReason("");
    } catch (reportError) {
      setActionError(
        reportError instanceof Error
          ? reportError.message
          : t("detail.error.report"),
      );
    }
  }

  if (!isReady || !isAuthReady) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader />
        <div className="detail-loading">{t("detail.loading")}</div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader active="item" />
        <section className="detail-not-found container">
          <span aria-hidden="true">⌕</span>
          <h1>{t("detail.notFound")}</h1>
          <p>
            {t("detail.notFoundDescription")}
          </p>
          {(storageError || actionError) && (
            <Alert severity="error">{storageError || actionError}</Alert>
          )}
          <Button
            className="detail-primary-button"
            href="/"
            variant="contained"
          >
            {t("detail.backToFeed")}
          </Button>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const telegramUsername = item.telegram?.trim().replace(/^@/, "");
  const validTelegramUsername =
    telegramUsername && /^[A-Za-z0-9_]{5,32}$/.test(telegramUsername)
      ? telegramUsername
      : null;

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="item" />

      <section className="detail-page container">
        <div className="form-breadcrumb">
          <Link href="/">Лента</Link>
          <span aria-hidden="true">/</span>
          <span>{item.title}</span>
        </div>

        <div className="detail-layout">
          <div
            className={`detail-art item-art ${item.art}${item.imageDataUrl ? " has-photo" : ""}`}
            style={
              item.imageDataUrl
                ? { backgroundImage: `url("${item.imageDataUrl}")` }
                : undefined
            }
          >
            {!item.imageDataUrl && (
              <>
                <span className="art-shape art-shape-one" />
                <span className="art-shape art-shape-two" />
                <span className="art-symbol">{item.symbol}</span>
              </>
            )}
            <span className={`detail-type-badge ${item.type}`}>
              {item.type === "lost" ? t("detail.lost") : t("detail.found")}
            </span>
          </div>

          <article className="detail-content">
            <div className="detail-topline">
              <span className={`status-label ${item.status}`}>
                <span /> {statusLabels[item.status]}
              </span>
              {isOwnDemoItem && <span className="demo-owner-label">{t("detail.ownItem")}</span>}
            </div>

            <h1>{item.title}</h1>
            <span className="category-label detail-category">
              {categoryTranslationKey(item.category)
                ? t(categoryTranslationKey(item.category)!)
                : item.category}
            </span>

            {(storageError || actionError) && (
              <Alert className="detail-alert" severity="error">
                {storageError || actionError}
              </Alert>
            )}
            {reportMessage && (
              <Alert className="detail-alert" severity="success">
                {reportMessage}
              </Alert>
            )}

            <dl className="detail-facts">
              <div>
                <dt>{t("detail.place")}</dt>
                <dd>
                  <span aria-hidden="true">⌖</span> {item.place}
                </dd>
              </div>
              <div>
                <dt>{t("detail.published")}</dt>
                <dd>
                  <span aria-hidden="true">◷</span> {formattedDate(item, language)}
                </dd>
              </div>
            </dl>

            <div className="detail-description">
                <h2>{t("detail.description")}</h2>
                <p>{item.details || t("detail.noDescription")}</p>
            </div>

            {validTelegramUsername ? (
              <div className="detail-contact">
                <div>
                  <h2>{t("detail.contact")}</h2>
                  <p>{t("detail.contactHint")}</p>
                </div>
                <Button
                  className="detail-primary-button"
                  component="a"
                  href={`https://t.me/${validTelegramUsername}`}
                  rel="noreferrer"
                  target="_blank"
                  variant="contained"
                >
                  {t("detail.messageTelegram")} <span aria-hidden="true">↗</span>
                </Button>
              </div>
            ) : (
              <div className="detail-contact">
                <div>
                  <h2>Связаться с автором</h2>
                  <p>
                    {item.telegram
                      ? "Telegram-ник указан в неверном формате."
                      : "Автор не указал Telegram для связи."}
                  </p>
                </div>
              </div>
            )}

            {isOwnDemoItem && (
              <div className="owner-actions">
                <Alert severity="warning">{t("form.demoNotice")}</Alert>
                <label htmlFor="item-status">{t("detail.status")}</label>
                <select
                  id="item-status"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "searching" ||
                      value === "found" ||
                      value === "returned"
                    ) {
                      handleStatusChange(value);
                    }
                  }}
                  value={item.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button
                  className="delete-item-button"
                  onClick={handleDelete}
                  variant="outlined"
                >
                  {t("detail.delete")}
                </Button>
              </div>
            )}

            <details className="report-box">
              <summary>{t("detail.report")}</summary>
              <form onSubmit={handleReport}>
                <label htmlFor="report-reason">{t("detail.reportReason")}</label>
                <select
                  id="report-reason"
                  onChange={(event) => setReportReason(event.target.value)}
                  required
                  value={reportReason}
                >
                  <option disabled value="">
                    {t("detail.chooseReason")}
                  </option>
                  {reportReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <Button
                  className="report-button"
                  type="submit"
                  variant="outlined"
                >
                  {t("detail.sendReport")}
                </Button>
              </form>
              <p>{t("detail.reportDemo")}</p>
            </details>
          </article>
        </div>

        <div className="detail-back-row">
          <Link href="/">← {t("detail.backAll")}</Link>
          <span>{t("detail.backNote")}</span>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
