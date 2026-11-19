"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSimilarFoundItems } from "@/lib/item-matching";
import { getStoredItems, type Item } from "@/lib/items";
import { getSupabaseClient } from "@/lib/supabase";
import { useDemoAuth } from "@/lib/use-demo-auth";

type ItemMatchNotification = {
  kind: "match";
  id: string;
  lostItemId: string;
  lostTitle: string;
  foundItemId: string;
  foundTitle: string;
  foundPlace: string;
  createdAt: string;
  read: boolean;
};

type OwnershipClaimNotification = {
  kind: "ownership_claim";
  id: string;
  itemId: string;
  itemTitle: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type ItemSightingNotification = {
  kind: "sighting";
  id: string;
  sightingId: string;
  itemId: string;
  itemTitle: string;
  senderId: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  comment: string;
  createdAt: string;
  read: boolean;
};

export type ItemNotification =
  | ItemMatchNotification
  | OwnershipClaimNotification
  | ItemSightingNotification;

export type ItemSubscription = {
  itemId: string;
  title: string;
  createdAt: string;
};

const NOTIFICATIONS_EVENT = "foundly-notifications-updated";
const PERMISSION_EVENT = "foundly-notification-permission-changed";
export const OPEN_NOTIFICATIONS_EVENT = "foundly-open-notifications";
const STORAGE_ERROR = "__foundly_notifications_storage_error__";

function storageKey(userId: string) {
  return `foundly-item-notifications-v1:${userId}`;
}

function subscriptionsStorageKey(userId: string) {
  return `foundly-item-subscriptions-v1:${userId}`;
}

function subscribeToNotifications(callback: () => void) {
  window.addEventListener(NOTIFICATIONS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(NOTIFICATIONS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getNotificationSnapshot(userId: string | null) {
  if (!userId) return "[]";
  try {
    return window.localStorage.getItem(storageKey(userId)) ?? "[]";
  } catch {
    return STORAGE_ERROR;
  }
}

function getSubscriptionSnapshot(userId: string | null) {
  if (!userId) return "[]";
  try {
    return window.localStorage.getItem(subscriptionsStorageKey(userId)) ?? "[]";
  } catch {
    return STORAGE_ERROR;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOwnershipClaimNotification(value: unknown): value is OwnershipClaimNotification {
  return isRecord(value) &&
    value.kind === "ownership_claim" &&
    typeof value.id === "string" &&
    typeof value.itemId === "string" &&
    typeof value.itemTitle === "string" &&
    typeof value.message === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.read === "boolean";
}

function isItemSightingNotification(value: unknown): value is ItemSightingNotification {
  return isRecord(value) &&
    value.kind === "sighting" &&
    typeof value.id === "string" &&
    typeof value.sightingId === "string" &&
    typeof value.itemId === "string" &&
    typeof value.itemTitle === "string" &&
    typeof value.senderId === "string" &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    typeof value.observedAt === "string" &&
    typeof value.comment === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.read === "boolean";
}

function isLegacyOrMatchNotification(
  value: unknown,
): value is Omit<ItemMatchNotification, "kind"> | ItemMatchNotification {
  return isRecord(value) &&
    (value.kind === undefined || value.kind === "match") &&
    typeof value.id === "string" &&
    typeof value.lostItemId === "string" &&
    typeof value.lostTitle === "string" &&
    typeof value.foundItemId === "string" &&
    typeof value.foundTitle === "string" &&
    typeof value.foundPlace === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.read === "boolean";
}

function parseNotifications(snapshot: string): { notifications: ItemNotification[]; error: string } {
  if (snapshot === STORAGE_ERROR) {
    return { notifications: [], error: "Браузер не разрешил доступ к уведомлениям." };
  }
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!Array.isArray(parsed)) throw new Error();
    const notifications = parsed.map((value): ItemNotification => {
      if (isOwnershipClaimNotification(value)) return value;
      if (isItemSightingNotification(value)) return value;
      if (isLegacyOrMatchNotification(value)) return { ...value, kind: "match" };
      throw new Error();
    });
    return { notifications, error: "" };
  } catch {
    return {
      notifications: [],
      error: "Сохранённые уведомления повреждены. Очистите данные сайта и войдите снова.",
    };
  }
}

function writeNotifications(userId: string, notifications: ItemNotification[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(notifications));
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
}

function parseSubscriptions(snapshot: string): { subscriptions: ItemSubscription[]; error: string } {
  if (snapshot === STORAGE_ERROR) {
    return { subscriptions: [], error: "Браузер не разрешил доступ к подпискам." };
  }
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!Array.isArray(parsed)) throw new Error();
    const subscriptions = parsed.filter((value): value is ItemSubscription =>
      typeof value === "object" &&
      value !== null &&
      "itemId" in value &&
      typeof value.itemId === "string" &&
      "title" in value &&
      typeof value.title === "string" &&
      "createdAt" in value &&
      typeof value.createdAt === "string",
    );
    if (subscriptions.length !== parsed.length) throw new Error();
    return { subscriptions, error: "" };
  } catch {
    return {
      subscriptions: [],
      error: "Сохранённые подписки повреждены. Очистите данные сайта и войдите снова.",
    };
  }
}

function writeSubscriptions(userId: string, subscriptions: ItemSubscription[]) {
  window.localStorage.setItem(subscriptionsStorageKey(userId), JSON.stringify(subscriptions));
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
}

function subscribeToPermission(callback: () => void) {
  window.addEventListener("focus", callback);
  window.addEventListener(PERMISSION_EVENT, callback);
  return () => {
    window.removeEventListener("focus", callback);
    window.removeEventListener(PERMISSION_EVENT, callback);
  };
}

function getPermissionSnapshot(): NotificationPermission | "unsupported" {
  return "Notification" in window ? window.Notification.permission : "unsupported";
}

type ItemNotificationsState = {
  notifications: ItemNotification[];
  subscriptions: ItemSubscription[];
  unreadCount: number;
  permission: NotificationPermission | "unsupported";
  isConnected: boolean;
  error: string;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  isSubscribed: (itemId: string) => boolean;
  subscribeToItem: (item: Pick<Item, "id" | "title">) => boolean;
  unsubscribeFromItem: (itemId: string) => boolean;
  enableBrowserNotifications: () => Promise<void>;
};

const ItemNotificationsContext = createContext<ItemNotificationsState | null>(null);

function useItemNotificationsClient(userId: string | null): ItemNotificationsState {
  const router = useRouter();
  const [syncError, setSyncError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribeToNotifications,
    () => getNotificationSnapshot(userId),
    () => "[]",
  );
  const subscriptionsSnapshot = useSyncExternalStore(
    subscribeToNotifications,
    () => getSubscriptionSnapshot(userId),
    () => "[]",
  );
  const permission = useSyncExternalStore<NotificationPermission | "unsupported">(
    subscribeToPermission,
    getPermissionSnapshot,
    () => "default",
  );
  const parsed = useMemo(() => parseNotifications(snapshot), [snapshot]);
  const parsedSubscriptions = useMemo(
    () => parseSubscriptions(subscriptionsSnapshot),
    [subscriptionsSnapshot],
  );

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;

    let active = true;
    let connected = false;
    let lostItems: Item[] = [];
    const queuedFoundIds = new Set<string>();

    function addMatches(foundItem: Item, showBrowserNotification: boolean) {
      if (!active || foundItem.type !== "found" || foundItem.status === "returned") return;
      const current = parseNotifications(getNotificationSnapshot(activeUserId));
      const currentSubscriptions = parseSubscriptions(getSubscriptionSnapshot(activeUserId));
      if (current.error) {
        setSyncError(current.error);
        return;
      }
      if (currentSubscriptions.error) {
        setSyncError(currentSubscriptions.error);
        return;
      }

      const additions = lostItems
        .filter((lostItem) =>
          currentSubscriptions.subscriptions.some((subscription) =>
            subscription.itemId === lostItem.id &&
            foundItem.createdAt !== undefined &&
            new Date(foundItem.createdAt).getTime() >= new Date(subscription.createdAt).getTime(),
          ) && lostItem.status !== "returned",
        )
        .filter((lostItem) => getSimilarFoundItems(lostItem, [foundItem]).length > 0)
        .filter((lostItem) => !current.notifications.some(
          (notification) => notification.kind === "match" &&
            notification.lostItemId === lostItem.id &&
            notification.foundItemId === foundItem.id,
        ))
        .map((lostItem): ItemMatchNotification => ({
          kind: "match",
          id: `${lostItem.id}:${foundItem.id}`,
          lostItemId: lostItem.id,
          lostTitle: lostItem.title,
          foundItemId: foundItem.id,
          foundTitle: foundItem.title,
          foundPlace: foundItem.place,
          createdAt: new Date().toISOString(),
          read: false,
        }));

      if (!additions.length) return;
      writeNotifications(
        activeUserId,
        [...additions, ...current.notifications].slice(0, 100),
      );
      setSyncError("");

      if (showBrowserNotification && permission === "granted" && "Notification" in window) {
        for (const notification of additions) {
          const browserNotification = new window.Notification(
            `Похожа находка: ${notification.foundTitle}`,
            {
              body: `Ваша вещь «${notification.lostTitle}» может быть здесь: ${notification.foundPlace}`,
              icon: "/favicon.ico",
              tag: notification.id,
            },
          );
          browserNotification.onclick = () => {
            window.focus();
            router.push(`/item/${encodeURIComponent(notification.foundItemId)}`);
            browserNotification.close();
          };
        }
      }
    }

    const queuedClaimIds = new Set<string>();

    function addOwnershipClaimNotification(
      claim: { id: string; itemId: string; message: string; createdAt: string },
      items: Item[],
      showBrowserNotification: boolean,
    ) {
      if (!active) return;
      const item = items.find(
        (storedItem) => storedItem.id === claim.itemId && storedItem.ownerId === activeUserId,
      );
      if (!item) return;

      const current = parseNotifications(getNotificationSnapshot(activeUserId));
      if (current.error) {
        setSyncError(current.error);
        return;
      }
      const notificationId = `ownership:${claim.id}`;
      if (current.notifications.some((notification) => notification.id === notificationId)) return;

      const notification: OwnershipClaimNotification = {
        kind: "ownership_claim",
        id: notificationId,
        itemId: claim.itemId,
        itemTitle: item.title,
        message: claim.message,
        createdAt: claim.createdAt,
        read: false,
      };
      try {
        writeNotifications(activeUserId, [notification, ...current.notifications].slice(0, 100));
        setSyncError("");
      } catch (writeError) {
        setSyncError(
          writeError instanceof Error ? writeError.message : "Не удалось сохранить уведомление.",
        );
        return;
      }

      if (showBrowserNotification && permission === "granted" && "Notification" in window) {
        const browserNotification = new window.Notification(
          "Новый запрос на подтверждение владельца",
          {
            body: `${item.title}: ${claim.message.slice(0, 180)}`,
            icon: "/favicon.ico",
            tag: notification.id,
          },
        );
        browserNotification.onclick = () => {
          window.focus();
          router.push(`/item/${encodeURIComponent(claim.itemId)}`);
          browserNotification.close();
        };
      }
    }

    function addSightingNotification(
      sighting: {
        id: string;
        itemId: string;
        userId: string;
        latitude: number;
        longitude: number;
        observedAt: string;
        comment: string;
        createdAt: string;
      },
      items: Item[],
      showBrowserNotification: boolean,
    ) {
      if (!active || sighting.userId === activeUserId) return;
      const item = items.find(
        (storedItem) =>
          storedItem.id === sighting.itemId &&
          storedItem.type === "lost" &&
          storedItem.ownerId === activeUserId,
      );
      if (!item) return;

      const current = parseNotifications(getNotificationSnapshot(activeUserId));
      if (current.error) {
        setSyncError(current.error);
        return;
      }
      const notificationId = `sighting:${sighting.id}`;
      if (current.notifications.some((notification) => notification.id === notificationId)) return;

      const notification: ItemSightingNotification = {
        kind: "sighting",
        id: notificationId,
        sightingId: sighting.id,
        itemId: sighting.itemId,
        itemTitle: item.title,
        senderId: sighting.userId,
        latitude: sighting.latitude,
        longitude: sighting.longitude,
        observedAt: sighting.observedAt,
        comment: sighting.comment,
        createdAt: sighting.createdAt,
        read: false,
      };
      try {
        writeNotifications(activeUserId, [notification, ...current.notifications].slice(0, 100));
        setSyncError("");
      } catch (writeError) {
        setSyncError(
          writeError instanceof Error
            ? writeError.message
            : "Не удалось сохранить уведомление о наблюдении.",
        );
        return;
      }

      if (showBrowserNotification && permission === "granted" && "Notification" in window) {
        const browserNotification = new window.Notification(
          `Новое наблюдение: ${item.title}`,
          {
            body: sighting.comment || `Отметка на карте · ${sighting.observedAt}`,
            icon: "/favicon.ico",
            tag: notification.id,
          },
        );
        browserNotification.onclick = () => {
          window.focus();
          router.push(
            `/item/${encodeURIComponent(sighting.itemId)}?sighting=${encodeURIComponent(sighting.id)}#item-sightings`,
          );
          browserNotification.close();
        };
      }
    }

    const queuedSightingIds = new Set<string>();

    function onItemSightingInsert(payload: { new: Record<string, unknown> }) {
      const {
        id,
        item_id: itemId,
        user_id: senderId,
        latitude,
        longitude,
        observed_at: observedAt,
        comment,
        created_at: createdAt,
      } = payload.new;
      const parsedLatitude = typeof latitude === "number" ? latitude : Number(latitude);
      const parsedLongitude = typeof longitude === "number" ? longitude : Number(longitude);
      if (
        typeof id !== "string" ||
        typeof itemId !== "string" ||
        typeof senderId !== "string" ||
        senderId === activeUserId ||
        !Number.isFinite(parsedLatitude) ||
        !Number.isFinite(parsedLongitude) ||
        typeof observedAt !== "string" ||
        typeof comment !== "string" ||
        typeof createdAt !== "string" ||
        queuedSightingIds.has(id)
      ) {
        return;
      }

      queuedSightingIds.add(id);
      void getStoredItems()
        .then((items) => {
          addSightingNotification(
            {
              id,
              itemId,
              userId: senderId,
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              observedAt,
              comment,
              createdAt,
            },
            items,
            true,
          );
        })
        .catch((loadError: unknown) => {
          if (active) {
            queuedSightingIds.delete(id);
            setSyncError(
              loadError instanceof Error
                ? loadError.message
                : "Не удалось обработать новое наблюдение.",
            );
          }
        });
    }

    function onOwnershipClaimInsert(payload: { new: Record<string, unknown> }) {
      const { id, item_id: itemId, user_id: claimantId, message, created_at: createdAt } = payload.new;
      if (
        typeof id !== "string" ||
        typeof itemId !== "string" ||
        typeof claimantId !== "string" ||
        claimantId === activeUserId ||
        typeof message !== "string" ||
        typeof createdAt !== "string" ||
        payload.new.status !== "pending" ||
        queuedClaimIds.has(id)
      ) {
        return;
      }

      queuedClaimIds.add(id);
      void getStoredItems()
        .then((items) => {
          addOwnershipClaimNotification(
            { id, itemId, message, createdAt },
            items,
            true,
          );
        })
        .catch((loadError: unknown) => {
          if (active) {
            queuedClaimIds.delete(id);
            setSyncError(
              loadError instanceof Error
                ? loadError.message
                : "Не удалось обработать запрос подтверждения владельца.",
            );
          }
        });
    }

    function onItemInsert(payload: { new: Record<string, unknown> }) {
      if (payload.new.type !== "found" && payload.new.user_id !== activeUserId) return;
      const id = payload.new.id;
      if (typeof id !== "string") return;
      if (payload.new.type === "found") {
        if (queuedFoundIds.has(id)) return;
        queuedFoundIds.add(id);
      }
      void getStoredItems()
        .then((items) => {
          if (!active) return;
          lostItems = items.filter(
              (item) => item.type === "lost" && item.status !== "returned",
          );
          if (payload.new.type !== "found") {
            for (const foundItem of items.filter(
              (item) => item.type === "found" && item.status !== "returned",
            )) {
              addMatches(foundItem, false);
            }
            return;
          }
          const foundItem = items.find((item) => item.id === id);
          if (foundItem) addMatches(foundItem, true);
        })
        .catch((loadError: unknown) => {
          if (active) {
            if (payload.new.type === "found") queuedFoundIds.delete(id);
            setSyncError(loadError instanceof Error ? loadError.message : "Не удалось проверить новые находки.");
          }
        });
    }

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`foundly-item-notifications-${activeUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "items" },
        onItemInsert,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ownership_claims" },
        onOwnershipClaimInsert,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "item_sightings" },
        onItemSightingInsert,
      )
      .subscribe((status, subscriptionError) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          connected = true;
          setIsConnected(true);
          setSyncError("");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          connected = false;
          setIsConnected(false);
          setSyncError(
            subscriptionError?.message ??
              "Не удалось подключить живые уведомления. Проверьте Supabase Realtime.",
          );
        } else if (status === "CLOSED" && connected) {
          connected = false;
          setIsConnected(false);
          setSyncError("Соединение уведомлений с Supabase закрыто.");
        }
      });

    void getStoredItems()
      .then(async (items) => {
        if (!active) return;
        lostItems = items.filter(
          (item) => item.type === "lost" && item.status !== "returned",
        );
        const foundItems = items.filter(
          (item) => item.type === "found" && item.status !== "returned",
        );
        for (const foundItem of foundItems) addMatches(foundItem, false);

        const ownerLostItemIds = items
          .filter((item) => item.type === "lost" && item.ownerId === activeUserId)
          .map((item) => item.id);
        if (ownerLostItemIds.length) {
          const { data: sightings, error: sightingsError } = await supabase
            .from("item_sightings")
            .select("id,item_id,user_id,latitude,longitude,observed_at,comment,created_at")
            .in("item_id", ownerLostItemIds)
            .order("created_at", { ascending: false })
            .limit(100);
          if (sightingsError) {
            throw new Error(`Не удалось загрузить уведомления о наблюдениях: ${sightingsError.message}`);
          }
          for (const sighting of sightings ?? []) {
            if (queuedSightingIds.has(sighting.id)) continue;
            queuedSightingIds.add(sighting.id);
            addSightingNotification({
              id: sighting.id,
              itemId: sighting.item_id,
              userId: sighting.user_id,
              latitude: Number(sighting.latitude),
              longitude: Number(sighting.longitude),
              observedAt: sighting.observed_at,
              comment: sighting.comment,
              createdAt: sighting.created_at,
            }, items, false);
          }
        }

        const ownerItemIds = items
          .filter((item) => item.type === "found" && item.ownerId === activeUserId)
          .map((item) => item.id);
        if (!ownerItemIds.length) return;

        const { data: claims, error: claimsError } = await supabase
          .from("ownership_claims")
          .select("id,item_id,user_id,message,created_at")
          .eq("status", "pending")
          .in("item_id", ownerItemIds);
        if (claimsError) {
          throw new Error(`Не удалось загрузить запросы владельца: ${claimsError.message}`);
        }
        for (const claim of claims ?? []) {
          if (claim.user_id === activeUserId || queuedClaimIds.has(claim.id)) continue;
          queuedClaimIds.add(claim.id);
          addOwnershipClaimNotification({
            id: claim.id,
            itemId: claim.item_id,
            message: claim.message,
            createdAt: claim.created_at,
          }, items, false);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setSyncError(loadError instanceof Error ? loadError.message : "Не удалось загрузить совпадения.");
        }
      });

    return () => {
      active = false;
      setIsConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [permission, router, userId]);

  const markRead = useCallback((notificationId: string) => {
    if (!userId) return;
    const current = parseNotifications(getNotificationSnapshot(userId));
    if (current.error) {
      setSyncError(current.error);
      return;
    }
    const updated = current.notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, read: true } : notification,
    );
    try {
      writeNotifications(userId, updated);
    } catch (writeError) {
      setSyncError(writeError instanceof Error ? writeError.message : "Не удалось обновить уведомление.");
    }
  }, [userId]);

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const current = parseNotifications(getNotificationSnapshot(userId));
    if (current.error) {
      setSyncError(current.error);
      return;
    }
    try {
      writeNotifications(
        userId,
        current.notifications.map((notification) => ({ ...notification, read: true })),
      );
    } catch (writeError) {
      setSyncError(writeError instanceof Error ? writeError.message : "Не удалось обновить уведомления.");
    }
  }, [userId]);

  const enableBrowserNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      setSyncError("Этот браузер не поддерживает системные уведомления.");
      return;
    }
    try {
      await window.Notification.requestPermission();
      window.dispatchEvent(new Event(PERMISSION_EVENT));
      setSyncError("");
    } catch (permissionError) {
      setSyncError(
        permissionError instanceof Error
          ? permissionError.message
          : "Не удалось включить системные уведомления.",
      );
    }
  }, []);

  const unreadCount = parsed.notifications.filter((notification) => !notification.read).length;
  const isSubscribed = useCallback(
    (itemId: string) => parsedSubscriptions.subscriptions.some((subscription) => subscription.itemId === itemId),
    [parsedSubscriptions.subscriptions],
  );
  const subscribeToItem = useCallback((item: Pick<Item, "id" | "title">) => {
    if (!userId) return false;
    const current = parseSubscriptions(getSubscriptionSnapshot(userId));
    if (current.error) {
      setSyncError(current.error);
      return false;
    }
    if (current.subscriptions.some((subscription) => subscription.itemId === item.id)) return true;
    try {
      writeSubscriptions(userId, [
        { itemId: item.id, title: item.title, createdAt: new Date().toISOString() },
        ...current.subscriptions,
      ]);
      setSyncError("");
      return true;
    } catch (writeError) {
      setSyncError(writeError instanceof Error ? writeError.message : "Не удалось сохранить подписку.");
      return false;
    }
  }, [userId]);
  const unsubscribeFromItem = useCallback((itemId: string) => {
    if (!userId) return false;
    const current = parseSubscriptions(getSubscriptionSnapshot(userId));
    if (current.error) {
      setSyncError(current.error);
      return false;
    }
    try {
      writeSubscriptions(
        userId,
        current.subscriptions.filter((subscription) => subscription.itemId !== itemId),
      );
      setSyncError("");
      return true;
    } catch (writeError) {
      setSyncError(writeError instanceof Error ? writeError.message : "Не удалось отменить подписку.");
      return false;
    }
  }, [userId]);

  return {
    notifications: parsed.notifications,
    subscriptions: parsedSubscriptions.subscriptions,
    unreadCount,
    permission,
    isConnected,
    error: syncError || parsed.error || parsedSubscriptions.error,
    markRead,
    markAllRead,
    isSubscribed,
    subscribeToItem,
    unsubscribeFromItem,
    enableBrowserNotifications,
  };
}

export function ItemNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useDemoAuth();
  const state = useItemNotificationsClient(user?.id ?? null);
  return createElement(ItemNotificationsContext.Provider, { value: state }, children);
}

export function useItemNotifications() {
  const state = useContext(ItemNotificationsContext);
  if (!state) {
    throw new Error("useItemNotifications must be used within ItemNotificationsProvider.");
  }
  return state;
}
