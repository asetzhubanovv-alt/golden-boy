"use client";

import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getAllItems } from "@/lib/items";
import { useStoredItems } from "@/lib/use-stored-items";
import { useLanguage } from "@/components/language-provider";

type TimeFilter = "all" | "today" | "week";

type Language = "kk" | "ru" | "en";
type ItemType = "lost" | "found";

type TextEntry = {
  ru: string;
  kk: string;
  en: string;
};

type Item = {
  id: string;
  title: TextEntry;
  categoryKey: string;
  type: ItemType;
  place: TextEntry;
  daysAgo: number;
  time: string;
  status: "searching" | "found" | "returned";
  art: string;
  symbol: string;
  details: TextEntry;
};

type TranslationSet = {
  nav: {
    feed: string;
    about: string;
    login: string;
    publish: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    describe: string;
    note: string;
    noteStrong: string;
    searchPlaceholder: string;
    searchHint: string;
    searchButton: string;
    categoryLabel: string;
  };
  filters: {
    allCategories: string;
    allTypes: string;
    lost: string;
    found: string;
    today: string;
    week: string;
    allTime: string;
    reset: string;
    resultsFound: string;
    resultSingular: string;
    resultPlural: string;
  };
  sections: {
    kicker: string;
    title: string;
    subtitle: string;
    community: string;
    bottomTitle: string;
    bottomText: string;
    publishFinding: string;
  };
  card: {
    found: string;
    lost: string;
    ownerSearch: string;
    returned: string;
    foundStatus: string;
    more: string;
  };
  footer: {
    about: string;
    description: string;
  };
  emptyState: {
    message: string;
  };
  brand: {
    homeLabel: string;
  };
  language: string;
  categories: Record<string, string>;
};

const categoryKeys = [
  "all",
  "electronics",
  "documents",
  "keys",
  "clothes",
  "bags",
  "books",
  "other",
] as const;

const translations: Record<Language, TranslationSet> = {
  kk: {
    nav: {
      feed: "Лента",
      about: "Жоба туралы",
      login: "Кіру",
      publish: "Елдеді жариялау",
    },
    hero: {
      eyebrow: "Кампус қауымдастығы",
      title: "Жоғалттыңыз ба",
      titleAccent: "Немесе таптыңыз ба?",
      describe: "Заттарды иелеріне қайта оралтуға көмектесеміз.",
      note: "Бір кампус —",
      noteStrong: "көптеген жақсы оқиғалар",
      searchPlaceholder: "Не іздеп жатырмыз? Мысалы, құлаққап",
      searchHint: "Атын енгізіңіз немесе санат таңдаңыз",
      searchButton: "Затты табу",
      categoryLabel: "Санат",
    },
    filters: {
      allCategories: "Барлық санаттар",
      allTypes: "Барлық хабарламалар",
      lost: "Жоғалған",
      found: "Табылды",
      today: "Бүгін",
      week: "Апта",
      allTime: "Барлық уақыт",
      reset: "Фильтрлерді қалпына келтіру",
      resultsFound: "Табылды",
      resultSingular: "хабарлама",
      resultPlural: "хабарлама",
    },
    sections: {
      kicker: "БІЗ БІРГЕ ТАБЫМЫЗ",
      title: "Жаңа хабарламалар",
      subtitle: "Біздің кампус ішінде ізделіп, табылған заттар",
      community: "Қауымдастық күн сайын көмектеседі",
      bottomTitle: "Мұнда маңызды зат бар ма?",
      bottomText: "Сіздің табылған зат басқа адамның күнін жақсарта алады.",
      publishFinding: "Табылған затты жариялау",
    },
    card: {
      found: "ТАБЫЛДЫ",
      lost: "ЖОҒАЛДЫ",
      ownerSearch: "Иесінің іздеуі",
      returned: "Қайтарылды",
      foundStatus: "Табылды",
      more: "Толығырақ",
    },
    footer: {
      about: "Жоба туралы",
      description: "Адамдарға және табылуға тиіс заттарға арналған.",
    },
    emptyState: {
      message: "Сұранысты өзгертіп немесе фильтрлерді қайта орнатыңыз.",
    },
    brand: {
      homeLabel: "Foundly — негізгі бет",
    },
    language: "Тіл",
    categories: {
      all: "Барлық санаттар",
      electronics: "Электроника",
      documents: "Құжаттар",
      keys: "Кілттер",
      clothes: "Киім",
      bags: "Сөмкелер",
      books: "Кітаптар",
      other: "Басқа",
    },
  },
  ru: {
    nav: {
      feed: "Лента",
      about: "О проекте",
      login: "Войти",
      publish: "Разместить объявление",
    },
    hero: {
      eyebrow: "Сообщество кампуса",
      title: "Потерял или нашёл?",
      titleAccent: "Ты в нужном месте.",
      describe: "Помогаем вещам возвращаться к своим людям.",
      note: "Один кампус —",
      noteStrong: "много добрых историй",
      searchPlaceholder: "Что ищем? Например, наушники",
      searchHint: "Поиск по названию или выбери категорию",
      searchButton: "Найти вещь",
      categoryLabel: "Категория",
    },
    filters: {
      allCategories: "Все категории",
      allTypes: "Все объявления",
      lost: "Потеряли",
      found: "Нашли",
      today: "Сегодня",
      week: "Неделя",
      allTime: "Всё время",
      reset: "Сбросить фильтры",
      resultsFound: "Найдено",
      resultSingular: "объявление",
      resultPlural: "объявлений",
    },
    sections: {
      kicker: "НАЙДЁМ ВМЕСТЕ",
      title: "Свежие объявления",
      subtitle: "Вещи, которые ищут и уже нашли в нашем кампусе",
      community: "Сообщество помогает каждый день",
      bottomTitle: "Нашёл что-то важное?",
      bottomText: "Твоя находка может сделать чей-то день лучше.",
      publishFinding: "Опубликовать находку",
    },
    card: {
      found: "НАЙДЕНО",
      lost: "ПОТЕРЯЛИ",
      ownerSearch: "Ищем владельца",
      returned: "Возвращено",
      foundStatus: "Найдено",
      more: "Подробнее",
    },
    footer: {
      about: "О проекте",
      description: "Создано для людей и вещей, которые должны найтись.",
    },
    emptyState: {
      message: "Попробуй изменить запрос или сбросить фильтры.",
    },
    brand: {
      homeLabel: "Foundly — главная страница",
    },
    language: "Язык",
    categories: {
      all: "Все категории",
      electronics: "Электроника",
      documents: "Документы",
      keys: "Ключи",
      clothes: "Одежда",
      bags: "Сумки",
      books: "Книги",
      other: "Другое",
    },
  },
  en: {
    nav: {
      feed: "Feed",
      about: "About",
      login: "Log in",
      publish: "Post an ad",
    },
    hero: {
      eyebrow: "Campus community",
      title: "Lost something?",
      titleAccent: "Or found something? You’re in the right place.",
      describe: "We help belongings find their people again.",
      note: "One campus —",
      noteStrong: "many good stories",
      searchPlaceholder: "What are we looking for? For example, headphones",
      searchHint: "Search by name or choose a category",
      searchButton: "Find item",
      categoryLabel: "Category",
    },
    filters: {
      allCategories: "All categories",
      allTypes: "All listings",
      lost: "Lost",
      found: "Found",
      today: "Today",
      week: "Week",
      allTime: "All time",
      reset: "Reset filters",
      resultsFound: "Found",
      resultSingular: "listing",
      resultPlural: "listings",
    },
    sections: {
      kicker: "LET'S FIND IT TOGETHER",
      title: "Recent listings",
      subtitle: "Items being searched for and already found around campus",
      community: "The community helps every day",
      bottomTitle: "Found something important?",
      bottomText: "Your find could make someone’s day better.",
      publishFinding: "Publish a find",
    },
    card: {
      found: "FOUND",
      lost: "LOST",
      ownerSearch: "Looking for owner",
      returned: "Returned",
      foundStatus: "Found",
      more: "More details",
    },
    footer: {
      about: "About",
      description: "Built for people and the things that should be found.",
    },
    emptyState: {
      message: "Try changing the search or resetting the filters.",
    },
    brand: {
      homeLabel: "Foundly — home page",
    },
    language: "Language",
    categories: {
      all: "All categories",
      electronics: "Electronics",
      documents: "Documents",
      keys: "Keys",
      clothes: "Clothing",
      bags: "Bags",
      books: "Books",
      other: "Other",
    },
  },
};

const localizedDemoItems: Item[] = [
  {
    id: "blue-headphones",
    title: { ru: "Наушники Sony", kk: "Sony құлаққаптары", en: "Sony headphones" },
    categoryKey: "electronics",
    type: "lost",
    place: { ru: "Библиотека, 2 этаж", kk: "Кітапхана, 2 қабат", en: "Library, 2nd floor" },
    daysAgo: 0,
    time: "12:40",
    status: "searching",
    art: "art-blue",
    symbol: "♫",
    details: {
      ru: "Синие беспроводные наушники в чехле. Последний раз видел(а) в читальном зале.",
      kk: "Көк, ұялы құлаққаптар корпустық қалтада. Соңғы рет оқу залында көрілді.",
      en: "Blue wireless headphones in a case. Last seen in the reading room.",
    },
  },
  {
    id: "student-card",
    title: { ru: "Студенческий билет", kk: "Студенттік билеті", en: "Student ID" },
    categoryKey: "documents",
    type: "found",
    place: { ru: "Главный корпус, холл", kk: "Негізгі корпуc, холл", en: "Main building, lobby" },
    daysAgo: 0,
    time: "11:15",
    status: "searching",
    art: "art-peach",
    symbol: "ID",
    details: {
      ru: "Нашёл(ла) студенческий билет у входа в главный корпус. Передал(а) на стойку охраны.",
      kk: "Негізгі корпустың кіреберісінде студенттік билетті таптым. Қауіпсіздік пәтеріне тапсырдым.",
      en: "Found a student ID by the main entrance. I left it at the security desk.",
    },
  },
  {
    id: "keychain",
    title: { ru: "Связка ключей с брелоком", kk: "Кілттер жиынтығы", en: "Key ring with charm" },
    categoryKey: "keys",
    type: "found",
    place: { ru: "Корпус Б, аудитория 204", kk: "Б корпусы, 204 аудитория", en: "Building B, room 204" },
    daysAgo: 1,
    time: "16:20",
    status: "searching",
    art: "art-green",
    symbol: "✳",
    details: {
      ru: "Три ключа на кольце и небольшой зелёный брелок. Оставил(а) у охраны корпуса.",
      kk: "Шеңбердегі үш кілт пен кішкентай жасыл брелок. Корпус күзетіне қалдырдым.",
      en: "Three keys on a ring and a small green charm. Left with the building security.",
    },
  },
  {
    id: "black-backpack",
    title: { ru: "Чёрный рюкзак", kk: "Қара рюкзак", en: "Black backpack" },
    categoryKey: "bags",
    type: "lost",
    place: { ru: "Спортивный зал", kk: "Спорт залы", en: "Gym" },
    daysAgo: 2,
    time: "18:05",
    status: "searching",
    art: "art-lilac",
    symbol: "▣",
    details: {
      ru: "Небольшой чёрный рюкзак с нашивкой. Внутри были конспекты и зарядка.",
      kk: "Штамппен кішкентай қара рюкзак. Ішінде конспектілер мен зарядтау құрылғысы болды.",
      en: "A small black backpack with a patch. It had notes and a charger inside.",
    },
  },
  {
    id: "chemistry-notes",
    title: { ru: "Тетрадь по химии", kk: "Химия дәптері", en: "Chemistry notebook" },
    categoryKey: "books",
    type: "found",
    place: { ru: "Кафетерий", kk: "Кафетерий", en: "Cafeteria" },
    daysAgo: 3,
    time: "13:30",
    status: "returned",
    art: "art-yellow",
    symbol: "✎",
    details: {
      ru: "Клетчатая тетрадь с записями по органической химии. Уже ждёт владельца у администратора.",
      kk: "Ұяшықты дәптер, органикалық химияға жазбалар бар. Әкімшілікке берілді, иесі күтуде.",
      en: "A graph notebook with organic chemistry notes. It is waiting with the administrator.",
    },
  },
  {
    id: "silver-ring",
    title: { ru: "Серебряное кольцо", kk: "Күміс сақина", en: "Silver ring" },
    categoryKey: "other",
    type: "found",
    place: { ru: "Корпус А, аудитория 108", kk: "А корпусы, 108 аудитория", en: "Building A, room 108" },
    daysAgo: 5,
    time: "10:10",
    status: "searching",
    art: "art-rose",
    symbol: "○",
    details: {
      ru: "Небольшое серебристое кольцо найдено после пары. Напишите, если это ваша вещь.",
      kk: "Кішкентай күмістен жасалған сақина сабақтан кейін табылды. Егер сіздің болса, жазыңыз.",
      en: "A small silver ring was found after class. Write if it’s yours.",
    },
  },
];
const categoryKeyByName: Record<string, string> = {
  Электроника: "electronics",
  Документы: "documents",
  Ключи: "keys",
  Одежда: "clothes",
  Сумки: "bags",
  Книги: "books",
  Другое: "other",
};

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

function formatItemDate(daysAgo: number, time: string, language: Language) {
  if (daysAgo === 0) {
    return language === "en" ? `Today, ${time}` : language === "kk" ? `Бүгін, ${time}` : `Сегодня, ${time}`;
  }
  if (daysAgo === 1) {
    return language === "en" ? `Yesterday, ${time}` : language === "kk" ? `Кеше, ${time}` : `Вчера, ${time}`;
  }

  if (language === "en") {
    return `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago, ${time}`;
  }

  if (language === "kk") {
    return `${daysAgo} күн бұрын, ${time}`;
  }

  return `${daysAgo} ${daysAgo < 5 ? "дня" : "дней"} назад, ${time}`;
}

export default function Home() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [category, setCategory] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const { items: storedItems, error: storageError } = useStoredItems();

  const t = translations[language];

  const categoryOptions = categoryKeys.map((key) => ({
    value: key,
    label: key === "all" ? t.filters.allCategories : t.categories[key],
  }));

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language);
    const items = getAllItems(storedItems);

    return items.filter((item) => {
      const localizedItem = localizedDemoItems.find((entry) => entry.id === item.id);
      const titleText = (localizedItem?.title[language] ?? item.title).toLocaleLowerCase(language);
      const matchesQuery = !normalizedQuery || titleText.includes(normalizedQuery);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const itemCategory = localizedItem?.categoryKey ?? categoryKeyByName[item.category];
      const matchesCategory = category === "all" || itemCategory === category;
      const matchesTime =
        timeFilter === "all" ||
        (timeFilter === "today" && item.daysAgo === 0) ||
        (timeFilter === "week" && item.daysAgo <= 7);

      return matchesQuery && matchesType && matchesCategory && matchesTime;
    });
  }, [category, language, query, storedItems, timeFilter, typeFilter]);

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setCategory("all");
    setTimeFilter("all");
  }

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="feed" />

      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> {t.hero.eyebrow}
            </span>
            <h1>
              {t.hero.title}
              <br />
              <span>{t.hero.titleAccent}</span>
            </h1>
            <p>
              {t.hero.describe}
              <br className="desktop-break" />
            </p>
          </div>
          <div className="hero-note">
            <span className="note-icon">✳</span>
            <span>
              <strong>{t.hero.note}</strong>
              <br />
              {t.hero.noteStrong}
            </span>
          </div>

          <form className="search-panel" onSubmit={(event) => event.preventDefault()}>
            <label className="search-field">
              <Magnifier />
              <span className="visually-hidden">{t.hero.categoryLabel}</span>
              <input
                type="search"
                placeholder={t.hero.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="select-field">
              <span className="visually-hidden">{t.hero.categoryLabel}</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button className="search-button" type="submit" variant="contained">
              {t.hero.searchButton}
            </Button>
          </form>
          <p className="search-hint">{t.hero.searchHint}</p>
        </div>
      </section>

      <section className="feed-section container">
        <div className="feed-heading">
          <div>
            <span className="section-kicker">{t.sections.kicker}</span>
            <h2>{t.sections.title}</h2>
            <p>{t.sections.subtitle}</p>
          </div>
          <div className="community-count">
            <span className="online-dot" />
            <span>{t.sections.community}</span>
          </div>
        </div>

        <div className="filter-toolbar">
          <div className="type-tabs" role="group" aria-label="Type filter">
            {([
              ["all", t.filters.allTypes],
              ["lost", t.filters.lost],
              ["found", t.filters.found],
            ] as const).map(([value, label]) => (
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
          <div className="date-filters" role="group" aria-label="Time filters">
            {([
              ["today", t.filters.today],
              ["week", t.filters.week],
              ["all", t.filters.allTime],
            ] as const).map(([value, label]) => (
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
            {t.filters.resultsFound} <strong>{filteredItems.length}</strong>{" "}
            {filteredItems.length === 1 ? t.filters.resultSingular : t.filters.resultPlural}
          </span>
          {(query ||
            category !== "all" ||
            typeFilter !== "all" ||
            timeFilter !== "all") && (
            <button className="reset-button" onClick={resetFilters} type="button">
              {t.filters.reset} <span aria-hidden="true">×</span>
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
            {filteredItems.map((item) => {
              const localizedItem = localizedDemoItems.find((entry) => entry.id === item.id);
              const title = localizedItem?.title[language] ?? item.title;
              const place = localizedItem?.place[language] ?? item.place;
              const details = localizedItem?.details[language] ?? item.details;
              const itemCategory = localizedItem?.categoryKey ?? categoryKeyByName[item.category];

              return (
                <div className="col-12 col-sm-6 col-lg-4" key={item.id}>
                  <Link
                    className="item-card"
                    href={`/item/${item.id}`}
                    aria-label={`${t.card.more}: ${title}`}
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
                        label={item.type === "lost" ? t.card.lost : t.card.found}
                        size="small"
                      />
                      <span className="art-date">
                        {formatItemDate(item.daysAgo, item.time, language)}
                      </span>
                    </div>
                    <div className="item-card-content">
                      <div className="item-card-title-row">
                        <h3>{title}</h3>
                        <span className="item-arrow" aria-hidden="true">
                          ↗
                        </span>
                      </div>
                      <div className="item-meta">
                        <span className="category-label">
                          {itemCategory ? t.categories[itemCategory] : item.category}
                        </span>
                        <span className="place-label">
                          <Pin /> {place}
                        </span>
                      </div>
                      <p className="item-description">{details}</p>
                      <div className="item-card-footer">
                        <span className={`status-label ${item.status}`}>
                          <span />{" "}
                          {item.status === "returned"
                            ? t.card.returned
                            : item.status === "found"
                              ? t.card.foundStatus
                              : t.card.ownerSearch}
                        </span>
                        <span className="card-open">{t.card.more}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>{t.filters.reset}</h3>
            <p>{t.emptyState.message}</p>
            <Button className="empty-reset" onClick={resetFilters}>
              {t.filters.reset}
            </Button>
          </div>
        )}

        <div className="bottom-cta">
          <div className="cta-mark">f.</div>
          <div>
            <h3>{t.sections.bottomTitle}</h3>
            <p>{t.sections.bottomText}</p>
          </div>
          <Button className="cta-button" variant="contained" href="/add">
            {t.sections.publishFinding} <span aria-hidden="true">→</span>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
