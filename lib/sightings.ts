"use client";

import { getSupabaseClient } from "@/lib/supabase";

export type ItemSighting = {
  id: string;
  itemId: string;
  userId: string;
  address: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  comment: string;
  createdAt: string;
  username: string;
  fullName: string;
  itemTitle: string;
};

type ItemSightingRow = {
  id: string;
  item_id: string;
  user_id: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  observed_at: string;
  comment: string;
  created_at: string;
  profiles: { username: string; full_name: string } | null;
  items?: { title: string } | null;
};

const sightingSelection =
  "id,item_id,user_id,address,latitude,longitude,observed_at,comment,created_at,profiles!item_sightings_user_id_fkey(username,full_name)";

function fromSightingRow(row: ItemSightingRow): ItemSighting {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Сервер вернул некорректные координаты наблюдения.");
  }
  return {
    id: row.id,
    itemId: row.item_id,
    userId: row.user_id,
    address: row.address,
    latitude,
    longitude,
    observedAt: row.observed_at,
    comment: row.comment,
    createdAt: row.created_at,
    username: row.profiles?.username ?? "",
    fullName: row.profiles?.full_name ?? "",
    itemTitle: row.items?.title ?? "",
  };
}

export async function getItemSightings(itemId: string): Promise<ItemSighting[]> {
  const { data, error } = await getSupabaseClient()
    .from("item_sightings")
    .select(sightingSelection)
    .eq("item_id", itemId)
    .order("observed_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Не удалось загрузить отметки на карте: ${error.message}`);
  return ((data ?? []) as unknown as ItemSightingRow[]).map(fromSightingRow);
}

export async function getMyItemSightings(userId: string): Promise<ItemSighting[]> {
  const { data, error } = await getSupabaseClient()
    .from("item_sightings")
    .select(
      `${sightingSelection},items!item_sightings_item_id_fkey(title)`,
    )
    .eq("user_id", userId)
    .order("observed_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Не удалось загрузить ваши отметки: ${error.message}`);
  }
  return ((data ?? []) as unknown as ItemSightingRow[]).map(fromSightingRow);
}

export async function createItemSighting(input: {
  id: string;
  itemId: string;
  address: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  comment: string;
}): Promise<ItemSighting> {
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new Error("Поставьте отметку на карте.");
  }
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(input.observedAt)
    ? new Date(`${input.observedAt}T00:00:00Z`)
    : null;
  if (
    !parsedDate ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== input.observedAt
  ) {
    throw new Error("Укажите дату наблюдения.");
  }
  const comment = input.comment.trim();
  if (comment.length > 1000) {
    throw new Error("Комментарий не должен быть длиннее 1000 символов.");
  }
  const address = input.address.trim();
  if (address.length > 120) {
    throw new Error("Адрес не должен содержать более 120 символов.");
  }

  const supabase = getSupabaseClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Не удалось проверить аккаунт: ${authError.message}`);
  if (!userData.user) throw new Error("Войдите в аккаунт, чтобы отправить наблюдение.");

  const { data, error } = await supabase
    .from("item_sightings")
    .insert({
      id: input.id,
      item_id: input.itemId,
      user_id: userData.user.id,
      address,
      latitude: input.latitude,
      longitude: input.longitude,
      observed_at: input.observedAt,
      comment,
    })
    .select(sightingSelection)
    .single();

  if (error) throw new Error(`Не удалось отправить наблюдение: ${error.message}`);
  return fromSightingRow(data as unknown as ItemSightingRow);
}

export function subscribeToItemSightings(
  itemId: string,
  userId: string,
  onInsert: () => void,
  onError: (message: string) => void,
): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`foundly-item-sightings-${itemId}-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "item_sightings",
        filter: `item_id=eq.${itemId}`,
      },
      onInsert,
    )
    .subscribe((status, subscriptionError) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onError(
          subscriptionError?.message ??
            "Не удалось подключить обновления отметок. Проверьте Supabase Realtime.",
        );
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
