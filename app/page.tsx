"use client";

import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "next/link";

type ItemType = "lost" | "found";
type TimeFilter = "all" | "today" | "week";

type Item = {
  id: string;
  title: string;
  category: string;
  type: ItemType;
  place: string;
  daysAgo: number;
  time: string;
  status: "searching" | "found" | "returned";
  art: string;
  symbol: string;
  details: string;
};

const categories = [
  "Все категории",
  "Электроника",
  "Документы",
  "Ключи",
  "Одежда",
  "Сумки",
  "Книги",
  "Другое",
];

const items: Item[] = [
  {
    id: "blue-headphones",
    title: "Наушники Sony",
    category: "Электроника",
    type: "lost",
    place: "Библиотека, 2 этаж",
    daysAgo: 0,
    time: "12:40",
    status: "searching",
    art: "art-blue",
    symbol: "♫",
    details: "Синие беспроводные наушники в чехле. Последний раз видел(а) в читальном зале.",
  },
  {
    id: "student-card",
    title: "Студенческий билет",
    category: "Документы",
    type: "found",
    place: "Главный корпус, холл",
    daysAgo: 0,
    time: "11:15",
    status: "searching",
    art: "art-peach",
    symbol: "ID",
    details: "Нашёл(ла) студенческий билет у входа в главный корпус. Передал(а) на стойку охраны.",
  },
  {
    id: "keychain",
    title: "Связка ключей с брелоком",
    category: "Ключи",
    type: "found",
    place: "Корпус Б, аудитория 204",
    daysAgo: 1,
    time: "16:20",
    status: "searching",
    art: "art-green",
    symbol: "✳",
    details: "Три ключа на кольце и небольшой зелёный брелок. Оставил(а) у охраны корпуса.",
  },
  {
    id: "black-backpack",
    title: "Чёрный рюкзак",
    category: "Сумки",
    type: "lost",
    place: "Спортивный зал",
    daysAgo: 2,
    time: "18:05",
    status: "searching",
    art: "art-lilac",
    symbol: "▣",
    details: "Небольшой чёрный рюкзак с нашивкой. Внутри были конспекты и зарядка.",
  },
  {
    id: "chemistry-notes",
    title: "Тетрадь по химии",
    category: "Книги",
    type: "found",
    place: "Кафетерий",
    daysAgo: 3,
    time: "13:30",
    status: "returned",
    art: "art-yellow",
    symbol: "✎",
    details: "Клетчатая тетрадь с записями по органической химии. Уже ждёт владельца у администратора.",
  },
  {
    id: "silver-ring",
    title: "Серебряное кольцо",
    category: "Другое",
    type: "found",
    place: "Корпус А, аудитория 108",
    daysAgo: 5,
    time: "10:10",
    status: "searching",
    art: "art-rose",
    symbol: "○",
    details: "Небольшое серебристое кольцо найдено после пары. Напишите, если это ваша вещь.",
  },
];

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

function formatItemDate(daysAgo: number, time: string) {
  if (daysAgo === 0) return `Сегодня, ${time}`;
  if (daysAgo === 1) return `Вчера, ${time}`;
  return `${daysAgo} ${daysAgo < 5 ? "дня" : "дней"} назад, ${time}`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [category, setCategory] = useState("Все категории");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");

    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.title.toLocaleLowerCase("ru").includes(normalizedQuery);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesCategory =
        category === "Все категории" || item.category === category;
      const matchesTime =
        timeFilter === "all" ||
        (timeFilter === "today" && item.daysAgo === 0) ||
        (timeFilter === "week" && item.daysAgo <= 7);

      return matchesQuery && matchesType && matchesCategory && matchesTime;
    });
  }, [category, query, timeFilter, typeFilter]);

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setCategory("Все категории");
    setTimeFilter("all");
  }

  return (
    <main className="foundly-shell container-fluid px-0">
      <header className="site-header">
        <div className="header-inner container">
          <Link className="brand" href="/" aria-label="Foundly — главная">
            <span className="brand-mark">f</span>
            <span>foundly</span>
          </Link>

          <nav className="main-nav" aria-label="Основная навигация">
            <Link className="nav-link active" href="/">
              Лента
            </Link>
            <Link className="nav-link" href="/about">
              О проекте
            </Link>
          </nav>

          <div className="header-actions">
            <Button className="login-button" href="/login">
              Войти
            </Button>
            <Button className="publish-button" variant="contained" href="/add">
              <span aria-hidden="true">＋</span> Разместить объявление
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Сообщество кампуса
            </span>
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
            <Button
              className="search-button"
              type="submit"
              variant="contained"
            >
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
            <span>Сообщество помогает каждый день</span>
          </div>
        </div>

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

        {filteredItems.length > 0 ? (
          <div className="row g-4 item-grid">
            {filteredItems.map((item) => (
              <div className="col-12 col-sm-6 col-lg-4" key={item.id}>
                <Link
                  className="item-card"
                  href={`/item/${item.id}`}
                  aria-label={`Открыть объявление: ${item.title}`}
                >
                  <div className={`item-art ${item.art}`}>
                    <span className="art-shape art-shape-one" />
                    <span className="art-shape art-shape-two" />
                    <span className="art-symbol">{item.symbol}</span>
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
            <h3>Пока ничего не нашлось</h3>
            <p>Попробуй изменить запрос или сбросить фильтры.</p>
            <Button className="empty-reset" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        )}

        <div className="bottom-cta">
          <div className="cta-mark">f.</div>
          <div>
            <h3>Нашёл что-то важное?</h3>
            <p>Твоя находка может сделать чей-то день лучше.</p>
          </div>
          <Button className="cta-button" variant="contained" href="/add">
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
