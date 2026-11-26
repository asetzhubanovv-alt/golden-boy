import type { Language } from "@/lib/messages";
import { categoryTranslationKey } from "@/lib/messages";
import type { Item } from "@/lib/items";

type LocalizedText = Record<Language, string>;

type LocalizedDemoItem = {
  id: string;
  title: LocalizedText;
  categoryKey: string;
  place: LocalizedText;
  details: LocalizedText;
};

const localizedDemoItems: LocalizedDemoItem[] = [
  {
    id: "blue-headphones",
    title: { ru: "Наушники Sony", kk: "Sony құлаққаптары", en: "Sony headphones" },
    categoryKey: "electronics",
    place: { ru: "Библиотека, 2 этаж", kk: "Кітапхана, 2-қабат", en: "Library, 2nd floor" },
    details: {
      ru: "Синие беспроводные наушники в чехле. Последний раз видел(а) в читальном зале.",
      kk: "Көк түсті сымсыз құлаққап қаптамасында. Соңғы рет оқу залында көрдім.",
      en: "Blue wireless headphones in a case. Last seen in the reading room.",
    },
  },
  {
    id: "student-card",
    title: { ru: "Студенческий билет", kk: "Студенттік куәлік", en: "Student ID" },
    categoryKey: "documents",
    place: { ru: "Главный корпус, холл", kk: "Бас корпус, кіреберіс", en: "Main building, lobby" },
    details: {
      ru: "Нашёл(ла) студенческий билет у входа в главный корпус. Передал(а) на стойку охраны.",
      kk: "Бас корпустың кіреберісінен студенттік куәлікті таптым. Күзет орнына тапсырдым.",
      en: "Found a student ID by the main entrance. I left it at the security desk.",
    },
  },
  {
    id: "keychain",
    title: { ru: "Связка ключей с брелоком", kk: "Салпыншақты кілттер", en: "Key ring with charm" },
    categoryKey: "keys",
    place: { ru: "Корпус Б, аудитория 204", kk: "Б корпусы, 204-аудитория", en: "Building B, room 204" },
    details: {
      ru: "Три ключа на кольце и небольшой зелёный брелок. Оставил(а) у охраны корпуса.",
      kk: "Сақинаға үш кілт және кішкентай жасыл салпыншақ тағылған. Корпус күзетіне қалдырдым.",
      en: "Three keys on a ring and a small green charm. Left with the building security.",
    },
  },
  {
    id: "black-backpack",
    title: { ru: "Чёрный рюкзак", kk: "Қара арқа сөмке", en: "Black backpack" },
    categoryKey: "bags",
    place: { ru: "Спортивный зал", kk: "Спорт залы", en: "Gym" },
    details: {
      ru: "Небольшой чёрный рюкзак с нашивкой. Внутри были конспекты и зарядка.",
      kk: "Жапсырмасы бар шағын қара арқа сөмке. Ішінде дәріс жазбалары мен қуаттағыш бар.",
      en: "A small black backpack with a patch. It had notes and a charger inside.",
    },
  },
  {
    id: "chemistry-notes",
    title: { ru: "Тетрадь по химии", kk: "Химия дәптері", en: "Chemistry notebook" },
    categoryKey: "books",
    place: { ru: "Кафетерий", kk: "Асхана", en: "Cafeteria" },
    details: {
      ru: "Клетчатая тетрадь с записями по органической химии. Уже ждёт владельца у администратора.",
      kk: "Тор көз дәптерде органикалық химия жазбалары бар. Дәптер әкімшіде, иесін күтуде.",
      en: "A graph notebook with organic chemistry notes. It is waiting with the administrator.",
    },
  },
  {
    id: "silver-ring",
    title: { ru: "Серебряное кольцо", kk: "Күміс сақина", en: "Silver ring" },
    categoryKey: "other",
    place: { ru: "Корпус А, аудитория 108", kk: "А корпусы, 108-аудитория", en: "Building A, room 108" },
    details: {
      ru: "Небольшое серебристое кольцо найдено после пары. Напишите, если это ваша вещь.",
      kk: "Шағын күміс түсті сақина сабақтан кейін табылды. Сіздікі болса, жазыңыз.",
      en: "A small silver ring was found after class. Write if it’s yours.",
    },
  },
];

export function localizeDemoItem(item: Item, language: Language) {
  const demoItem = localizedDemoItems.find((entry) => entry.id === item.id);

  return {
    title: demoItem?.title[language] ?? item.title,
    place: demoItem?.place[language] ?? item.place,
    details: demoItem?.details[language] ?? item.details,
    categoryKey:
      demoItem?.categoryKey ??
      categoryTranslationKey(item.category)?.replace("category.", ""),
  };
}
