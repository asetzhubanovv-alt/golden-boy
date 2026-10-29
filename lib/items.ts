export type ItemType = "lost" | "found";
export type ItemStatus = "searching" | "found" | "returned";

export type Item = {
  id: string;
  title: string;
  category: string;
  type: ItemType;
  place: string;
  date?: string;
  daysAgo: number;
  time: string;
  status: ItemStatus;
  art: string;
  symbol: string;
  details: string;
  telegram?: string;
  imageDataUrl?: string;
};

export type ItemReport = {
  id: string;
  itemId: string;
  reason: string;
  createdAt: string;
};

export const ITEM_CATEGORIES = [
  "Электроника",
  "Документы",
  "Ключи",
  "Одежда",
  "Сумки",
  "Книги",
  "Другое",
] as const;

export const DEMO_ITEMS: Item[] = [
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
    details:
      "Синие беспроводные наушники в чехле. Последний раз видел(а) в читальном зале.",
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
    details:
      "Нашёл(ла) студенческий билет у входа в главный корпус. Передал(а) на стойку охраны.",
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
    details:
      "Три ключа на кольце и небольшой зелёный брелок. Оставил(а) у охраны корпуса.",
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
    details:
      "Небольшой чёрный рюкзак с нашивкой. Внутри были конспекты и зарядка.",
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
    details:
      "Клетчатая тетрадь с записями по органической химии. Уже ждёт владельца у администратора.",
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
    details:
      "Небольшое серебристое кольцо найдено после пары. Напишите, если это ваша вещь.",
  },
];

export const ITEMS_STORAGE_KEY = "foundly-items-v1";
const REPORTS_STORAGE_KEY = "foundly-reports-v1";
const STORAGE_ERROR_PREFIX = "\u0000storage-error:";
export const SERVER_ITEMS_SNAPSHOT = "\u0000server-snapshot";

export function getItemsSnapshot(): string {
  try {
    return window.localStorage.getItem(ITEMS_STORAGE_KEY) ?? "[]";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Хранилище недоступно.";
    return `${STORAGE_ERROR_PREFIX}${message}`;
  }
}

export function parseItemsSnapshot(snapshot: string): Item[] {
  if (snapshot.startsWith(STORAGE_ERROR_PREFIX)) {
    throw new Error(snapshot.slice(STORAGE_ERROR_PREFIX.length));
  }
  if (snapshot === SERVER_ITEMS_SNAPSHOT) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error(
      "Сохранённые данные повреждены. Очисти данные сайта и попробуй снова.",
    );
  }

  if (!Array.isArray(parsed) || !parsed.every(isItem)) {
    throw new Error("Формат сохранённых данных не распознан.");
  }
  return parsed;
}

export function subscribeToItems(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener("foundly-items-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("foundly-items-updated", callback);
  };
}

function notifyItemsChanged() {
  window.dispatchEvent(new Event("foundly-items-updated"));
}

function isItem(value: unknown): value is Item {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.category === "string" &&
    (item.type === "lost" || item.type === "found") &&
    typeof item.place === "string" &&
    typeof item.daysAgo === "number" &&
    typeof item.time === "string" &&
    (item.status === "searching" ||
      item.status === "found" ||
      item.status === "returned") &&
    typeof item.art === "string" &&
    typeof item.symbol === "string" &&
    typeof item.details === "string" &&
    (item.date === undefined || typeof item.date === "string") &&
    (item.telegram === undefined || typeof item.telegram === "string") &&
    (item.imageDataUrl === undefined || typeof item.imageDataUrl === "string")
  );
}

function readArray<T>(
  key: string,
  validate: (value: unknown) => value is T,
): T[] {
  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    throw new Error("Сохранённые данные повреждены. Очисти данные сайта и попробуй снова.");
  }

  if (!Array.isArray(parsed) || !parsed.every(validate)) {
    throw new Error("Формат сохранённых данных не распознан.");
  }

  return parsed;
}

function isReport(value: unknown): value is ItemReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;

  return (
    typeof report.id === "string" &&
    typeof report.itemId === "string" &&
    typeof report.reason === "string" &&
    typeof report.createdAt === "string"
  );
}

export function getStoredItems(): Item[] {
  return readArray(ITEMS_STORAGE_KEY, isItem);
}

export function getAllItems(storedItems: Item[] = []): Item[] {
  return [...storedItems, ...DEMO_ITEMS];
}

export function saveItem(item: Item): void {
  const storedItems = getStoredItems();
  window.localStorage.setItem(
    ITEMS_STORAGE_KEY,
    JSON.stringify([item, ...storedItems]),
  );
  notifyItemsChanged();
}

export function updateStoredItem(id: string, updates: Partial<Item>): Item {
  const storedItems = getStoredItems();
  const itemIndex = storedItems.findIndex((item) => item.id === id);
  if (itemIndex === -1) {
    throw new Error("Изменять можно только объявление, созданное в этой демо-версии.");
  }

  const updatedItem = { ...storedItems[itemIndex], ...updates };
  storedItems[itemIndex] = updatedItem;
  window.localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(storedItems));
  notifyItemsChanged();
  return updatedItem;
}

export function deleteStoredItem(id: string): void {
  const storedItems = getStoredItems();
  if (!storedItems.some((item) => item.id === id)) {
    throw new Error("Удалять можно только объявление, созданное в этой демо-версии.");
  }

  window.localStorage.setItem(
    ITEMS_STORAGE_KEY,
    JSON.stringify(storedItems.filter((item) => item.id !== id)),
  );
  notifyItemsChanged();
}

export function saveItemReport(itemId: string, reason: string): void {
  const reports = readArray(REPORTS_STORAGE_KEY, isReport);
  reports.push({
    id: crypto.randomUUID(),
    itemId,
    reason,
    createdAt: new Date().toISOString(),
  });
  window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
}

export function getItemArt(category: string): { art: string; symbol: string } {
  switch (category) {
    case "Электроника":
      return { art: "art-blue", symbol: "♫" };
    case "Документы":
      return { art: "art-peach", symbol: "ID" };
    case "Ключи":
      return { art: "art-green", symbol: "✳" };
    case "Одежда":
      return { art: "art-lilac", symbol: "◈" };
    case "Сумки":
      return { art: "art-lilac", symbol: "▣" };
    case "Книги":
      return { art: "art-yellow", symbol: "✎" };
    default:
      return { art: "art-rose", symbol: "○" };
  }
}

export function formatItemDate(daysAgo: number, time: string): string {
  if (daysAgo === 0) return `Сегодня, ${time}`;
  if (daysAgo === 1) return `Вчера, ${time}`;
  return `${daysAgo} ${daysAgo < 5 ? "дня" : "дней"} назад, ${time}`;
}

export function getDaysAgo(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const selected = Date.UTC(year, month - 1, day);
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(0, Math.floor((todayUtc - selected) / 86_400_000));
}

export function isStoredItem(id: string, storedItems: Item[]): boolean {
  return storedItems.some((item) => item.id === id);
}
