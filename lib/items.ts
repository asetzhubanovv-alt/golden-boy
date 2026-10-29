export const ITEM_STORAGE_KEY = "foundly.items";

export const ITEM_CATEGORIES = [
  "Документы и карты",
  "Ключи",
  "Электроника",
  "Одежда",
  "Сумки и рюкзаки",
  "Книги и тетради",
  "Другое",
] as const;

export type ItemType = "lost" | "found";
export type ItemStatus = "searching" | "found" | "returned";

export type Item = {
  id: string;
  type: ItemType;
  title: string;
  category: (typeof ITEM_CATEGORIES)[number];
  description: string;
  place: string;
  date: string;
  imageDataUrl?: string;
  telegram: string;
  status: ItemStatus;
  createdAt: string;
};

function isItem(value: unknown): value is Item {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    (item.type === "lost" || item.type === "found") &&
    typeof item.title === "string" &&
    ITEM_CATEGORIES.includes(item.category as (typeof ITEM_CATEGORIES)[number]) &&
    typeof item.description === "string" &&
    typeof item.place === "string" &&
    typeof item.date === "string" &&
    (item.imageDataUrl === undefined || typeof item.imageDataUrl === "string") &&
    typeof item.telegram === "string" &&
    (item.status === "searching" ||
      item.status === "found" ||
      item.status === "returned") &&
    typeof item.createdAt === "string"
  );
}

export function getItems(): Item[] {
  if (typeof window === "undefined") {
    throw new Error("Локальное хранилище доступно только в браузере.");
  }

  let storedItems: string | null;
  try {
    storedItems = window.localStorage.getItem(ITEM_STORAGE_KEY);
  } catch {
    throw new Error(
      "Не удалось прочитать объявления. Проверьте, разрешено ли хранилище браузера.",
    );
  }

  if (storedItems === null) {
    return [];
  }

  let parsedItems: unknown;
  try {
    parsedItems = JSON.parse(storedItems);
  } catch {
    throw new Error(
      "Сохранённые объявления повреждены. Очистите данные Foundly в хранилище браузера.",
    );
  }

  if (!Array.isArray(parsedItems) || !parsedItems.every(isItem)) {
    throw new Error(
      "Формат сохранённых объявлений не распознан. Очистите данные Foundly в хранилище браузера.",
    );
  }

  return [...parsedItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveItem(item: Item): void {
  const items = getItems();
  const updatedItems = [item, ...items.filter((savedItem) => savedItem.id !== item.id)];

  try {
    window.localStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(updatedItems));
  } catch {
    throw new Error(
      "Не удалось сохранить объявление. Возможно, в браузере закончилось место или запись запрещена.",
    );
  }
}

export function formatItemDate(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}
