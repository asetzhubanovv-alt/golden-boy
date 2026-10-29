"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DemoNotice, SiteHeader } from "@/app/components/SiteHeader";
import SiteFooter from "@/components/site-footer";
import {
  formatItemDate,
  getAllItems,
  ITEM_CATEGORIES,
  type ItemType,
} from "@/lib/items";
import { useStoredItems, useTodayDate } from "@/lib/use-stored-items";

type TimeFilter = "all" | "today" | "week";
type StatusFilter = "all" | "searching" | "found" | "returned";

const statusLabels: Record<Exclude<StatusFilter, "all">, string> = {
  searching: "Ищется",
  found: "Найдено",
  returned: "Возвращено",
};

function isStatusFilter(value: string): value is StatusFilter {
  return (
    value === "all" ||
    value === "searching" ||
    value === "found" ||
    value === "returned"
  );
}

const categories = ["Все категории", ...ITEM_CATEGORIES];

function Magnifier() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}

function Pin() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M19 10.1c0 5.2-7 11-7 11s-7-5.8-7-11a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [category, setCategory] = useState("Все категории");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { items: storedItems, error: storageError } = useStoredItems();
  const today = useTodayDate();
  const items = useMemo(() => getAllItems(storedItems), [storedItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");

    return items.filter((item) => {
      const itemDate = item.date ? new Date(`${item.date}T00:00:00`) : null;
      const todayDate = today ? new Date(`${today}T00:00:00`) : null;
      const age =
        itemDate && todayDate
          ? Math.floor(
              (todayDate.getTime() - itemDate.getTime()) / 86_400_000,
            )
          : item.daysAgo;
      const matchesQuery =
        !normalizedQuery ||
        [
          item.title,
          item.category,
          item.place,
          item.details,
        ].some((value) =>
          value.toLocaleLowerCase("ru").includes(normalizedQuery),
        );
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesCategory =
        category === "Все категории" || item.category === category;
      const matchesTime =
        timeFilter === "all" ||
        (timeFilter === "today" && age === 0) ||
        (timeFilter === "week" && age >= 0 && age <= 7);

      return (
        matchesQuery &&
        matchesType &&
        matchesStatus &&
        matchesCategory &&
        matchesTime
      );
    });
  }, [category, items, query, statusFilter, timeFilter, today, typeFilter]);

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setCategory("Все категории");
    setTimeFilter("all");
    setStatusFilter("all");
  }

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader />

      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" /> Сообщество кампуса
            </p>
            <h1>
              Потерял или нашёл?
              <br />
              <span>Ты в нужном месте.</span>
            </h1>
            <p>
              Помогаем вещам возвращаться к своим людям.
              <br className="desktop-break" /> Просто, быстро и по-соседски.
            </p>
          </div>
          <div className="hero-note">
            <span className="note-icon">✳</span>
            <span>
              <strong>Один кампус —</strong>
              <br />
              много добрых историй
            </span>
          </div>

          <form
            className="search-panel"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="search-field">
              <Magnifier />
              <span className="visually-hidden">
                Поиск по названию, месту или описанию
              </span>
              <input
                type="search"
                placeholder="Что ищем? Например, наушники или библиотека"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="select-field">
              <span className="visually-hidden">Категория</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <Button className="search-button" type="submit" variant="contained">
              Найти вещь
            </Button>
          </form>
          <p className="search-hint">
            Поиск по названию или выбери категорию
          </p>
        </div>
      </section>

      <section className="feed-section container">
        <div className="feed-heading">
          <div>
            <span className="section-kicker">НАЙДЁМ ВМЕСТЕ</span>
            <h2>Свежие объявления</h2>
            <p>Вещи, которые ищут и уже нашли в нашем кампусе</p>
          </div>
          <div className="community-count">
            <span className="online-dot" />
            <span>Локальная демо-лента</span>
          </div>
        </div>
        <DemoNotice />

        <div className="filter-toolbar">
          <div className="type-tabs" role="group" aria-label="Тип объявления">
            {(
              [
                ["all", "Все объявления"],
                ["lost", "Потеряли"],
                ["found", "Нашли"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={`type-tab ${typeFilter === value ? "selected" : ""}`}
                key={value}
                onClick={() => setTypeFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="date-filters" role="group" aria-label="Период">
            {(
              [
                ["today", "Сегодня"],
                ["week", "Неделя"],
                ["all", "Всё время"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={`date-filter ${timeFilter === value ? "selected" : ""}`}
                key={value}
                onClick={() => setTimeFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <label className="status-filter">
            <span className="visually-hidden">Статус объявления</span>
            <select
              onChange={(event) => {
                if (isStatusFilter(event.target.value)) {
                  setStatusFilter(event.target.value);
                }
              }}
              value={statusFilter}
            >
              <option value="all">Любой статус</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="results-row" aria-live="polite">
          <span>
            Найдено <strong>{filteredItems.length}</strong>{" "}
            {filteredItems.length === 1 ? "объявление" : "объявлений"}
          </span>
          {(query ||
            category !== "Все категории" ||
            typeFilter !== "all" ||
            timeFilter !== "all" ||
            statusFilter !== "all") && (
            <button className="reset-button" onClick={resetFilters} type="button">
              Сбросить фильтры <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        {storageError && (
          <div className="storage-message" role="alert">
            {storageError}
          </div>
        )}

        {filteredItems.length > 0 ? (
          <div className="row g-4 item-grid">
            {filteredItems.map((item) => (
              <div className="col-12 col-sm-6 col-lg-4" key={item.id}>
                <Link
                  className="item-card"
                  href={`/item/${item.id}`}
                  aria-label={`Открыть объявление: ${item.title}`}
                >
                  <div
                    className={`item-art ${item.art}${item.imageDataUrl ? " has-photo" : ""}`}
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
                    <Chip
                      className={`type-badge ${item.type}`}
                      label={item.type === "lost" ? "ПОТЕРЯЛИ" : "НАЙДЕНО"}
                      size="small"
                    />
                    <span className="art-date">
                      {formatItemDate(item.daysAgo, item.time)}
                    </span>
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
                        <Pin /> {item.place}
                      </span>
                    </div>
                    <p className="item-description">{item.details}</p>
                    <div className="item-card-footer">
                      <span className={`status-label ${item.status}`}>
                        <span />{" "}
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
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>
              {items.length > 0
                ? "По вашему запросу ничего не нашлось"
                : "Пока объявлений нет"}
            </h3>
            <p>
              {items.length > 0
                ? "Попробуйте изменить запрос или сбросить фильтры."
                : "Создайте первое объявление — оно появится в локальной ленте этого браузера."}
            </p>
            {items.length > 0 ? (
              <Button className="empty-reset" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            ) : (
              <Button component={Link} className="empty-reset" href="/add">
                Создать объявление
              </Button>
            )}
          </div>
        )}

        <div className="bottom-cta">
          <div className="cta-mark">f.</div>
          <div>
            <h3>Нашёл что-то важное?</h3>
            <p>Твоя находка может сделать чей-то день лучше.</p>
          </div>
          <Button
            className="cta-button"
            variant="contained"
            component={Link}
            href="/add"
          >
            Опубликовать находку <span aria-hidden="true">→</span>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
