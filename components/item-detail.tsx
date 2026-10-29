"use client";

import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
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

const reportReasons = [
  "Объявление не соответствует правилам",
  "Это спам или реклама",
  "Указаны чужие личные данные",
  "Другое",
];

const statusLabels: Record<ItemStatus, string> = {
  searching: "Ищем владельца",
  found: "Найдено",
  returned: "Возвращено",
};

function formattedDate(item: Item) {
  if (!item.date) return formatItemDate(item.daysAgo, item.time);
  const [year, month, day] = item.date.split("-");
  return `${day}.${month}.${year}`;
}

export default function ItemDetail({ id }: { id: string }) {
  const router = useRouter();
  const { items: storedItems, error: storageError, isReady } = useStoredItems();
  const [actionError, setActionError] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const item =
    storedItems.find((storedItem) => storedItem.id === id) ??
    DEMO_ITEMS.find((demoItem) => demoItem.id === id) ??
    null;
  const isOwnDemoItem = isStoredItem(id, storedItems);

  function handleStatusChange(status: ItemStatus) {
    setActionError("");
    try {
      updateStoredItem(id, { status });
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Не удалось обновить статус.",
      );
    }
  }

  function handleDelete() {
    if (!window.confirm("Удалить это объявление? Отменить действие нельзя.")) {
      return;
    }

    setActionError("");
    try {
      deleteStoredItem(id);
      router.push("/");
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить объявление.",
      );
    }
  }

  function handleReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportMessage("");
    setActionError("");
    if (!reportReason) {
      setActionError("Выбери причину жалобы.");
      return;
    }

    try {
      saveItemReport(id, reportReason);
      setReportMessage(
        "Жалоба сохранена в этом браузере. В демо-режиме её никто не получит.",
      );
      setReportReason("");
    } catch (reportError) {
      setActionError(
        reportError instanceof Error
          ? reportError.message
          : "Не удалось сохранить жалобу.",
      );
    }
  }

  if (!isReady) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader />
        <div className="detail-loading">Загружаем объявление...</div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader />
        <section className="detail-not-found container">
          <span aria-hidden="true">⌕</span>
          <h1>Объявление не найдено</h1>
          <p>
            Возможно, оно было удалено или ссылка скопирована с ошибкой.
          </p>
          {(storageError || actionError) && (
            <Alert severity="error">{storageError || actionError}</Alert>
          )}
          <Button
            className="detail-primary-button"
            href="/"
            variant="contained"
          >
            Вернуться в ленту
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
      <SiteHeader />

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
              {item.type === "lost" ? "ПОТЕРЯЛИ" : "НАЙДЕНО"}
            </span>
          </div>

          <article className="detail-content">
            <div className="detail-topline">
              <span className={`status-label ${item.status}`}>
                <span /> {statusLabels[item.status]}
              </span>
              {isOwnDemoItem && <span className="demo-owner-label">Твоё демо-объявление</span>}
            </div>

            <h1>{item.title}</h1>
            <span className="category-label detail-category">
              {item.category}
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
                <dt>Место</dt>
                <dd>
                  <span aria-hidden="true">⌖</span> {item.place}
                </dd>
              </div>
              <div>
                <dt>Дата публикации</dt>
                <dd>
                  <span aria-hidden="true">◷</span> {formattedDate(item)}
                </dd>
              </div>
            </dl>

            <div className="detail-description">
              <h2>Описание</h2>
              <p>{item.details || "Автор не добавил описание."}</p>
            </div>

            {validTelegramUsername ? (
              <div className="detail-contact">
                <div>
                  <h2>Связаться с автором</h2>
                  <p>Напиши в Telegram, чтобы уточнить детали.</p>
                </div>
                <Button
                  className="detail-primary-button"
                  component="a"
                  href={`https://t.me/${validTelegramUsername}`}
                  rel="noreferrer"
                  target="_blank"
                  variant="contained"
                >
                  Написать в Telegram <span aria-hidden="true">↗</span>
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
                <Alert severity="warning">
                  Демо-режим: действия сохраняются только в этом браузере.
                  Входа и серверной проверки прав пока нет.
                </Alert>
                <label htmlFor="item-status">Статус объявления</label>
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
                  Удалить объявление
                </Button>
              </div>
            )}

            <details className="report-box">
              <summary>Пожаловаться на объявление</summary>
              <form onSubmit={handleReport}>
                <label htmlFor="report-reason">Причина жалобы</label>
                <select
                  id="report-reason"
                  onChange={(event) => setReportReason(event.target.value)}
                  required
                  value={reportReason}
                >
                  <option disabled value="">
                    Выбери причину
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
                  Отправить жалобу
                </Button>
              </form>
              <p>В демо-режиме жалоба останется только в этом браузере.</p>
            </details>
          </article>
        </div>

        <div className="detail-back-row">
          <Link href="/">← Вернуться ко всем объявлениям</Link>
          <span>Если нашёл вещь — помоги ей вернуться домой.</span>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
