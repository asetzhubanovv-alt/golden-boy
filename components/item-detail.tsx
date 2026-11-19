"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import BackLink from "@/components/back-link";
import { useLanguage } from "@/components/language-provider";
import MapLocationPicker from "@/components/map-location-picker";
import { categoryTranslationKey, type Language } from "@/lib/messages";
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
import { OPEN_NOTIFICATIONS_EVENT } from "@/lib/use-item-notifications";
import { useItemNotifications } from "@/lib/use-item-notifications";
import OwnershipVerification from "@/components/ownership-verification";
import RewardAmountField from "@/components/reward-amount-field";
import ItemSightingMap from "@/components/item-sighting-map";
import { createOrGetConversation } from "@/lib/chat";
import {
  createItemSighting,
  getItemSightings,
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
  const { items: storedItems, error: storageError, isReady } = useStoredItems();
  const { user, isReady: isAuthReady } = useDemoAuth();
  const { favoriteIds, toggleFavorite, error: favoritesError } = useFavoriteItems(user?.id ?? null);
  const {
    isSubscribed,
    subscribeToItem,
    unsubscribeFromItem,
    error: notificationsError,
  } = useItemNotifications();
  const [actionError, setActionError] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
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
  const [isSubmittingSighting, setIsSubmittingSighting] = useState(false);
  const [contactingSightingId, setContactingSightingId] = useState("");
  const sightingSubmitLock = useRef(false);
  const sightingsSectionRef = useRef<HTMLElement>(null);
  const item =
    storedItems.find((storedItem) => storedItem.id === id) ??
    DEMO_ITEMS.find((demoItem) => demoItem.id === id) ??
    null;
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
                : "Не удалось загрузить отметки на карте.",
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
  }, [id, isExampleItem, item?.ownerId, item?.type, userId]);

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
    setIsSightingDialogOpen(true);
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
      setSightingNotice(t("sighting.sent"));
    } catch (submitError) {
      setSightingError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось отправить наблюдение.",
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
        chatError instanceof Error ? chatError.message : "Не удалось открыть чат.",
      );
    } finally {
      setContactingSightingId("");
    }
  }

  async function handleStatusChange(status: ItemStatus) {
    setActionError("");
    try {
      if (!user) throw new Error("Войди в аккаунт.");
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
      setActionError("Заполните все обязательные поля.");
      return;
    }
    if (editLocation.latitude === null || editLocation.longitude === null) {
      setActionError("Найдите адрес или выберите точку на карте.");
      return;
    }
    if (editLocation.address.trim().length > 120) {
      setActionError("Адрес должен содержать не более 120 символов.");
      return;
    }

    const telegramUsername = editTelegram.trim().replace(/^@/, "");
    if (telegramUsername && !/^[A-Za-z0-9_]{5,32}$/.test(telegramUsername)) {
      setActionError(t("form.error.telegram"));
      return;
    }

    setIsSavingEdit(true);
    try {
      if (!user) throw new Error("Войди в аккаунт.");
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
      setActionError(editError instanceof Error ? editError.message : "Не удалось изменить объявление.");
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
      if (!user) throw new Error("Войди в аккаунт.");
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
        setReportMessage("Ссылка скопирована.");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setActionError(
        shareError instanceof Error
          ? shareError.message
          : "Не удалось поделиться ссылкой.",
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
            <Alert severity="error">{storageError || actionError}</Alert>
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
          <Link href="/">Лента</Link>
          <span aria-hidden="true">/</span>
          <span>{item.title}</span>
        </div>

        <div className="detail-layout">
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
                <span className="reward-badge">💰 ВОЗНАГРАЖДЕНИЕ</span>
              )}
            </div>
          </div>

          <article className="detail-content">
            <div className="detail-topline">
              <span className={`status-label ${item.status}`}>
                <span /> {statusLabels[item.status]}
              </span>
              {isOwnItem && <span className="demo-owner-label">{t("detail.ownItem")}</span>}
            </div>

            <h1>{item.title}</h1>
            {item.ownerUsername && (
              <Link className="detail-author" href={`/u/${encodeURIComponent(item.ownerUsername)}`}>
                {item.ownerFullName || `@${item.ownerUsername}`}
                {item.ownerVerified && <VerifiedBadge />}
              </Link>
            )}
            <span className="category-label detail-category">
              {categoryTranslationKey(item.category)
                ? t(categoryTranslationKey(item.category)!)
                : item.category}
            </span>
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
            <div className="detail-quick-actions">
              <Button
                aria-pressed={favoriteIds.includes(item.id)}
                className={`favorite-item-button${favoriteIds.includes(item.id) ? " is-favorite" : ""}`}
                onClick={() => {
                  if (!user) {
                    router.push("/login");
                    return;
                  }
                  toggleFavorite(item.id);
                }}
                variant="outlined"
              >
                <span aria-hidden="true">{favoriteIds.includes(item.id) ? "♥" : "♡"}</span>
                {favoriteIds.includes(item.id) ? "В избранном" : "В избранное"}
              </Button>
              {item.type === "lost" && item.status !== "returned" && !isExampleItem && (
                <Button
                  aria-pressed={isSubscribed(item.id)}
                  className={`item-subscription-button${isSubscribed(item.id) ? " is-subscribed" : ""}`}
                  onClick={() => {
                    if (!user) {
                      router.push("/login");
                      return;
                    }
                    if (isSubscribed(item.id)) {
                      unsubscribeFromItem(item.id);
                      return;
                    }
                    if (window.confirm(`Подписаться на новые находки, похожие на «${item.title}»?`)) {
                      subscribeToItem(item);
                    }
                  }}
                  variant="outlined"
                >
                  <span aria-hidden="true">{isSubscribed(item.id) ? "✓" : "♧"}</span>
                  {isSubscribed(item.id) ? "Уведомления включены" : "Следить за находками"}
                </Button>
              )}
              <Button className="share-item-button" onClick={handleShare} variant="outlined">
                Поделиться <span aria-hidden="true">↗</span>
              </Button>
            </div>

            {(storageError || actionError || favoritesError || notificationsError) && (
              <Alert className="detail-alert" severity="error">
                {storageError || actionError || favoritesError || notificationsError}
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
                  <span aria-hidden="true">⌖</span> {item.place}
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

            {item.type === "lost" &&
              user &&
              (isOwnItem || visibleSightings.length > 0) && (
                <section
                  aria-labelledby="item-sightings-title"
                  className="item-sightings-panel"
                  id="item-sightings"
                  ref={sightingsSectionRef}
                >
                  <header className="item-sightings-heading">
                    <div>
                      <span className="section-kicker">📍</span>
                      <h2 id="item-sightings-title">{t("sighting.listTitle")}</h2>
                    </div>
                    {isOwnItem && <span>{visibleSightings.length}</span>}
                  </header>
                  {visibleSightings.length === 0 ? (
                    <p className="item-sightings-empty">{t("sighting.empty")}</p>
                  ) : (
                    <>
                      <ItemSightingMap
                        highlightSightingId={requestedSightingId}
                        mode="sightings"
                        sightings={visibleSightings}
                      />
                      <div className="item-sighting-list">
                        {visibleSightings.map((sighting) => (
                          <article
                            className="item-sighting-card"
                            id={`item-sighting-${sighting.id}`}
                            key={sighting.id}
                          >
                            <div className="item-sighting-byline">
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
                            </div>
                            {sighting.address && (
                              <p>
                                <strong>{t("sighting.address")}:</strong> {sighting.address}
                              </p>
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
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}

            <div className="detail-description">
                <h2>{t("detail.description")}</h2>
                <p>{item.details || t("detail.noDescription")}</p>
            </div>

            <Dialog
              className="sighting-dialog"
              fullWidth
              maxWidth="md"
              onClose={() => {
                if (!isSubmittingSighting) setIsSightingDialogOpen(false);
              }}
              open={isSightingDialogOpen}
            >
              <DialogTitle>{t("sighting.title")}</DialogTitle>
              <DialogContent>
                <p className="sighting-dialog-help">{t("sighting.help")}</p>
                {sightingError && <Alert severity="error">{sightingError}</Alert>}
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
                </form>
              </DialogContent>
              <DialogActions>
                <Button
                  disabled={isSubmittingSighting}
                  onClick={() => setIsSightingDialogOpen(false)}
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
              const steps = ["Объявление опубликовано", "Ищем совпадения", "Есть похожая находка", "Вещь возвращена"];
              return (
                <section className="item-progress-panel" aria-label="Прогресс поиска">
                  <div className="account-section-heading">
                    <div><span className="section-kicker">ПРОГРЕСС ПОИСКА</span><h2>Путь вашей вещи</h2></div>
                    <span className="progress-current-label">{steps[currentStep]}</span>
                  </div>
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
                      <p>Нашли {matches.length === 1 ? "похожее объявление" : "похожие объявления"} в кампусе.</p>
                      <button
                        className="item-match-notifications-button"
                        onClick={() => window.dispatchEvent(new Event(OPEN_NOTIFICATIONS_EVENT))}
                        type="button"
                      >
                        Посмотреть совпадения
                      </button>
                    </div>
                  )}
                  {item.status === "returned" && <p className="progress-success-note">Поиск завершён: объявление отмечено как возвращённое.</p>}
                </section>
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

            {isOwnItem && (
              <div className="owner-actions">
                <Button onClick={isEditing ? () => setIsEditing(false) : beginEditing} variant="outlined">
                  {isEditing ? "Отменить редактирование" : "Редактировать объявление"}
                </Button>
                <Dialog
                  fullWidth
                  maxWidth="sm"
                  onClose={() => setIsEditing(false)}
                  open={isEditing}
                >
                  <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <span>Редактировать объявление</span>
                    <IconButton aria-label="Закрыть" onClick={() => setIsEditing(false)} size="small">
                      ×
                    </IconButton>
                  </DialogTitle>
                  <DialogContent>
                    <form className="item-edit-form" id="edit-item-form" onSubmit={handleEditSubmit}>
                      <label className="form-group"><span className="form-label">Название</span><input maxLength={80} onChange={(event) => setEditTitle(event.target.value)} required value={editTitle} /></label>
                      <label className="form-group"><span className="form-label">Тип объявления</span><select onChange={(event) => { if (event.target.value === "lost" || event.target.value === "found") { setEditType(event.target.value); if (event.target.value === "found") { setEditRewardEnabled(false); setEditRewardAmount(""); } } }} value={editType}><option value="lost">Потерял</option><option value="found">Нашёл</option></select></label>
                      <label className="form-group"><span className="form-label">Категория</span><select onChange={(event) => setEditCategory(event.target.value)} required value={editCategory}>{ITEM_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                      <div className="form-group"><span className="form-label">Местоположение</span><MapLocationPicker compact language={language} onChange={setEditLocation} value={editLocation} /></div>
                      <label className="form-group"><span className="form-label">Дата</span><input onChange={(event) => setEditDate(event.target.value)} required type="date" value={editDate} /></label>
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
                      <label className="form-group"><span className="form-label">Описание</span><textarea maxLength={1500} onChange={(event) => setEditDetails(event.target.value)} rows={4} value={editDetails} /></label>
                      <label className="form-group"><span className="form-label">Telegram</span><input maxLength={33} onChange={(event) => setEditTelegram(event.target.value)} required value={editTelegram} /></label>
                    </form>
                  </DialogContent>
                  <DialogActions sx={{ padding: "0 24px 20px" }}>
                    <Button onClick={() => setIsEditing(false)} variant="outlined">Отмена</Button>
                    <Button disabled={isSavingEdit} form="edit-item-form" type="submit" variant="contained">
                      {isSavingEdit ? "Сохраняем…" : "Сохранить изменения"}
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

        <section aria-labelledby="item-location-title" className="item-location-section">
          <h2 id="item-location-title">
            {language === "en" ? "Location" : language === "kk" ? "Орналасқан жері" : "Местоположение"}
          </h2>
          {item.latitude != null && item.longitude != null ? (
            <MapLocationPicker
              language={language}
              readOnly
              value={{
                address: item.place,
                latitude: item.latitude,
                longitude: item.longitude,
              }}
            />
          ) : (
            <p className="item-location-unavailable">
              {item.place}.{" "}
              {language === "en"
                ? "Exact coordinates were not saved for this listing."
                : language === "kk"
                  ? "Бұл хабарландыру үшін нақты координаттар сақталмаған."
                  : "Точные координаты для этого объявления не сохранены."}
            </p>
          )}
        </section>

        <div className="detail-back-row">
          <Link href="/">← {t("detail.backAll")}</Link>
          <span>{t("detail.backNote")}</span>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
