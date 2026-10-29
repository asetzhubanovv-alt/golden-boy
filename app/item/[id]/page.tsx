"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DemoNotice, SiteHeader } from "@/app/components/SiteHeader";
import { formatItemDate, getItems, type Item } from "@/lib/items";

export default function ItemDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item>();
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    try {
      setItem(getItems().find((savedItem) => savedItem.id === id));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить объявление.",
      );
    }
  }, [id]);

  const status =
    item?.status === "returned"
      ? "Возвращено"
      : item?.status === "found"
        ? "Найдено"
        : "Ищется";

  return (
    <>
      <SiteHeader />
      <main className="container page-container detail-page">
        <Link href="/" className="back-link">
          <span aria-hidden="true">←</span> К объявлениям
        </Link>
        <DemoNotice />
        {loadError ? (
          <Alert severity="error" className="detail-alert">
            {loadError}
          </Alert>
        ) : item ? (
          <article className="detail-card">
            <div className="detail-photo">
              {item.imageDataUrl ? (
                <Image
                  src={item.imageDataUrl}
                  alt={item.title}
                  width={900}
                  height={900}
                  unoptimized
                />
              ) : (
                <span aria-hidden="true">{item.type === "lost" ? "⌕" : "✳"}</span>
              )}
            </div>
            <div className="detail-content">
              <div className="detail-label-row">
                <span className={`item-type-badge ${item.type}`}>
                  {item.type === "lost" ? "Потерял" : "Нашёл"}
                </span>
                <Chip
                  className={`status-chip ${item.status}`}
                  label={status}
                  size="small"
                />
              </div>
              <p className="eyebrow">{item.category}</p>
              <h1>{item.title}</h1>
              <div className="detail-meta">
                <span>
                  <span aria-hidden="true">⌖</span> {item.place}
                </span>
                <span>{formatItemDate(item.date)}</span>
              </div>
              {item.description && (
                <div className="detail-description">
                  <h2>Описание</h2>
                  <p>{item.description}</p>
                </div>
              )}
              <div className="detail-contact">
                <p>Если вы можете помочь — свяжитесь с автором.</p>
                <Button
                  component="a"
                  href={`https://t.me/${encodeURIComponent(item.telegram)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  className="contact-button"
                >
                  Написать в Telegram
                </Button>
              </div>
            </div>
          </article>
        ) : (
          <div className="empty-feed detail-empty">
            <div className="empty-feed-icon" aria-hidden="true">
              ?
            </div>
            <h1>Объявление не найдено</h1>
            <p>
              Возможно, оно было создано в другом браузере или локальные данные
              были очищены.
            </p>
            <Button
              component={Link}
              href="/"
              variant="contained"
              className="empty-feed-button"
            >
              Вернуться к объявлениям
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
