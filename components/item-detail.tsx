"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import BackLink from "@/components/back-link";
import { useLanguage } from "@/components/language-provider";
import MapLocationPicker from "@/components/map-location-picker";
import { categoryTranslationKey, localizedError, type Language } from "@/lib/messages";
import { localizeDemoItem } from "@/lib/localized-demo-items";
import {
  DEMO_ITEMS,
  ITEM_CATEGORIES,
  deleteStoredItem,
  formatItemDate,
  isStoredItem,
  saveItemReport,
  updateStoredItem,
  type Item,
  type ItemLocation,
  type ItemStatus,
} from "@/lib/items";
import { useStoredItems } from "@/lib/use-stored-items";
import { useDemoAuth } from "@/lib/use-demo-auth";
import VerifiedBadge from "@/components/verified-badge";
import { useFavoriteItems } from "@/lib/use-favorite-items";
import { getLostItemProgress, getSimilarFoundItems } from "@/lib/item-matching";
import { useItemNotifications } from "@/lib/use-item-notifications";
import OwnershipVerification from "@/components/ownership-verification";
import RewardAmountField from "@/components/reward-amount-field";
import ItemSightingMap from "@/components/item-sighting-map";
import { createOrGetConversation } from "@/lib/chat";
import {
  createItemSighting,
  getItemSightings,
  isAllowedSightingPhotoType,
  SIGHTING_PHOTO_ACCEPT,
  SIGHTING_PHOTO_MAX_BYTES,
  subscribeToItemSightings,
  type ItemSighting,
} from "@/lib/sightings";

function getLocalDateValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formattedDate(item: Item, language: Language) {
  if (!item.date) {
    if (item.daysAgo === 0) return `${language === "en" ? "Today" : language === "kk" ? "Бүгін" : "Сегодня"}, ${item.time}`;
    if (item.daysAgo === 1) return `${language === "en" ? "Yesterday" : language === "kk" ? "Кеше" : "Вчера"}, ${item.time}`;
    if (language === "en") return `${item.daysAgo} days ago, ${item.time}`;
    if (language === "kk") return `${item.daysAgo} күн бұрын, ${item.time}`;
    return formatItemDate(item.daysAgo, item.time);
  }
  const [year, month, day] = item.date.split("-");
  const locale = language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU";
  return new Intl.DateTimeFormat(locale).format(
    new Date(Number(year), Number(month) - 1, Number(day)),
  );
}

export default function ItemDetail({ id }: { id: string }) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSightingId = searchParams.get("sighting");
  const [sightingMapExpansion, setSightingMapExpansion] = useState(() => ({
    requestedSightingId,
    expanded: Boolean(requestedSightingId),
  }));
  const [sightingsListExpansion, setSightingsListExpansion] = useState(() => ({
    requestedSightingId,
    expanded: Boolean(requestedSightingId),
  }));
  const isSightingsListExpanded =
    sightingsListExpansion.requestedSightingId === requestedSightingId
      ? sightingsListExpansion.expanded
      : Boolean(requestedSightingId);
  const isSightingMapExpanded =
    sightingMapExpansion.requestedSightingId === requestedSightingId
      ? sightingMapExpansion.expanded
      : Boolean(requestedSightingId);
  const { items: storedItems, error: storageError, isReady } = useStoredItems();
  const { user, isReady: isAuthReady } = useDemoAuth();
  const { favoriteIds, toggleFavorite, error: favoritesError } = useFavoriteItems(user?.id ?? null);
  const {
    isSubscribed,
    subscribeToItem,
    unsubscribeFromItem,
  } = useItemNotifications();
  const [actionError, setActionError] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isOwnerControlsExpanded, setIsOwnerControlsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editType, setEditType] = useState<"lost" | "found">("lost");
  const [editLocation, setEditLocation] = useState<ItemLocation>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [editDate, setEditDate] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editRewardEnabled, setEditRewardEnabled] = useState(false);
  const [editRewardAmount, setEditRewardAmount] = useState("");
  const [editTelegram, setEditTelegram] = useState("");
  const [sightings, setSightings] = useState<ItemSighting[]>([]);
  const [sightingError, setSightingError] = useState("");
  const [sightingNotice, setSightingNotice] = useState("");
  const [isSightingDialogOpen, setIsSightingDialogOpen] = useState(false);
  const [sightingLocation, setSightingLocation] = useState<ItemLocation>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [sightingDate, setSightingDate] = useState(getLocalDateValue);
  const [sightingComment, setSightingComment] = useState("");
  const [sightingPhoto, setSightingPhoto] = useState<File | null>(null);
  const [sightingPhotoPreviewUrl, setSightingPhotoPreviewUrl] = useState("");
  const [sightingPhotoError, setSightingPhotoError] = useState("");
  const [isSubmittingSighting, setIsSubmittingSighting] = useState(false);
  const [contactingSightingId, setContactingSightingId] = useState("");
  const sightingSubmitLock = useRef(false);
  const sightingsSectionRef = useRef<HTMLElement>(null);
  const item =
    storedItems.find((storedItem) => storedItem.id === id) ??
    DEMO_ITEMS.find((demoItem) => demoItem.id === id) ??
    null;
  const localizedItem = item ? localizeDemoItem(item, language) : null;
  const itemOwnerId = item?.ownerId;
  const userId = user?.id;
  const isExampleItem = DEMO_ITEMS.some((demoItem) => demoItem.id === id);
  const isOwnItem =
    isReady &&
    isAuthReady &&
    isStoredItem(id, storedItems, user?.id);
  const visibleSightings =
    userId && item?.type === "lost"
      ? sightings.filter(
          (sighting) =>
            sighting.itemId === item.id &&
            (isOwnItem || sighting.userId === userId),
        )
      : [];
  const hasRequestedSighting = visibleSightings.some(
    (sighting) => sighting.id === requestedSightingId,
  );
  const statusLabels: Record<ItemStatus, string> = {
    searching: t("status.searching"),
    found: t("status.found"),
    returned: t("status.returned"),
  };
  const locale = language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU";
  const reportReasons = [
    t("detail.reportRule"),
    t("detail.reportSpam"),
    t("detail.reportPrivacy"),
    t("detail.reportOther"),
  ];

  useEffect(() => {
    if (!sightingPhotoPreviewUrl) return;
    return () => URL.revokeObjectURL(sightingPhotoPreviewUrl);
  }, [sightingPhotoPreviewUrl]);

  useEffect(() => {
    if (!userId || item?.type !== "lost" || !item.ownerId || isExampleItem) return;
    let active = true;

    const refreshSightings = () => {
      void getItemSightings(id)
        .then((loadedSightings) => {
          if (active) {
            setSightings(loadedSightings);
            setSightingError("");
          }
        })
        .catch((loadError: unknown) => {
          if (active) {
            setSightingError(
              loadError instanceof Error
                ? loadError.message
                : t("detail.error.sightings"),
            );
          }
        });
    };

    refreshSightings();
    const unsubscribe = subscribeToItemSightings(
      id,
      userId,
      refreshSightings,
      setSightingError,
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [id, isExampleItem, item?.ownerId, item?.type, t, userId]);

  useEffect(() => {
    if (
      !requestedSightingId ||
      !hasRequestedSighting
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      sightingsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasRequestedSighting, requestedSightingId]);

  function openSightingDialog() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/item/${encodeURIComponent(id)}`)}`);
      return;
    }
    setSightingError("");
    setSightingNotice("");
    setSightingLocation({ address: "", latitude: null, longitude: null });
    setSightingDate(getLocalDateValue());
    setSightingComment("");
    setSightingPhoto(null);
    setSightingPhotoPreviewUrl("");
    setSightingPhotoError("");
    setIsSightingDialogOpen(true);
  }

  function closeSightingDialog() {
    setIsSightingDialogOpen(false);
    setSightingPhoto(null);
    setSightingPhotoPreviewUrl("");
    setSightingPhotoError("");
  }

  function handleSightingPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const photo = input.files?.[0] ?? null;
    input.value = "";
    setSightingPhotoError("");
    if (!photo) return;

    if (!isAllowedSightingPhotoType(photo.type)) {
      setSightingPhoto(null);
      setSightingPhotoPreviewUrl("");
      setSightingPhotoError(t("sighting.photoTypeError"));
      return;
    }
    if (photo.size <= 0 || photo.size > SIGHTING_PHOTO_MAX_BYTES) {
      setSightingPhoto(null);
      setSightingPhotoPreviewUrl("");
      setSightingPhotoError(t("sighting.photoSizeError"));
      return;
    }

    setSightingPhoto(photo);
    setSightingPhotoPreviewUrl(URL.createObjectURL(photo));
  }

  async function handleSightingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sightingSubmitLock.current) return;
    setSightingError("");
    if (!user) {
      setSightingError(t("sighting.loginPrompt"));
      return;
    }
    const { address, latitude, longitude } = sightingLocation;
    if (latitude === null || longitude === null) {
      setSightingError(t("sighting.pickLocation"));
      return;
    }
    sightingSubmitLock.current = true;
    setIsSubmittingSighting(true);
    try {
      const sighting = await createItemSighting({
        id: crypto.randomUUID(),
        itemId: id,
        address,
        latitude,
        longitude,
        observedAt: sightingDate,
        comment: sightingComment,
        photo: sightingPhoto,
      });
      setSightings((current) =>
        current.some((existing) => existing.id === sighting.id)
          ? current
          : [sighting, ...current].sort((a, b) =>
              b.observedAt.localeCompare(a.observedAt) ||
              b.createdAt.localeCompare(a.createdAt),
            ),
      );
      setIsSightingDialogOpen(false);
      setSightingPhoto(null);
      setSightingPhotoPreviewUrl("");
      setSightingPhotoError("");
      setSightingNotice(t("sighting.sent"));
    } catch (submitError) {
      setSightingError(
        submitError instanceof Error
          ? submitError.message
          : t("detail.error.sendSighting"),
      );
    } finally {
      sightingSubmitLock.current = false;
      setIsSubmittingSighting(false);
    }
  }

  async function openSightingChat(sighting: ItemSighting) {
    if (!user || sighting.userId === user.id) return;
    setSightingError("");
    setContactingSightingId(sighting.id);
    try {
      const conversationId = await createOrGetConversation(sighting.userId, id);
      router.push(`/messages?conversation=${encodeURIComponent(conversationId)}`);
    } catch (chatError) {
      setSightingError(
        chatError instanceof Error ? chatError.message : t("detail.error.openChat"),
      );
    } finally {
      setContactingSightingId("");
    }
  }

  async function handleStatusChange(status: ItemStatus) {
    setActionError("");
    try {
      if (!user) throw new Error(t("detail.error.loginRequired"));
      await updateStoredItem(id, user.id, { status });
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : t("detail.error.update"),
      );
    }
  }

  function beginEditing() {
    if (!item) return;
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditType(item.type);
    setEditLocation({
      address: item.place,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
    });
    setEditDate(item.date ?? "");
    setEditDetails(item.details);
    setEditPrice(item.price == null ? "" : String(item.price));
    setEditRewardEnabled(item.type === "lost" && item.rewardAmount != null);
    setEditRewardAmount(item.rewardAmount == null ? "" : String(item.rewardAmount));
    setEditTelegram("");
    setActionError("");
    setIsEditing(true);
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");

    if (!editTitle.trim() || !editCategory || !editLocation.address.trim() || !editDate || !editDetails.trim()) {
      setActionError(t("detail.error.requiredFields"));
      return;
    }
    if (editLocation.latitude === null || editLocation.longitude === null) {
      setActionError(t("detail.error.location"));
      return;
    }
    if (editLocation.address.trim().length > 120) {
      setActionError(t("detail.error.addressLength"));
      return;
    }

    const telegramUsername = editTelegram.trim().replace(/^@/, "");
    if (telegramUsername && !/^[A-Za-z0-9_]{5,32}$/.test(telegramUsername)) {
      setActionError(t("form.error.telegram"));
      return;
    }

    setIsSavingEdit(true);
    try {
      if (!user) throw new Error(t("detail.error.loginRequired"));
      await updateStoredItem(id, user.id, {
        title: editTitle,
        category: editCategory,
        type: editType,
        place: editLocation.address,
        latitude: editLocation.latitude,
        longitude: editLocation.longitude,
        date: editDate,
        details: editDetails,
        price: editPrice.trim() ? Number(editPrice) : null,
        rewardAmount:
          editType === "lost" && editRewardEnabled
            ? Number(editRewardAmount)
            : null,
      });
      setIsEditing(false);
    } catch (editError) {
      setActionError(editError instanceof Error ? editError.message : t("detail.error.edit"));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("detail.deleteConfirm"))) {
      return;
    }

    setActionError("");
    try {
      if (!user) throw new Error(t("detail.error.loginRequired"));
      await deleteStoredItem(id, user.id);
      router.push("/");
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : t("detail.error.delete"),
      );
    }
  }

  async function handleReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportMessage("");
    setActionError("");
    if (!reportReason) {
      setActionError(t("detail.chooseReason"));
      return;
    }

    try {
      await saveItemReport(id, reportReason);
      setReportMessage(
        t("detail.reportSaved"),
      );
      setReportReason("");
    } catch (reportError) {
      setActionError(
        reportError instanceof Error
          ? reportError.message
          : t("detail.error.report"),
      );
    }
  }

  async function handleShare() {
    setActionError("");
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setReportMessage(t("detail.shareCopied"));
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setActionError(
        shareError instanceof Error
          ? shareError.message
          : t("detail.error.share"),
      );
    }
  }

  if (!isReady || !isAuthReady) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader />
        <div className="detail-loading">{t("detail.loading")}</div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader active="item" />
        <section className="detail-not-found container">
          <span aria-hidden="true">⌕</span>
          <h1>{t("detail.notFound")}</h1>
          <p>
            {t("detail.notFoundDescription")}
          </p>
          {(storageError || actionError) && (
            <Alert severity="error">
              {localizedError(language, storageError || actionError, "detail.error.general")}
            </Alert>
          )}
          <Button
            className="detail-primary-button"
            href="/"
            variant="contained"
          >
            {t("detail.backToFeed")}
          </Button>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="item" />

      <section className="detail-page container">
        <BackLink />
        <div className="form-breadcrumb">
          <Link href="/">{t("detail.backToFeed")}</Link>
          <span aria-hidden="true">/</span>
          <span>{localizedItem?.title ?? item.title}</span>
        </div>

        <div className="detail-layout">
          <div className="detail-media-column">
            <div
              className={`detail-art item-art ${item.art}${item.imageDataUrl ? " has-photo" : ""}`}
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
              <div className="detail-badges">
                <span className={`detail-type-badge ${item.type}`}>
                  {item.type === "lost" ? t("detail.lost") : t("detail.found")}
                </span>
                {item.type === "lost" && item.rewardAmount != null && item.rewardAmount > 0 && (
                  <span className="reward-badge">💰 {t("detail.rewardBadge")}</span>
                )}
              </div>
            </div>
            <section aria-labelledby="item-location-title" className="item-location-section">
              <h2 id="item-location-title">{t("detail.place")}</h2>
              {item.latitude != null && item.longitude != null ? (
                <MapLocationPicker
                  compact
                  language={language}
                  readOnly
                  value={{
                    address: localizedItem?.place ?? item.place,
                    latitude: item.latitude,
                    longitude: item.longitude,
                  }}
                />
              ) : (
                <p className="item-location-unavailable">
                  {localizedItem?.place ?? item.place}.{" "}
                  {t("detail.exactCoordinatesUnavailable")}
                </p>
              )}
            </section>
          </div>

          <article className="detail-content">
            <div className="detail-topline">
              <span className={`status-label ${item.status}`}>
                <span /> {statusLabels[item.status]}
              </span>
              {isOwnItem && <span className="demo-owner-label">{t("detail.ownItem")}</span>}
              {isOwnItem && (
              <div className={`owner-controls${isOwnerControlsExpanded ? " is-expanded" : ""}`}>
                <Button
                  aria-controls={isOwnerControlsExpanded ? "owner-actions" : undefined}
                  aria-expanded={isOwnerControlsExpanded}
                  className="owner-controls-toggle"
                  onClick={() => setIsOwnerControlsExpanded((expanded) => !expanded)}
                  variant="outlined"
                >
                  {isOwnerControlsExpanded ? t("detail.hideControls") : t("detail.edit")}
                </Button>
                {isOwnerControlsExpanded && (
                  <div className="owner-actions" id="owner-actions">
                    <Button onClick={isEditing ? () => setIsEditing(false) : beginEditing} variant="outlined">
                      {isEditing ? t("detail.cancelEdit") : t("detail.editDetails")}
                    </Button>
                    <Dialog
                      fullWidth
                      maxWidth="sm"
                      onClose={() => setIsEditing(false)}
                      open={isEditing}
                    >
                      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <span>{t("detail.edit")}</span>
                        <IconButton aria-label={t("detail.close")} onClick={() => setIsEditing(false)} size="small">
                          ×
                        </IconButton>
                      </DialogTitle>
                      <DialogContent>
                        <form className="item-edit-form" id="edit-item-form" onSubmit={handleEditSubmit}>
                          <label className="form-group"><span className="form-label">{t("form.itemName")}</span><input maxLength={80} onChange={(event) => setEditTitle(event.target.value)} required value={editTitle} /></label>
                          <label className="form-group"><span className="form-label">{t("form.whatHappened")}</span><select onChange={(event) => { if (event.target.value === "lost" || event.target.value === "found") { setEditType(event.target.value); if (event.target.value === "found") { setEditRewardEnabled(false); setEditRewardAmount(""); } } }} value={editType}><option value="lost">{t("form.lostByMe")}</option><option value="found">{t("form.foundByMe")}</option></select></label>
                          <label className="form-group"><span className="form-label">{t("form.category")}</span><select onChange={(event) => setEditCategory(event.target.value)} required value={editCategory}>{ITEM_CATEGORIES.map((category) => { const key = categoryTranslationKey(category); return <option key={category} value={category}>{key ? t(key) : category}</option>; })}</select></label>
                          <div className="form-group"><span className="form-label">{t("form.location")}</span><MapLocationPicker compact language={language} onChange={setEditLocation} value={editLocation} /></div>
                          <label className="form-group"><span className="form-label">{t("form.date")}</span><input onChange={(event) => setEditDate(event.target.value)} required type="date" value={editDate} /></label>
                          <label className="form-group"><span className="form-label">{t("form.price")}</span><input max={9_999_999_999.99} min={0} onChange={(event) => setEditPrice(event.target.value)} step="0.01" type="number" value={editPrice} /></label>
                          <RewardAmountField
                            amount={editRewardAmount}
                            enabled={editRewardEnabled}
                            itemType={editType}
                            onAmountChange={setEditRewardAmount}
                            onEnabledChange={(enabled) => {
                              setEditRewardEnabled(enabled);
                              if (!enabled) setEditRewardAmount("");
                            }}
                          />
                          <label className="form-group"><span className="form-label">{t("form.description")}</span><textarea maxLength={1500} onChange={(event) => setEditDetails(event.target.value)} rows={4} value={editDetails} /></label>
                          <label className="form-group"><span className="form-label">Telegram</span><input maxLength={33} onChange={(event) => setEditTelegram(event.target.value)} required value={editTelegram} /></label>
                        </form>
                      </DialogContent>
                      <DialogActions sx={{ padding: "0 24px 20px" }}>
                        <Button onClick={() => setIsEditing(false)} variant="outlined">{t("form.cancel")}</Button>
                        <Button disabled={isSavingEdit} form="edit-item-form" type="submit" variant="contained">
                          {isSavingEdit ? t("form.savingChanges") : t("form.saveChanges")}
                        </Button>
                      </DialogActions>
                    </Dialog>
                    <label htmlFor="item-status">{t("detail.status")}</label>
                    <select
                      id="item-status"
                      onChange={(event) => {
                        const value = event.target.value;
                        if (
                          value === "searching" ||
                          value === "returned"
                        ) {
                          handleStatusChange(value);
                        }
                      }}
                      value={item.status}
                    >
                      {Object.entries(statusLabels).filter(([value]) => value !== "found").map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Button
                      className="delete-item-button"
                      onClick={handleDelete}
                      variant="outlined"
                    >
                      {t("detail.delete")}
                    </Button>
                  </div>
                )}
              </div>
              )}
            </div>

            <h1>{localizedItem?.title ?? item.title}</h1>
            {item.type === "lost" && item.rewardAmount != null && (
              <p className="detail-reward">
                <span>{t("detail.reward")}</span>
                <strong>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: "KZT",
                    maximumFractionDigits: 0,
                  }).format(item.rewardAmount)}
                </strong>
              </p>
            )}
            {item.ownerUsername && (
              <div className="detail-author-block">
                <span className="detail-author-label">{t("detail.author")}</span>
                <Link className="detail-author" href={`/u/${encodeURIComponent(item.ownerUsername)}`}>
                  <span aria-hidden="true" className="detail-author-avatar">
                    {(item.ownerFullName?.trim() || item.ownerUsername).charAt(0).toLocaleUpperCase(locale)}
                  </span>
                  <span className="detail-author-copy">
                    <span className="detail-author-name">
                      {item.ownerFullName?.trim() || `@${item.ownerUsername}`}
                      {item.ownerVerified && <VerifiedBadge />}
                    </span>
                    {item.ownerFullName?.trim() && (
                      <span className="detail-author-username">@{item.ownerUsername}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className="detail-author-arrow">↗</span>
                </Link>
              </div>
            )}
            {item.price != null && (
              <p className="detail-price">
                <span>{t("detail.price")}</span>
                <strong>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: "KZT",
                    maximumFractionDigits: 2,
                  }).format(item.price)}
                </strong>
              </p>
            )}
            <div className="detail-action-area">
              {item.type === "lost" && item.status !== "returned" && !isExampleItem && (
                <Button
                  aria-label={isSubscribed(item.id) ? t("detail.subscribed") : t("detail.subscribe")}
                  aria-pressed={isSubscribed(item.id)}
                  className={`detail-subscription-button item-subscription-button${isSubscribed(item.id) ? " is-subscribed" : ""}`}
                  onClick={() => {
                    if (!user) {
                      router.push("/login");
                      return;
                    }
                    if (isSubscribed(item.id)) {
                      const unsubscribed = unsubscribeFromItem(item.id);
                      setActionError(
                        unsubscribed ? "" : t("notifications.error.unsubscribe"),
                      );
                      return;
                    }
                    if (window.confirm(t("detail.subscribeConfirm").replace("{title}", localizedItem?.title ?? item.title))) {
                      const subscribed = subscribeToItem(item);
                      setActionError(
                        subscribed ? "" : t("notifications.error.subscribe"),
                      );
                    }
                  }}
                  title={isSubscribed(item.id) ? t("detail.subscribed") : t("detail.subscribe")}
                  variant="outlined"
                >
                  <span aria-hidden="true">{isSubscribed(item.id) ? "✓" : "♧"}</span>
                  {isSubscribed(item.id) ? t("detail.subscribed") : t("detail.subscribe")}
                </Button>
              )}
              <div className="detail-quick-actions">
                {itemOwnerId && (
                  <Button
                    aria-label={t("detail.openChat")}
                    className="chat-item-button"
                    disabled={!isAuthReady}
                    onClick={() => {
                      if (itemOwnerId === user?.id) {
                        router.push("/messages");
                        return;
                      }
                      router.push(
                        `/messages?userId=${encodeURIComponent(itemOwnerId)}&itemId=${encodeURIComponent(item.id)}`,
                      );
                    }}
                    title={t("detail.openChat")}
                    variant="outlined"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="20"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                      width="20"
                    >
                      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.1A7.5 7.5 0 1 1 20 11.5Z" />
                      <path d="M8.5 11.5h7M8.5 14.5h4" />
                    </svg>
                  </Button>
                )}
                <Button
                  aria-label={favoriteIds.includes(item.id) ? t("favorites.remove") : t("favorites.add")}
                  aria-pressed={favoriteIds.includes(item.id)}
                  className={`favorite-item-button${favoriteIds.includes(item.id) ? " is-favorite" : ""}`}
                  onClick={() => {
                    if (!user) {
                      router.push("/login");
                      return;
                    }
                    toggleFavorite(item.id);
                  }}
                  title={favoriteIds.includes(item.id) ? t("favorites.remove") : t("favorites.add")}
                  variant="outlined"
                >
                  <span aria-hidden="true">{favoriteIds.includes(item.id) ? "♥" : "♡"}</span>
                </Button>
                <Button
                  aria-label={t("detail.share")}
                  className="share-item-button"
                  onClick={handleShare}
                  title={t("detail.share")}
                  variant="outlined"
                >
                  <span aria-hidden="true">↗</span>
                </Button>
              </div>
            </div>

            {(storageError || actionError || favoritesError) && (
              <Alert className="detail-alert" severity="error">
                {localizedError(
                  language,
                  storageError || actionError || favoritesError,
                  "detail.error.general",
                )}
              </Alert>
            )}
            {reportMessage && (
              <Alert className="detail-alert" severity="success">
                {reportMessage}
              </Alert>
            )}

            <dl className="detail-facts">
              <div>
                <dt>{t("detail.place")}</dt>
                <dd>
                  <span aria-hidden="true">⌖</span> {localizedItem?.place ?? item.place}
                </dd>
              </div>
              <div>
                <dt>{t("detail.published")}</dt>
                <dd>
                  <span aria-hidden="true">◷</span> {formattedDate(item, language)}
                </dd>
              </div>
            </dl>

            {item.type === "lost" && !isExampleItem && item.status !== "returned" && !isOwnItem && (
              <Button
                className="sighting-open-button"
                onClick={openSightingDialog}
                variant="contained"
              >
                {t("sighting.button")}
              </Button>
            )}
            {sightingNotice && <Alert className="detail-alert" severity="success">{sightingNotice}</Alert>}
            {sightingError && <Alert className="detail-alert" severity="error">{sightingError}</Alert>}

            <details className="detail-description">
              <summary>
                <span
                  aria-level={2}
                  className="detail-description-heading"
                  role="heading"
                >
                  {t("detail.description")}
                </span>
              </summary>
              <p>{(localizedItem?.details ?? item.details) || t("detail.noDescription")}</p>
            </details>

            {item.type === "lost" &&
              user &&
              (isOwnItem || visibleSightings.length > 0) && (
                <section
                  aria-labelledby="item-sightings-title"
                  className="item-sightings-panel"
                  id="item-sightings"
                  ref={sightingsSectionRef}
                >
                  <Button
                    aria-controls="item-sightings-content"
                    aria-expanded={isSightingsListExpanded}
                    className="item-sightings-list-toggle"
                    onClick={() =>
                      setSightingsListExpansion({
                        requestedSightingId,
                        expanded: !isSightingsListExpanded,
                      })
                    }
                    type="button"
                    variant="outlined"
                  >
                    <span aria-hidden="true" className="section-kicker">📍</span>
                    <span className="item-sightings-list-title" id="item-sightings-title">
                      {t(isSightingsListExpanded ? "sighting.hideList" : "sighting.listTitle")}
                    </span>
                    {isOwnItem && (
                      <span className="item-sightings-list-count">
                        {visibleSightings.length}
                      </span>
                    )}
                  </Button>
                  <div
                    className="item-sightings-content"
                    hidden={!isSightingsListExpanded}
                    id="item-sightings-content"
                  >
                    {visibleSightings.length === 0 ? (
                      <p className="item-sightings-empty">{t("sighting.empty")}</p>
                    ) : (
                      <>
                        <div className="item-sightings-map">
                          <header className="item-sightings-heading">
                            <Button
                              aria-controls="item-sightings-map-content"
                              aria-expanded={isSightingMapExpanded}
                              className="item-sightings-map-toggle"
                              onClick={() =>
                                setSightingMapExpansion({
                                  requestedSightingId,
                                  expanded: !isSightingMapExpanded,
                                })
                              }
                              type="button"
                              variant="outlined"
                            >
                              {t(isSightingMapExpanded ? "sighting.hideMap" : "sighting.showMap")}
                            </Button>
                          </header>
                          <div
                            className="item-sightings-map-content"
                            id="item-sightings-map-content"
                          >
                            {isSightingMapExpanded && (
                              <ItemSightingMap
                                highlightSightingId={requestedSightingId}
                                mode="sightings"
                                sightings={visibleSightings}
                              />
                            )}
                          </div>
                        </div>
                        <div className="item-sighting-list">
                          {visibleSightings.map((sighting) => (
                            <details
                              className="item-sighting-card"
                              id={`item-sighting-${sighting.id}`}
                              key={sighting.id}
                              open={sighting.id === requestedSightingId}
                            >
                              <summary className="item-sighting-summary">
                                <span className="item-sighting-byline">
                                  <strong>
                                    {sighting.userId === user.id
                                      ? t("sighting.you")
                                      : sighting.fullName || `@${sighting.username}`}
                                  </strong>
                                  <time dateTime={sighting.observedAt}>
                                    {new Intl.DateTimeFormat(locale, {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    }).format(new Date(`${sighting.observedAt}T12:00:00`))}
                                  </time>
                                </span>
                              </summary>
                              <div className="item-sighting-details">
                                {sighting.address && (
                                  <p>
                                    <strong>{t("sighting.address")}:</strong> {sighting.address}
                                  </p>
                                )}
                                {sighting.photoUrl && (
                                  <a
                                    className="item-sighting-photo"
                                    href={sighting.photoUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    <Image
                                      alt={t("sighting.photoAlt")}
                                      fill
                                      sizes="320px"
                                      src={sighting.photoUrl}
                                      unoptimized
                                    />
                                  </a>
                                )}
                                {sighting.comment && <p>{sighting.comment}</p>}
                                <small>
                                  {sighting.latitude.toFixed(5)}, {sighting.longitude.toFixed(5)}
                                </small>
                                {isOwnItem && sighting.userId !== user.id && (
                                  <Button
                                    disabled={contactingSightingId === sighting.id}
                                    onClick={() => void openSightingChat(sighting)}
                                    variant="outlined"
                                  >
                                    {contactingSightingId === sighting.id
                                      ? t("sighting.openingChat")
                                      : t("sighting.openChat")}
                                  </Button>
                                )}
                              </div>
                            </details>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}

            <Dialog
              className="sighting-dialog"
              fullWidth
              maxWidth="md"
              onClose={() => {
                if (!isSubmittingSighting) closeSightingDialog();
              }}
              open={isSightingDialogOpen}
            >
              <DialogTitle>{t("sighting.title")}</DialogTitle>
              <DialogContent>
                <p className="sighting-dialog-help">{t("sighting.help")}</p>
                {sightingError && (
                  <Alert severity="error">
                    {localizedError(language, sightingError, "sighting.error.general")}
                  </Alert>
                )}
                <p className="sighting-map-instructions">{t("sighting.pickLocation")}</p>
                <MapLocationPicker
                  compact
                  language={language}
                  onChange={setSightingLocation}
                  value={sightingLocation}
                />
                {sightingLocation.latitude !== null &&
                  sightingLocation.longitude !== null && (
                    <p aria-live="polite" className="sighting-selected-location">
                      {sightingLocation.latitude.toFixed(5)}, {sightingLocation.longitude.toFixed(5)}
                    </p>
                  )}
                <form
                  className="item-sighting-form"
                  id="item-sighting-form"
                  onSubmit={handleSightingSubmit}
                >
                  <label className="form-group">
                    <span className="form-label">{t("sighting.date")}</span>
                    <input
                      max={getLocalDateValue()}
                      onChange={(event) => setSightingDate(event.target.value)}
                      required
                      type="date"
                      value={sightingDate}
                    />
                  </label>
                  <label className="form-group">
                    <span className="form-label">{t("sighting.comment")}</span>
                    <textarea
                      maxLength={1000}
                      onChange={(event) => setSightingComment(event.target.value)}
                      placeholder={t("sighting.commentPlaceholder")}
                      rows={3}
                      value={sightingComment}
                    />
                  </label>
                  <div className="form-group">
                    <span className="form-label">{t("sighting.photo")}</span>
                    <label className="sighting-photo-picker">
                      <input
                        accept={SIGHTING_PHOTO_ACCEPT}
                        disabled={isSubmittingSighting}
                        onChange={handleSightingPhotoChange}
                        type="file"
                      />
                      <span aria-hidden="true">＋</span>
                      <span>{t("sighting.addPhoto")}</span>
                    </label>
                    <small className="sighting-photo-hint">{t("sighting.photoTypes")}</small>
                    {sightingPhotoError && (
                      <span className="field-error" role="alert">
                        {sightingPhotoError}
                      </span>
                    )}
                    {sightingPhotoPreviewUrl && (
                      <div className="sighting-photo-preview">
                        <div className="sighting-photo-preview-image">
                          <Image
                            alt={t("sighting.photoAlt")}
                            fill
                            sizes="320px"
                            src={sightingPhotoPreviewUrl}
                            unoptimized
                          />
                        </div>
                        <Button
                          disabled={isSubmittingSighting}
                          onClick={() => {
                            setSightingPhoto(null);
                            setSightingPhotoPreviewUrl("");
                            setSightingPhotoError("");
                          }}
                          type="button"
                          variant="outlined"
                        >
                          {t("sighting.removePhoto")}
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              </DialogContent>
              <DialogActions>
                <Button
                  disabled={isSubmittingSighting}
                  onClick={closeSightingDialog}
                  variant="outlined"
                >
                  {t("sighting.cancel")}
                </Button>
                <Button
                  disabled={
                    isSubmittingSighting ||
                    sightingLocation.latitude === null ||
                    sightingLocation.longitude === null
                  }
                  form="item-sighting-form"
                  type="submit"
                  variant="contained"
                >
                  {isSubmittingSighting ? t("sighting.sending") : t("sighting.send")}
                </Button>
              </DialogActions>
            </Dialog>

            {!isExampleItem && item.type === "found" && itemOwnerId && (
              <OwnershipVerification
                itemId={item.id}
                ownerId={itemOwnerId}
                isClosed={item.status === "returned"}
                userId={user?.id ?? null}
              />
            )}

            {isOwnItem && item.type === "lost" && (() => {
              const matches = getSimilarFoundItems(item, storedItems);
              const currentStep = getLostItemProgress(item, matches.length > 0);
              const steps = [
                t("detail.progress.published"),
                t("detail.progress.searching"),
                t("detail.progress.match"),
                t("detail.progress.returned"),
              ];
              return (
                <details className="item-progress-panel" aria-label={t("detail.progress.aria")}>
                  <summary className="item-progress-summary">
                    <span className="item-progress-title">
                      <span className="section-kicker">{t("detail.progress.kicker")}</span>
                      <span aria-level={2} className="item-progress-heading" role="heading">
                        {t("detail.progress.title")}
                      </span>
                      <span className="progress-current-label">{steps[currentStep]}</span>
                    </span>
                    <span className="item-progress-summary-action">
                      <span className="item-progress-show-label">{t("detail.progress.showSteps")}</span>
                      <span className="item-progress-hide-label">{t("detail.progress.hideSteps")}</span>
                      <span aria-hidden="true" className="item-progress-chevron">⌄</span>
                    </span>
                  </summary>
                  <div className="item-progress-steps">
                    {steps.map((step, index) => (
                      <div className={`item-progress-step${index <= currentStep ? " is-complete" : ""}${index === currentStep ? " is-current" : ""}`} key={step}>
                        <span className="item-progress-dot">{index < currentStep ? "✓" : index + 1}</span>
                        <small>{step}</small>
                      </div>
                    ))}
                  </div>
                  {matches.length > 0 && (
                    <div className="item-match-hint">
                      <span aria-hidden="true">✦</span>
                      <p>{t(matches.length === 1 ? "detail.progress.matchOne" : "detail.progress.matchMany")}</p>
                      <button
                        className="item-match-notifications-button"
                        onClick={() => router.push("/notifications")}
                        type="button"
                      >
                        {t("detail.progress.viewMatches")}
                      </button>
                    </div>
                  )}
                  {item.status === "returned" && <p className="progress-success-note">{t("detail.progress.success")}</p>}
                </details>
              );
            })()}

            {itemOwnerId && itemOwnerId !== user?.id && !isOwnItem ? (
              <div className="detail-contact">
                <div>
                  <h2>{t("detail.contact")}</h2>
                  <p>{t("detail.contactHint")}</p>
                </div>
                <Button
                  className="detail-primary-button"
                  onClick={() => {
                    router.push(
                      `/messages?userId=${encodeURIComponent(itemOwnerId)}&itemId=${encodeURIComponent(item.id)}`,
                    );
                  }}
                  variant="contained"
                >
                  {t("detail.openChat")} <span aria-hidden="true">↗</span>
                </Button>
              </div>
            ) : !isOwnItem ? (
              <div className="detail-contact">
                <div>
                  <h2>{t("detail.contact")}</h2>
                  <p>{t("detail.chatUnavailable")}</p>
                </div>
              </div>
            ) : null}

            {!isExampleItem && (
              <details className="report-box">
                <summary>{t("detail.report")}</summary>
                <form onSubmit={handleReport}>
                  <label htmlFor="report-reason">{t("detail.reportReason")}</label>
                  <select
                    id="report-reason"
                    onChange={(event) => setReportReason(event.target.value)}
                    required
                    value={reportReason}
                  >
                    <option disabled value="">
                      {t("detail.chooseReason")}
                    </option>
                    {reportReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="report-button"
                    type="submit"
                    variant="outlined"
                  >
                    {t("detail.sendReport")}
                  </Button>
                </form>
                <p>{t("detail.reportDemo")}</p>
              </details>
            )}
          </article>
        </div>

      </section>

      <SiteFooter />
    </main>
  );
}
