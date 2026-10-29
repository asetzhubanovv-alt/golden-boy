"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoNotice, SiteHeader } from "@/app/components/SiteHeader";
import { ItemCard } from "@/app/components/ItemCard";
import { getItems, type Item, type ItemType } from "@/lib/items";

type TimeFilter = "all" | "today" | "week";

const categories = [
  "Все категории",
  "Электроника",
  "Документы и карты",
  "Ключи",
  "Одежда",
  "Сумки и рюкзаки",
  "Книги и тетради",
  "Другое",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [category, setCategory] = useState("Все категории");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    try {
      setItems(getItems());
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить сохранённые объявления.",
      );
    }
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      const itemDate = new Date(`${item.date}T00:00:00`);
      const age = Math.floor((today.getTime() - itemDate.getTime()) / 86_400_000);
      const matchesQuery =
        !normalizedQuery ||
        item.title.toLocaleLowerCase("ru").includes(normalizedQuery);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesCategory =
        category === "Все категории" || item.category === category;
      const matchesTime =
        timeFilter === "all" ||
        (timeFilter === "today" && age === 0) ||
        (timeFilter === "week" && age >= 0 && age <= 7);

      return matchesQuery && matchesType && matchesCategory && matchesTime;
    });
  }, [category, items, query, timeFilter, typeFilter]);

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setCategory("Все категории");
    setTimeFilter("all");
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
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.2 4.2" />
              </svg>
              <span className="visually-hidden">Поиск по названию вещи</span>
              <input
                type="search"
                placeholder="Что ищем? Например, наушники"
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
        </div>

        <div className="results-row" aria-live="polite">
          <span>
            Найдено <strong>{filteredItems.length}</strong>{" "}
            {filteredItems.length === 1 ? "объявление" : "объявлений"}
          </span>
          {(query ||
            category !== "Все категории" ||
            typeFilter !== "all" ||
            timeFilter !== "all") && (
            <button className="reset-button" onClick={resetFilters} type="button">
              Сбросить фильтры <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        {loadError ? (
          <Alert severity="error" className="feed-alert">
            {loadError}
          </Alert>
        ) : filteredItems.length > 0 ? (
          <div className="row g-4 item-grid">
            {filteredItems.map((item) => (
              <div className="col-12 col-sm-6 col-lg-4" key={item.id}>
                <ItemCard item={item} />
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

      <footer className="site-footer container">
        <Link className="footer-brand" href="/">
          foundly<span>.</span>
        </Link>
        <span>Создано для людей и вещей, которые должны найтись.</span>
        <Link href="/about">О проекте</Link>
      </footer>
    </main>
  );
}
