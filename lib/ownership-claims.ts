"use client";

import { getSupabaseClient } from "@/lib/supabase";

export type OwnershipClaimStatus = "pending" | "confirmed" | "rejected";

export type OwnershipClaim = {
  id: string;
  item_id: string;
  user_id: string;
  message: string;
  status: OwnershipClaimStatus;
  created_at: string;
  username: string | null;
  full_name: string | null;
};

export function subscribeToOwnershipClaims(
  itemId: string,
  onChange: () => void,
  onError: (message: string) => void,
): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`ownership-claims-${itemId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ownership_claims", filter: `item_id=eq.${itemId}` },
      onChange,
    )
    .subscribe((status, error) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onError(error?.message ?? "Не удалось подключить обновления запросов.");
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

type OwnershipClaimRow = Omit<OwnershipClaim, "username" | "full_name">;

export async function getOwnershipClaims(itemId: string): Promise<OwnershipClaim[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("ownership_claims")
    .select("id,item_id,user_id,message,status,created_at")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Не удалось загрузить запросы на подтверждение: ${error.message}`);

  const rows = (data ?? []) as OwnershipClaimRow[];
  const userIds = [...new Set(rows.map((claim) => claim.user_id))];
  if (!userIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,username,full_name")
    .in("id", userIds);
  if (profilesError) {
    throw new Error(`Не удалось загрузить профили авторов запросов: ${profilesError.message}`);
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  return rows.map((claim) => {
    const profile = profilesById.get(claim.user_id);
    return {
      ...claim,
      username: profile?.username ?? null,
      full_name: profile?.full_name ?? null,
    };
  });
}

export async function createOwnershipClaim(
  itemId: string,
  userId: string,
  message: string,
): Promise<void> {
  const normalizedMessage = message.trim();
  if (normalizedMessage.length < 10 || normalizedMessage.length > 1200) {
    throw new Error("Опишите особые приметы вещи: от 10 до 1200 символов.");
  }

  const { error } = await getSupabaseClient()
    .from("ownership_claims")
    .insert({
      item_id: itemId,
      user_id: userId,
      message: normalizedMessage,
    });

  if (error) throw new Error(`Не удалось отправить запрос: ${error.message}`);
}

export async function updateOwnershipClaimStatus(
  claimId: string,
  status: Exclude<OwnershipClaimStatus, "pending">,
): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from("ownership_claims")
    .update({ status })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Не удалось обновить запрос: ${error.message}`);
  if (!data) throw new Error("Запрос уже обработан или у тебя нет прав.");
}
