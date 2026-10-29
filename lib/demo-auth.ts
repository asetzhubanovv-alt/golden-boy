export type DemoUser = {
  id: string;
  name: string;
  email: string;
};

type StoredDemoUser = DemoUser & {
  passwordHash: string;
  passwordSalt: string;
};

const USERS_KEY = "foundly-demo-users-v1";
const SESSION_KEY = "foundly-demo-session-v1";
const SERVER_SNAPSHOT = "\u0000server-auth-snapshot";
const STORAGE_ERROR_PREFIX = "\u0000auth-storage-error:";

function isStoredDemoUser(value: unknown): value is StoredDemoUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    typeof user.passwordHash === "string" &&
    typeof user.passwordSalt === "string"
  );
}

function isDemoUser(value: unknown): value is DemoUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string"
  );
}

function readUsers(): StoredDemoUser[] {
  const stored = window.localStorage.getItem(USERS_KEY);
  if (!stored) return [];

  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    throw new Error("Список демо-аккаунтов повреждён.");
  }

  if (!Array.isArray(value) || !value.every(isStoredDemoUser)) {
    throw new Error("Не удалось прочитать список демо-аккаунтов.");
  }
  return value;
}

function readSession(): DemoUser | null {
  const stored = window.localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    throw new Error("Сохранённая демо-сессия повреждена. Войди снова.");
  }

  if (!isDemoUser(value)) {
    throw new Error("Не удалось прочитать демо-сессию. Войди снова.");
  }
  return value;
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event("foundly-auth-updated"));
}

async function hashPassword(password: string, salt: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Этот браузер не поддерживает локальную проверку пароля. Открой сайт через localhost или HTTPS.",
    );
  }

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 150_000 },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(derivedBits))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(value: string): ArrayBuffer {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new Error("Сохранённые данные аккаунта повреждены.");
  }
  return new Uint8Array(
    value.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
  ).buffer;
}

export async function registerDemoUser(
  name: string,
  email: string,
  password: string,
): Promise<DemoUser> {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLocaleLowerCase("en-US");
  if (normalizedName.length < 2 || normalizedName.length > 60) {
    throw new Error("Имя должно содержать от 2 до 60 символов.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Укажи корректный адрес электронной почты.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error("Пароль должен содержать от 8 до 128 символов.");
  }

  const users = readUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Аккаунт с этой почтой уже существует. Войди в него.");
  }

  const passwordSalt = new Uint8Array(new ArrayBuffer(16));
  globalThis.crypto.getRandomValues(passwordSalt);
  const user: StoredDemoUser = {
    id: crypto.randomUUID(),
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: await hashPassword(password, passwordSalt.buffer),
    passwordSalt: bytesToHex(passwordSalt),
  };
  const publicUser: DemoUser = {
    id: user.id,
    name: user.name,
    email: user.email,
  };

  window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser));
  notifyAuthChanged();
  return publicUser;
}

export async function loginDemoUser(
  email: string,
  password: string,
): Promise<DemoUser> {
  const normalizedEmail = email.trim().toLocaleLowerCase("en-US");
  const user = readUsers().find((entry) => entry.email === normalizedEmail);
  if (
    !user ||
    user.passwordHash !==
      (await hashPassword(password, hexToBytes(user.passwordSalt)))
  ) {
    throw new Error("Неверная почта или пароль.");
  }

  const publicUser: DemoUser = {
    id: user.id,
    name: user.name,
    email: user.email,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser));
  notifyAuthChanged();
  return publicUser;
}

export function logoutDemoUser(): void {
  window.localStorage.removeItem(SESSION_KEY);
  notifyAuthChanged();
}

export function getCurrentDemoUser(): DemoUser | null {
  return readSession();
}

export function getDemoSessionSnapshot(): string {
  try {
    return window.localStorage.getItem(SESSION_KEY) ?? "null";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Хранилище браузера недоступно.";
    return `${STORAGE_ERROR_PREFIX}${message}`;
  }
}

export function parseDemoSessionSnapshot(snapshot: string): DemoUser | null {
  if (snapshot.startsWith(STORAGE_ERROR_PREFIX)) {
    throw new Error(snapshot.slice(STORAGE_ERROR_PREFIX.length));
  }
  if (snapshot === SERVER_SNAPSHOT || snapshot === "null") return null;

  let value: unknown;
  try {
    value = JSON.parse(snapshot);
  } catch {
    throw new Error("Сохранённая демо-сессия повреждена. Войди снова.");
  }

  if (!isDemoUser(value)) {
    throw new Error("Не удалось прочитать демо-сессию. Войди снова.");
  }
  return value;
}

export function getServerAuthSnapshot(): string {
  return SERVER_SNAPSHOT;
}

export function subscribeToDemoAuth(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener("foundly-auth-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("foundly-auth-updated", callback);
  };
}
