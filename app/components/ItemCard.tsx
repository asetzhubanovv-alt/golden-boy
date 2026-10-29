import Image from "next/image";
import Link from "next/link";
import { Chip } from "@mui/material";
import type { Item } from "@/lib/items";
import { formatItemDate } from "@/lib/items";

export function ItemCard({ item }: { item: Item }) {
  return (
    <Link
      className="item-card"
      href={`/item/${encodeURIComponent(item.id)}`}
      aria-label={`Открыть объявление: ${item.title}`}
    >
      <div className="item-art">
        {item.imageDataUrl ? (
          <Image
            src={item.imageDataUrl}
            alt={item.title}
            fill
            unoptimized
            sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
            className="item-card-photo"
          />
        ) : (
          <span className="art-symbol" aria-hidden="true">
            {item.type === "lost" ? "⌕" : "✳"}
          </span>
        )}
        <span className={`type-badge ${item.type}`}>
          {item.type === "lost" ? "ПОТЕРЯЛИ" : "НАЙДЕНО"}
        </span>
        <span className="art-date">{formatItemDate(item.date)}</span>
      </div>
      <div className="item-card-content">
        <div className="item-card-title-row">
          <h3>{item.title}</h3>
          <span className="item-arrow" aria-hidden="true">
            ↗
          </span>
        </div>
        <div className="item-meta">
          <span className="category-label">{item.category}</span>
          <span className="place-label">
            <span aria-hidden="true">⌖</span> {item.place}
          </span>
        </div>
        <p className="item-description">
          {item.description || (item.type === "lost" ? "Помогите найти эту вещь." : "Помогите найти владельца этой вещи.")}
        </p>
        <div className="item-card-footer">
          <span className={`status-label ${item.status}`}>
            <span />
            {item.status === "returned"
              ? "Возвращено"
              : item.status === "found"
                ? "Найдено"
                : "Ищем владельца"}
          </span>
          <span className="card-open">Подробнее</span>
        </div>
      </div>
    </Link>
  );
}
