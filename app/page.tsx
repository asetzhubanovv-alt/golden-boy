"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFavorites } from "@/components/favorites-provider";
import ListingCard from "@/components/listing-card";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import {
  formatItemDate,
  getAllItems,
  getDistanceInKm,
  type ItemLocation,
} from "@/lib/items";
import { useStoredItems, useTodayDate } from "@/lib/use-stored-items";
import { useLanguage } from "@/components/language-provider";
import MapLocationPicker from "@/components/map-location-picker";
import { localizeDemoItem } from "@/lib/localized-demo-items";

type TimeFilter = "all" | "today" | "week";
type StatusFilter = "all" | "searching" | "found" | "returned";

function isStatusFilter(value: string): value is StatusFilter {
  return (
    value === "all" ||
    value === "searching" ||
    value === "found" ||
    value === "returned"
  );
}

type Language = "kk" | "ru" | "en";
type ItemType = "lost" | "found";
type PaginationEntry = number | "start-ellipsis" | "end-ellipsis";
type Filters = {
  category: string;
  type: "all" | ItemType;
  time: TimeFilter;
  status: StatusFilter;
  location: ItemLocation;
  radiusKm: number;
};

const ITEMS_PER_PAGE = 9;
const DEFAULT_FILTERS: Filters = {
  category: "all",
  type: "all",
  time: "all",
  status: "all",
  location: { address: "", latitude: null, longitude: null },
  radiusKm: 5,
};

type TranslationSet = {
  nav: {
    feed: string;
    about: string;
    login: string;
    publish: string;
  };
  hero: {
    searchPlaceholder: string;
    searchButton: string;
    reportFound: string;
    reportLost: string;
  };
  promo: {
    kicker: string;
    title: string;
    description: string;
    action: string;
    creativeTitle: string;
  };
  filters: {
    categoryLabel: string;
    allCategories: string;
    allTypes: string;
    lost: string;
    found: string;
    today: string;
    week: string;
    allTime: string;
    open: string;
    title: string;
    close: string;
    typeLabel: string;
    dateLabel: string;
    statusLabel: string;
    locationLabel: string;
    radiusLabel: string;
    nearbyUnit: string;
    anyStatus: string;
    searching: string;
    foundStatus: string;
    returned: string;
    reset: string;
    resultsFound: string;
    resultSingular: string;
    resultPlural: string;
  };
  sections: {
    title: string;
  };
  pagination: {
    previous: string;
    next: string;
    label: string;
  };
  card: {
    found: string;
    lost: string;
    ownerSearch: string;
    returned: string;
    foundStatus: string;
    more: string;
    rewardBadge: string;
    verifiedUser: string;
    addFavorite: string;
    inFavorites: string;
    removeFavorite: string;
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
  "documents",
  "phone",
  "keys",
  "headphones",
  "clothes",
  "bags",
  "other",
  "electronics",
  "books",
] as const;

const translations: Record<Language, TranslationSet> = {
  kk: {
    nav: {
      feed: "Хабарландырулар",
      about: "Біз туралы",
      login: "Кіру",
      publish: "Хабарландыру жариялау",
    },
    hero: {
      searchPlaceholder: "Не іздеп жатырмыз? Мысалы, құлаққап",
      searchButton: "Затты табу",
      reportFound: "Табылған зат туралы хабарлау",
      reportLost: "Жоғалған зат туралы хабарлау",
    },
    promo: {
      kicker: "AMANAT · ҚАУЫМДАСТЫҚ КӨМЕГІ",
      title: "Жоғалттыңыз ба, әлде таптыңыз ба?",
      description: "Жоғалған және табылған заттар туралы хабарландыруларды бір жерден іздеңіз.",
      action: "Хабарландыруларды көру",
      creativeTitle: "ІЗДЕЙМІЗ. ТАБАМЫЗ. ҚАЙТАРАМЫЗ.",
    },
    filters: {
      categoryLabel: "Санат",
      allCategories: "Барлық санаттар",
      allTypes: "Барлық хабарландырулар",
      lost: "Жоғалған",
      found: "Табылған",
      today: "Бүгін",
      week: "Апта",
      allTime: "Барлық уақыт",
      open: "Сүзгі",
      title: "Хабарландыруларды сүзу",
      close: "Дайын",
      typeLabel: "Хабарландыру түрі",
      dateLabel: "Жарияланған күні",
      statusLabel: "Хабарландыру күйі",
      locationLabel: "Орналасқан жері",
      radiusLabel: "Іздеу радиусы",
      nearbyUnit: "км",
      anyStatus: "Кез келген күй",
      searching: "Ізделуде",
      foundStatus: "Табылды",
      returned: "Қайтарылды",
      reset: "Сүзгілерді тазарту",
      resultsFound: "Нәтиже:",
      resultSingular: "хабарландыру",
      resultPlural: "хабарландыру",
    },
    sections: {
      title: "Хабарландырулар",
    },
    pagination: {
      previous: "Артқа",
      next: "Алға",
      label: "Хабарландыру беттері",
    },
    card: {
      found: "ТАБЫЛДЫ",
      lost: "ЖОҒАЛДЫ",
      ownerSearch: "Иесі ізделуде",
      returned: "Қайтарылды",
      foundStatus: "Табылды",
      more: "Толығырақ",
      rewardBadge: "СЫЙАҚЫ",
      verifiedUser: "Расталған пайдаланушы",
      addFavorite: "Таңдаулыларға",
      inFavorites: "Таңдаулыларда",
      removeFavorite: "Таңдаулылардан алып тастау",
    },
    emptyState: {
      message: "Іздеу сұрауын өзгертіп, сүзгілерді тазалап көріңіз.",
    },
    brand: {
      homeLabel: "Amanat — негізгі бет",
    },
    language: "Тіл",
    categories: {
      all: "Барлық санаттар",
      documents: "Құжаттар",
      phone: "Телефон",
      keys: "Кілттер",
      headphones: "Құлаққап",
      clothes: "Киім",
      bags: "Сөмкелер",
      other: "Басқа",
      electronics: "Электр құрылғылары",
      books: "Кітаптар",
    },
  },
  ru: {
    nav: {
      feed: "Лента",
      about: "О нас",
      login: "Войти",
      publish: "Разместить объявление",
    },
    hero: {
      searchPlaceholder: "Что ищем? Например, наушники",
      searchButton: "Найти вещь",
      reportFound: "Заявить о находке",
      reportLost: "Заявить о пропаже",
    },
    promo: {
      kicker: "AMANAT · ПОМОЩЬ СООБЩЕСТВА",
      title: "Потерял или нашёл?",
      description: "Ищите потерянные вещи и сообщайте о находках в одном месте.",
      action: "Смотреть объявления",
      creativeTitle: "ИЩЕМ. НАХОДИМ. ВОЗВРАЩАЕМ.",
    },
    filters: {
      categoryLabel: "Категория",
      allCategories: "Все категории",
      allTypes: "Все объявления",
      lost: "Потеряли",
      found: "Нашли",
      today: "Сегодня",
      week: "Неделя",
      allTime: "Всё время",
      open: "Фильтр",
      title: "Фильтры объявлений",
      close: "Готово",
      typeLabel: "Тип объявления",
      dateLabel: "Дата публикации",
      statusLabel: "Статус объявления",
      locationLabel: "Местоположение",
      radiusLabel: "Радиус поиска",
      nearbyUnit: "км",
      anyStatus: "Любой статус",
      searching: "Ищется",
      foundStatus: "Найдено",
      returned: "Возвращено",
      reset: "Сбросить фильтры",
      resultsFound: "Найдено",
      resultSingular: "объявление",
      resultPlural: "объявлений",
    },
    sections: {
      title: "Объявления",
    },
    pagination: {
      previous: "Назад",
      next: "Вперёд",
      label: "Страницы объявлений",
    },
    card: {
      found: "НАЙДЕНО",
      lost: "ПОТЕРЯЛИ",
      ownerSearch: "Ищем владельца",
      returned: "Возвращено",
      foundStatus: "Найдено",
      more: "Подробнее",
      rewardBadge: "ВОЗНАГРАЖДЕНИЕ",
      verifiedUser: "Подтверждённый пользователь",
      addFavorite: "В избранное",
      inFavorites: "В избранном",
      removeFavorite: "Убрать из избранного",
    },
    emptyState: {
      message: "Попробуй изменить запрос или сбросить фильтры.",
    },
    brand: {
      homeLabel: "Amanat — главная страница",
    },
    language: "Язык",
    categories: {
      all: "Все категории",
      documents: "Документы",
      phone: "Телефон",
      keys: "Ключи",
      headphones: "Наушники",
      clothes: "Одежда",
      bags: "Сумки",
      other: "Другое",
      electronics: "Электроника",
      books: "Книги",
    },
  },
  en: {
    nav: {
      feed: "Feed",
      about: "About us",
      login: "Log in",
      publish: "Post an ad",
    },
    hero: {
      searchPlaceholder: "What are we looking for? For example, headphones",
      searchButton: "Find item",
      reportFound: "Report a found item",
      reportLost: "Report a lost item",
    },
    promo: {
      kicker: "AMANAT · COMMUNITY-POWERED",
      title: "Lost or found something?",
      description: "Find lost items and share your discoveries, all in one place.",
      action: "Browse listings",
      creativeTitle: "SEARCH. FIND. RETURN.",
    },
    filters: {
      categoryLabel: "Category",
      allCategories: "All categories",
      allTypes: "All listings",
      lost: "Lost",
      found: "Found",
      today: "Today",
      week: "Week",
      allTime: "All time",
      open: "Filters",
      title: "Listing filters",
      close: "Done",
      typeLabel: "Listing type",
      dateLabel: "Date posted",
      statusLabel: "Listing status",
      locationLabel: "Location",
      radiusLabel: "Search radius",
      nearbyUnit: "km",
      anyStatus: "Any status",
      searching: "Searching",
      foundStatus: "Found",
      returned: "Returned",
      reset: "Reset filters",
      resultsFound: "Found",
      resultSingular: "listing",
      resultPlural: "listings",
    },
    sections: {
      title: "Listings",
    },
    pagination: {
      previous: "Previous",
      next: "Next",
      label: "Listing pages",
    },
    card: {
      found: "FOUND",
      lost: "LOST",
      ownerSearch: "Looking for owner",
      returned: "Returned",
      foundStatus: "Found",
      more: "More details",
      rewardBadge: "REWARD",
      verifiedUser: "Verified user",
      addFavorite: "Save to favorites",
      inFavorites: "In favorites",
      removeFavorite: "Remove from favorites",
    },
    emptyState: {
      message: "Try changing the search or resetting the filters.",
    },
    brand: {
      homeLabel: "Amanat — home page",
    },
    language: "Language",
    categories: {
      all: "All categories",
      documents: "Documents",
      phone: "Phone",
      keys: "Keys",
      headphones: "Headphones",
      clothes: "Clothing",
      bags: "Bags",
      other: "Other",
      electronics: "Electronics",
      books: "Books",
    },
  },
};

function Magnifier() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}

export default function Home() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { items: storedItems, error: storageError } = useStoredItems();
  const {
    favoriteIds,
    isReady: favoritesReady,
    toggleFavorite,
  } = useFavorites();
  const today = useTodayDate();
  const items = useMemo(() => getAllItems(storedItems), [storedItems]);

  const t = translations[language];
  const activeFilterCount = Number(filters.category !== "all") +
    Number(filters.type !== "all") +
    Number(filters.time !== "all") +
    Number(filters.status !== "all") +
    Number(filters.location.latitude !== null && filters.location.longitude !== null);

  useEffect(() => {
    if (!isFilterDialogOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsFilterDialogOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFilterDialogOpen]);

  const categoryOptions = categoryKeys.map((key) => ({
    value: key,
    label: key === "all" ? t.filters.allCategories : t.categories[key],
  }));

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language);

    return items.filter((item) => {
      const itemDate = item.date ? new Date(`${item.date}T00:00:00`) : null;
      const todayDate = today ? new Date(`${today}T00:00:00`) : null;
      const age =
        itemDate && todayDate
          ? Math.floor(
              (todayDate.getTime() - itemDate.getTime()) / 86_400_000,
            )
          : item.daysAgo;
      const localizedItem = localizeDemoItem(item, language);
      const titleText = localizedItem.title.toLocaleLowerCase(language);
      const categoryText = localizedItem.categoryKey
        ? t.categories[localizedItem.categoryKey]
        : item.category;
      const searchableText = [
        titleText,
        localizedItem.place,
        localizedItem.details,
        categoryText,
      ];
      const matchesQuery =
        !normalizedQuery ||
        searchableText.some((value) =>
          value.toLocaleLowerCase(language).includes(normalizedQuery),
        );
      const matchesType = filters.type === "all" || item.type === filters.type;
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "found"
          ? item.type === "found"
          : item.status === filters.status);
      const itemCategory = localizedItem.categoryKey;
      const matchesCategory = filters.category === "all" || itemCategory === filters.category;
      const matchesTime =
        filters.time === "all" ||
        (filters.time === "today" && age === 0) ||
        (filters.time === "week" && age >= 0 && age <= 7);
      const filterLatitude = filters.location.latitude;
      const filterLongitude = filters.location.longitude;
      const matchesLocation =
        filterLatitude === null ||
        filterLongitude === null ||
        (item.latitude != null &&
          item.longitude != null &&
          getDistanceInKm(
            { latitude: filterLatitude, longitude: filterLongitude },
            { latitude: item.latitude, longitude: item.longitude },
          ) <=
            filters.radiusKm);

      return (
        matchesQuery &&
        matchesType &&
        matchesStatus &&
        matchesCategory &&
        matchesTime &&
        matchesLocation
      );
    });
  }, [filters, items, language, query, t.categories, today]);
  const pageCount = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const activePage = Math.min(currentPage, Math.max(pageCount, 1));
  const visibleItems = filteredItems.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  );
  const firstPageNumber = Math.max(2, activePage - 1);
  const lastPageNumber = Math.min(pageCount - 1, activePage + 1);
  const pageEntries: PaginationEntry[] =
    pageCount <= 5
      ? Array.from({ length: pageCount }, (_, index) => index + 1)
      : [
          1,
          ...(firstPageNumber > 2 ? ["start-ellipsis" as const] : []),
          ...Array.from(
            { length: Math.max(0, lastPageNumber - firstPageNumber + 1) },
            (_, index) => firstPageNumber + index,
          ),
          ...(lastPageNumber < pageCount - 1 ? ["end-ellipsis" as const] : []),
          pageCount,
        ];

  function resetFilters() {
    setQuery("");
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }

  function resetDraftFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setDraftQuery("");
  }

  function applyDraftFilters() {
    setQuery(draftQuery);
    setFilters(draftFilters);
    setCurrentPage(1);
    setIsFilterDialogOpen(false);
  }

  function goToPage(page: number) {
    setCurrentPage(page);
    document.getElementById("feed")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="feed" />

      <section aria-label="Amanat" className="foundly-promo">
        <div className="foundly-promo-inner container">
          <div className="foundly-promo-copy">
            <span className="foundly-promo-kicker">{t.promo.kicker}</span>
            <h1>{t.promo.title}</h1>
            <p>{t.promo.description}</p>
            <Link className="foundly-promo-action" href="#feed">
              {t.promo.action}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div aria-hidden="true" className="foundly-promo-art">
            <span className="foundly-promo-orbit foundly-promo-orbit-outer" />
            <span className="foundly-promo-orbit foundly-promo-orbit-inner" />
            <div className="foundly-promo-art-content">
              <span className="foundly-promo-wordmark">Amanat</span>
              <span className="foundly-promo-art-title">{t.promo.creativeTitle}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hero-section">
        <div className="container hero-content">
          <div className="report-actions">
            <Link className="report-action report-action-found" href="/report/found">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.2 4.2" />
              </svg>
              <span>{t.hero.reportFound}</span>
            </Link>
            <Link className="report-action report-action-lost" href="/report/lost">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path d="M10.3 3.8 2.4 17.4A1.8 1.8 0 0 0 4 20.1h16a1.8 1.8 0 0 0 1.6-2.7L13.7 3.8a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4.5M12 17h.01" />
              </svg>
              <span>{t.hero.reportLost}</span>
            </Link>
          </div>
          <form className="search-panel" onSubmit={(event) => event.preventDefault()}>
            <label className="search-field">
              <Magnifier />
              <span className="visually-hidden">{t.hero.searchPlaceholder}</span>
              <input
                type="search"
                placeholder={t.hero.searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>
            <Button className="search-button" type="submit" variant="contained">
              {t.hero.searchButton}
            </Button>
          </form>
        </div>
      </section>

      <section className="feed-section container" id="feed">
        <div className="feed-heading">
          <h2>{t.sections.title}</h2>
          <button
            aria-expanded={isFilterDialogOpen}
            aria-haspopup="dialog"
            aria-label={t.filters.open}
            className="filter-open-button"
            onClick={() => {
              setDraftQuery(query);
              setDraftFilters(filters);
              setIsFilterDialogOpen(true);
            }}
            type="button"
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="M4 7h16M7 12h10m-7 5h4" />
            </svg>
            {t.filters.open}
            {activeFilterCount > 0 && (
              <span aria-hidden="true" className="filter-active-count">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        {isFilterDialogOpen && (
          <div
            className="filter-dialog-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsFilterDialogOpen(false);
              }
            }}
          >
            <section
              aria-labelledby="filter-dialog-title"
              aria-modal="true"
              className="filter-dialog"
              role="dialog"
            >
              <header className="filter-dialog-header">
                <h2 id="filter-dialog-title">{t.filters.title}</h2>
                <button
                  aria-label={t.filters.close}
                  className="filter-dialog-close"
                  onClick={() => setIsFilterDialogOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </header>
              <div className="filter-dialog-content">
                <label className="status-filter filter-category">
                  <span>{t.filters.categoryLabel}</span>
                  <select
                    onChange={(event) => {
                      setDraftFilters((current) => ({
                        ...current,
                        category: event.target.value,
                      }));
                    }}
                    value={draftFilters.category}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>{t.filters.typeLabel}</legend>
                  <div className="type-tabs" role="group">
                    {([
                      ["all", t.filters.allTypes],
                      ["lost", t.filters.lost],
                      ["found", t.filters.found],
                    ] as const).map(([value, label]) => (
                      <button
                        aria-pressed={draftFilters.type === value}
                        className={`type-tab ${draftFilters.type === value ? "selected" : ""}`}
                        key={value}
                        onClick={() => {
                          setDraftFilters((current) => ({ ...current, type: value }));
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>{t.filters.dateLabel}</legend>
                  <div className="date-filters" role="group">
                    {([
                      ["today", t.filters.today],
                      ["week", t.filters.week],
                      ["all", t.filters.allTime],
                    ] as const).map(([value, label]) => (
                      <button
                        aria-pressed={draftFilters.time === value}
                        className={`date-filter ${draftFilters.time === value ? "selected" : ""}`}
                        key={value}
                        onClick={() => {
                          setDraftFilters((current) => ({ ...current, time: value }));
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="status-filter">
                  <span>{t.filters.statusLabel}</span>
                  <select
                    onChange={(event) => {
                      const status = event.target.value;
                      if (isStatusFilter(status)) {
                        setDraftFilters((current) => ({
                          ...current,
                          status,
                        }));
                      }
                    }}
                    value={draftFilters.status}
                  >
                    <option value="all">{t.filters.anyStatus}</option>
                    {([
                      ["searching", t.filters.searching],
                      ["found", t.filters.foundStatus],
                      ["returned", t.filters.returned],
                    ] as const).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="location-filter">
                  <legend>{t.filters.locationLabel}</legend>
                  <MapLocationPicker
                    compact
                    language={language}
                    onChange={(location) => {
                      setDraftFilters((current) => ({ ...current, location }));
                    }}
                    value={draftFilters.location}
                  />
                  <label className="status-filter location-radius">
                    <span>{t.filters.radiusLabel}</span>
                    <select
                      onChange={(event) => {
                        setDraftFilters((current) => ({
                          ...current,
                          radiusKm: Number(event.target.value),
                        }));
                      }}
                      value={draftFilters.radiusKm}
                    >
                      {[1, 3, 5, 10, 25, 50].map((radius) => (
                        <option key={radius} value={radius}>
                          {radius} {t.filters.nearbyUnit}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              </div>
              <footer className="filter-dialog-footer">
                <button
                  className="reset-button"
                  onClick={resetDraftFilters}
                  type="button"
                >
                  {t.filters.reset}
                </button>
                <button
                  className="filter-dialog-done"
                  onClick={applyDraftFilters}
                  type="button"
                >
                  {t.filters.close}
                </button>
              </footer>
            </section>
          </div>
        )}

        <div className="results-row" aria-live="polite">
          <span>
            {t.filters.resultsFound} <strong>{filteredItems.length}</strong>{" "}
            {filteredItems.length === 1 ? t.filters.resultSingular : t.filters.resultPlural}
          </span>
          {(query ||
            filters.category !== "all" ||
            filters.type !== "all" ||
            filters.time !== "all" ||
            filters.status !== "all" ||
            (filters.location.latitude !== null &&
              filters.location.longitude !== null)) && (
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
            {visibleItems.map((item) => {
              const localizedItem = localizeDemoItem(item, language);

              return (
                <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={item.id}>
                  <ListingCard
                    item={item}
                    title={localizedItem.title}
                    place={localizedItem.place}
                    details={localizedItem.details}
                    category={localizedItem.categoryKey ? t.categories[localizedItem.categoryKey] : item.category}
                    dateLabel={formatItemDate(item.daysAgo, item.time, language)}
                    labels={t.card}
                    isFavorite={favoriteIds.includes(item.id)}
                    favoritesReady={favoritesReady}
                    onToggleFavorite={toggleFavorite}
                  />
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

        {pageCount > 1 && (
          <nav className="feed-pagination" aria-label={t.pagination.label}>
            <button
              aria-label={t.pagination.previous}
              className="pagination-direction"
              disabled={activePage === 1}
              onClick={() => goToPage(activePage - 1)}
              type="button"
            >
              {t.pagination.previous}
            </button>
            {pageEntries.map((entry) =>
              typeof entry === "number" ? (
                <button
                  aria-current={activePage === entry ? "page" : undefined}
                  aria-label={`${entry}`}
                  className={`pagination-page ${activePage === entry ? "active" : ""}`}
                  key={entry}
                  onClick={() => goToPage(entry)}
                  type="button"
                >
                  {entry}
                </button>
              ) : (
                <span aria-hidden="true" className="pagination-ellipsis" key={entry}>
                  …
                </span>
              ),
            )}
            <button
              aria-label={t.pagination.next}
              className="pagination-direction"
              disabled={activePage === pageCount}
              onClick={() => goToPage(activePage + 1)}
              type="button"
            >
              {t.pagination.next}
            </button>
          </nav>
        )}

      </section>

      <SiteFooter />
    </main>
);
}