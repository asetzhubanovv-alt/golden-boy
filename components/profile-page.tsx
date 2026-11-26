"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import BackLink from "@/components/back-link";
import VerifiedBadge from "@/components/verified-badge";
import { getCurrentProfile, isValidUsername, type Profile } from "@/lib/profiles";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { getSupabaseClient } from "@/lib/supabase";
import { useStoredItems } from "@/lib/use-stored-items";
import { deleteStoredItem, getAllItems, updateStoredItem, type Item } from "@/lib/items";
import { getLostItemProgress, getSimilarFoundItems } from "@/lib/item-matching";
import { useFavoriteItems } from "@/lib/use-favorite-items";
import RewardAmountField from "@/components/reward-amount-field";
import { useLanguage } from "@/components/language-provider";
import { getMyItemSightings, type ItemSighting } from "@/lib/sightings";
import { categoryTranslationKey, localizedError } from "@/lib/messages";
import { localizeDemoItem } from "@/lib/localized-demo-items";

type ProfileTab = "listings" | "favorites" | "sightings" | "settings";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  const { user, isReady } = useDemoAuth();
  const { items: storedItems, error: itemsError, isReady: itemsReady } = useStoredItems();
  const { favoriteIds, toggleFavorite, error: favoritesError } = useFavoriteItems(user?.id ?? null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [faculty, setFaculty] = useState("");
  const [course, setCourse] = useState("");
  const [avatarSelection, setAvatarSelection] = useState<{ file: File; previewUrl: string } | null>(null);
  const avatarFileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [sightingsResult, setSightingsResult] = useState<{
    userId: string;
    sightings: ItemSighting[];
    error: string;
  } | null>(null);
  const [editingItemForm, setEditingItemForm] = useState({
    title: "",
    category: "",
    type: "lost" as "lost" | "found",
    place: "",
    date: "",
    details: "",
    price: "",
    rewardEnabled: false,
    rewardAmount: "",
  });
  const [isSavingItemEdit, setIsSavingItemEdit] = useState(false);

  const requestedTab = searchParams.get("tab");
  const activeTab: ProfileTab =
    requestedTab === "favorites" ||
    requestedTab === "sightings" ||
    requestedTab === "settings"
      ? requestedTab
      : "listings";
  const profileTabs: { id: ProfileTab; label: string }[] = [
    { id: "listings", label: t("profile.tab.listings") },
    { id: "favorites", label: t("profile.tab.favorites") },
    { id: "sightings", label: t("profile.tab.sightings") },
    { id: "settings", label: t("profile.tab.settings") },
  ];
  const locale =
    language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU";
  const currentUserSightings =
    sightingsResult && sightingsResult.userId === user?.id
      ? sightingsResult
      : null;
  const isSightingsLoading = Boolean(user?.id) && !currentUserSightings;
  const mySightings = currentUserSightings?.sightings ?? [];
  const sightingsError = currentUserSightings?.error ?? "";

  function setActiveTab(tab: ProfileTab) {
    router.replace(tab === "listings" ? "/profile" : `/profile?tab=${tab}`, { scroll: false });
  }

  useEffect(() => {
    return () => {
      if (avatarSelection) URL.revokeObjectURL(avatarSelection.previewUrl);
    };
  }, [avatarSelection]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getCurrentProfile(user.id).then((currentProfile) => {
      if (!active || !currentProfile) return;
      setProfile(currentProfile);
      setUsername(currentProfile.username);
      setFullName(currentProfile.full_name);
      setBio(currentProfile.bio);
      setFaculty(currentProfile.faculty);
      setCourse(currentProfile.course?.toString() ?? "");
    }).catch((loadError: unknown) => {
      if (active) setError(localizedError(language, loadError, "profile.error.load"));
    }).finally(() => {
      if (active) setProfileLoading(false);
    });
    return () => { active = false; };
  }, [language, user]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let active = true;
    void getMyItemSightings(userId)
      .then((loadedSightings) => {
        if (active) {
          setSightingsResult({
            userId,
            sightings: loadedSightings,
            error: "",
          });
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setSightingsResult({
            userId,
            sightings: [],
            error:
              localizedError(language, loadError, "profile.sightings.loadError"),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [language, t, user?.id]);

  const completedFields = [
    username.trim(),
    fullName.trim(),
    bio.trim(),
    faculty.trim() || course,
    avatarSelection || profile?.avatar_url,
  ].filter(Boolean).length;
  const completion = Math.round((completedFields / 5) * 100);
  const publicProfilePath = isValidUsername(username.trim())
    ? `/u/${encodeURIComponent(username.trim())}`
    : "";

  function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError(t("profile.error.avatarType"));
      event.target.value = "";
      return;
    }
    setError("");
    setAvatarSelection(file ? { file, previewUrl: URL.createObjectURL(file) } : null);
  }

  async function copyProfileLink() {
    if (!publicProfilePath) return;
    setError("");
    setMessage("");
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicProfilePath}`);
      setMessage(t("profile.message.linkCopied"));
    } catch (copyError) {
      setError(localizedError(language, copyError, "profile.error.copyLink"));
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!user || !profile) return;
    if (!isValidUsername(username)) {
      setError(t("profile.error.username"));
      return;
    }
    setSaving(true);
    const supabase = getSupabaseClient();
    let saveErrorKey = "profile.error.save";
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarSelection) {
        const path = `${user.id}/avatar-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarSelection.file, { upsert: true, contentType: avatarSelection.file.type });
        if (uploadError) {
          saveErrorKey = "profile.error.avatarUpload";
          throw new Error(uploadError.message);
        }
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          full_name: fullName.trim(),
          bio: bio.trim(),
          faculty: faculty.trim(),
          course: course ? Number(course) : null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id)
        .select("id,username,full_name,avatar_url,bio,faculty,course,role,is_verified,is_blocked,created_at")
        .single();
      if (updateError) throw new Error(updateError.message);
      setProfile(data as Profile);
      setAvatarSelection(null);
      setMessage(t("profile.message.saved"));
    } catch (saveError) {
      setError(localizedError(language, saveError, saveErrorKey));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (!user || signingOut) return;
    const confirmed = window.confirm(t("profile.confirm.signOut"));
    if (!confirmed) return;

    setError("");
    setMessage("");
    setSigningOut(true);
    try {
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      if (signOutError) {
        throw new Error(signOutError.message);
      }
      router.push("/");
    } catch (signOutError) {
      setError(localizedError(language, signOutError, "profile.error.signOut"));
      setSigningOut(false);
    }
  }

  const allItems = useMemo(() => getAllItems(storedItems), [storedItems]);
  const ownItems = useMemo(
    () => storedItems.filter((item) => item.ownerId === user?.id),
    [storedItems, user?.id],
  );
  const favoriteItems = useMemo(
    () => allItems.filter((item) => favoriteIds.includes(item.id)),
    [allItems, favoriteIds],
  );

  function openEditItem(item: Item) {
    setError("");
    setMessage("");
    setEditingItem(item);
    setEditingItemForm({
      title: item.title,
      category: item.category,
      type: item.type,
      place: item.place,
      date: item.date ?? "",
      details: item.details,
      price: item.price == null ? "" : String(item.price),
      rewardEnabled: item.type === "lost" && item.rewardAmount != null,
      rewardAmount: item.rewardAmount == null ? "" : String(item.rewardAmount),
    });
  }

  async function saveEditedItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !editingItem) return;

    if (!editingItemForm.title.trim() || !editingItemForm.category || !editingItemForm.place.trim() || !editingItemForm.date || !editingItemForm.details.trim()) {
      setError(t("profile.error.requiredFields"));
      return;
    }

    setIsSavingItemEdit(true);
    try {
      await updateStoredItem(editingItem.id, user.id, {
        title: editingItemForm.title,
        category: editingItemForm.category,
        type: editingItemForm.type,
        place: editingItemForm.place,
        date: editingItemForm.date,
        details: editingItemForm.details,
        price: editingItemForm.price.trim() ? Number(editingItemForm.price) : null,
        rewardAmount:
          editingItemForm.type === "lost" && editingItemForm.rewardEnabled
            ? Number(editingItemForm.rewardAmount)
            : null,
      });
      setMessage(t("profile.message.listingUpdated"));
      setEditingItem(null);
    } catch (itemEditError) {
      setError(localizedError(language, itemEditError, "profile.error.listingUpdate"));
    } finally {
      setIsSavingItemEdit(false);
    }
  }

  async function deleteOwnItem(item: Item) {
    if (!user) return;
    const confirmed = window.confirm(
      t("profile.item.deleteConfirm").replace("{title}", item.title),
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await deleteStoredItem(item.id, user.id);
      setMessage(t("profile.message.listingDeleted"));
    } catch (deleteError) {
      setError(localizedError(language, deleteError, "profile.error.listingDelete"));
    }
  }

  function renderItemRow(item: Item, saved = false, includeActions = false) {
    const matches = item.type === "lost" ? getSimilarFoundItems(item, storedItems) : [];
    const progress = item.type === "lost" ? getLostItemProgress(item, matches.length > 0) : 0;
    const localizedItem = localizeDemoItem(item, language);
    return (
      <article className="account-listing" key={`${saved ? "saved-" : ""}${item.id}`}>
        <Link className="account-listing-main" href={`/item/${encodeURIComponent(item.id)}`}>
          <span className={`account-listing-art ${item.art}`} aria-hidden="true">
            {item.imageDataUrl ? <span style={{ backgroundImage: `url("${item.imageDataUrl}")` }} /> : item.symbol}
          </span>
          <span className="account-listing-copy">
            <strong>{localizedItem.title}</strong>
            <small>
              {localizedItem.place} · {localizedItem.categoryKey
                ? t(`category.${localizedItem.categoryKey}`)
                : item.category}
            </small>
            <span className={`account-status ${item.status}`}>
              {t(item.status === "returned" ? "status.returned" : item.type === "found" ? "status.found" : "status.searching")}
            </span>
            {item.type === "lost" && (
              <span className="mini-progress">
                <span className="mini-progress-track"><span style={{ width: `${((progress + 1) / 4) * 100}%` }} /></span>
                <small>{[
                  t("detail.progress.published"),
                  t("detail.progress.searching"),
                  t("detail.progress.match"),
                  t("detail.progress.returned"),
                ][progress]}</small>
              </span>
            )}
          </span>
        </Link>
        {includeActions ? (
          <div className="account-listing-actions">
            <button className="account-listing-action account-listing-action-edit" onClick={() => openEditItem(item)} type="button">
              {t("profile.item.edit")}
            </button>
            <button className="account-listing-action account-listing-action-delete" onClick={() => void deleteOwnItem(item)} type="button">
              {t("profile.item.delete")}
            </button>
          </div>
        ) : saved ? (
          <button
            aria-label={`${t("favorites.remove")} «${item.title}»`}
            className="favorite-remove-button"
            onClick={() => toggleFavorite(item.id)}
            type="button"
          >
            ♥
          </button>
        ) : null}
      </article>
    );
  }

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="profile" />
      <section className="profile-edit-page container">
        <BackLink />
        {!isReady ? <p>{t("profile.loading")}</p> : !user ? (
          <div className="profile-empty"><h1>{t("profile.signInTitle")}</h1><p>{t("profile.signInDescription")}</p><Button href="/login" variant="contained">{t("nav.login")}</Button></div>
        ) : (
          <>
            <header className="profile-page-heading"><span className="section-kicker">{t("profile.kicker")}</span><h1>{t("profile.title")}</h1></header>
            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}
            {profile?.role === "admin" && <Link className="profile-admin-link" href="/admin">{t("profile.adminLink")}</Link>}
            {profileLoading ? <p>{t("profile.loadingData")}</p> : profile ? (
              <>
                <section className="account-overview">
                  <div className="account-overview-avatar profile-avatar-preview">
                    {profile.avatar_url ? <span role="img" aria-label={t("profile.settings.avatarAria")} style={{ backgroundImage: `url("${profile.avatar_url}")` }} /> : <span>{(profile.full_name || profile.username).slice(0, 1).toUpperCase()}</span>}
                  </div>
                  <div className="account-overview-copy">
                    <span className="profile-username">@{profile.username} {profile.is_verified && <VerifiedBadge />}</span>
                    <h2>{profile.full_name || profile.username}</h2>
                    <p>{profile.bio || t("profile.bioPlaceholder")}</p>
                  </div>
                  <button className="account-edit-shortcut" onClick={() => setActiveTab("settings")} type="button">{t("profile.editButton")}</button>
                </section>
                <div className="account-stat-grid">
                  <article><strong>{ownItems.length}</strong><span>{t("profile.stats.listings")}</span></article>
                  <article><strong>{ownItems.filter((item) => item.status === "returned").length}</strong><span>{t("profile.stats.returned")}</span></article>
                  <article><strong>{favoriteIds.length}</strong><span>{t("profile.stats.favorites")}</span></article>
                </div>
                <div className="profile-signout-row">
                  <Button
                    className="profile-signout-button"
                    color="error"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    variant="outlined"
                  >
                    {signingOut ? t("profile.signingOut") : t("profile.signOut")}
                  </Button>
                </div>
                <div className="account-tabs" role="tablist" aria-label={t("profile.tablist")}>
                  {profileTabs.map((tab) => (
                    <button
                      aria-selected={activeTab === tab.id}
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      type="button"
                    >
                      {tab.label}
                      {tab.id === "favorites" && favoriteIds.length > 0 && <span>{favoriteIds.length}</span>}
                    </button>
                  ))}
                </div>
                {itemsError && <Alert severity="error">{localizedError(language, itemsError, "profile.error.loadListings")}</Alert>}
                {favoritesError && <Alert severity="error">{localizedError(language, favoritesError, "profile.error.loadFavorites")}</Alert>}
                {!itemsReady ? <p>{t("profile.loadingItems")}</p> : (
                  <section className="account-tab-panel" role="tabpanel">
                    {activeTab === "listings" && (
                      <>
                        <div className="account-section-heading"><div><span className="section-kicker">{t("profile.listings.kicker")}</span><h2>{t("profile.listings.title")}</h2></div><Button href="/add" variant="contained">＋ {t("profile.listings.add")}</Button></div>
                        {ownItems.length ? <div className="account-list">{ownItems.map((item) => renderItemRow(item, false, true))}</div> : <div className="account-empty"><span aria-hidden="true">⌕</span><h3>{t("profile.listings.emptyTitle")}</h3><p>{t("profile.listings.emptyDescription")}</p><Button href="/add" variant="contained">{t("profile.listings.create")}</Button></div>}
                      </>
                    )}
                    {activeTab === "favorites" && (
                      <>
                        <div className="account-section-heading"><div><span className="section-kicker">{t("profile.favorites.kicker")}</span><h2>{t("profile.tab.favorites")}</h2></div></div>
                        {favoriteItems.length ? <div className="account-list">{favoriteItems.map((item) => renderItemRow(item, true))}</div> : <div className="account-empty"><span aria-hidden="true">♡</span><h3>{t("profile.favorites.emptyTitle")}</h3><p>{t("profile.favorites.emptyDescription")}</p><Button href="/" variant="outlined">{t("profile.favorites.browse")}</Button></div>}
                      </>
                    )}
                    {activeTab === "sightings" && (
                      <>
                        <header className="item-sightings-heading">
                          <div>
                            <span className="section-kicker">
                              {t("profile.sightings.kicker")}
                            </span>
                            <h2>{t("profile.sightings.title")}</h2>
                          </div>
                          <span className="profile-sighting-count">
                            {mySightings.length}
                          </span>
                        </header>
                        {sightingsError && (
                          <Alert severity="error">{sightingsError}</Alert>
                        )}
                        {isSightingsLoading ? (
                          <p>{t("profile.sightings.loading")}</p>
                        ) : mySightings.length ? (
                          <div className="item-sighting-list profile-sighting-list">
                            {mySightings.map((sighting) => (
                              <article
                                className="item-sighting-card"
                                key={sighting.id}
                              >
                                <div className="item-sighting-byline">
                                  <strong>
                                    <span>
                                      {t("profile.sightings.markedListing")}:{" "}
                                    </span>
                                    <Link
                                      href={`/item/${encodeURIComponent(sighting.itemId)}?sighting=${encodeURIComponent(sighting.id)}#item-sightings`}
                                    >
                                      {sighting.itemTitle ||
                                        t("profile.sightings.untitledItem")}
                                    </Link>
                                  </strong>
                                  <time dateTime={sighting.observedAt}>
                                    {new Intl.DateTimeFormat(locale, {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    }).format(
                                      new Date(`${sighting.observedAt}T12:00:00`),
                                    )}
                                  </time>
                                </div>
                                {sighting.itemType && (
                                  <small>
                                    {t(
                                      sighting.itemType === "lost"
                                        ? "detail.lost"
                                        : "detail.found",
                                    )}
                                  </small>
                                )}
                                {sighting.itemPlace && (
                                  <p>
                                    <strong>
                                      {t("profile.sightings.listingLocation")}:{" "}
                                    </strong>
                                    {sighting.itemPlace}
                                  </p>
                                )}
                                <p>
                                  <strong>
                                    {t("profile.sightings.observedLocation")}:{" "}
                                  </strong>
                                  {sighting.address ||
                                    `${sighting.latitude.toFixed(5)}, ${sighting.longitude.toFixed(5)}`}
                                </p>
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
                                {sighting.comment && (
                                  <p>
                                    <strong>{t("profile.sightings.commentLabel")}: </strong>
                                    {sighting.comment}
                                  </p>
                                )}
                                <small className="profile-sighting-saved-at">
                                  {t("profile.sightings.savedAt")}{" "}
                                  {new Intl.DateTimeFormat(locale, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(sighting.createdAt))}
                                </small>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="account-empty">
                            <span aria-hidden="true">⌖</span>
                            <h3>{t("profile.sightings.emptyTitle")}</h3>
                            <p>{t("profile.sightings.emptyDescription")}</p>
                            <Button href="/" variant="outlined">
                              {t("profile.sightings.browse")}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                    {activeTab === "settings" && (
                      <>
                        <div className="account-section-heading"><div><span className="section-kicker">{t("profile.settings.kicker")}</span><h2>{t("profile.settings.title")}</h2></div></div>
                        <form className="profile-edit-card" onSubmit={saveProfile}>
                          <div className="profile-avatar-preview">
                            {avatarSelection ? (
                              <span
                                role="img"
                                aria-label={t("profile.settings.avatarPreview")}
                                style={{ backgroundImage: `url("${avatarSelection.previewUrl}")` }}
                              />
                            ) : profile.avatar_url ? (
                              <span
                                role="img"
                                aria-label={t("profile.settings.avatarAria")}
                                style={{ backgroundImage: `url("${profile.avatar_url}")` }}
                              />
                            ) : (
                              <span>{(profile.full_name || profile.username).slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <p className="profile-username">
                            @{profile.username} {profile.is_verified && <VerifiedBadge />}
                          </p>
                          <div className="profile-edit-tools">
                            <div className="profile-completion">
                              <div className="profile-completion-label">
                                <span>{t("profile.settings.completion")}</span>
                                <strong>{completion}%</strong>
                              </div>
                              <progress aria-label={t("profile.settings.completion")} max={100} value={completion} />
                            </div>
                            <div className="profile-public-actions">
                              {publicProfilePath && <Link href={publicProfilePath}>{t("profile.settings.openPublic")}</Link>}
                              <Button
                                disabled={!publicProfilePath}
                                onClick={copyProfileLink}
                                type="button"
                                variant="outlined"
                              >
                                {t("profile.settings.copyLink")}
                              </Button>
                            </div>
                          </div>
                          <div className="form-group">
                            <span className="form-label">{t("profile.settings.avatar")}</span>
                            <div className="profile-avatar-upload">
                              <input
                                accept="image/jpeg,image/png,image/webp"
                                aria-label={t("profile.settings.avatar")}
                                className="profile-avatar-input"
                                onChange={onAvatarChange}
                                ref={avatarFileInput}
                                type="file"
                                hidden
                              />
                              <Button
                                className="profile-avatar-upload-button"
                                onClick={() => avatarFileInput.current?.click()}
                                type="button"
                                variant="outlined"
                              >
                                <span aria-hidden="true">↑</span>
                                {t("profile.settings.chooseAvatar")}
                              </Button>
                              <div aria-live="polite" className="profile-avatar-upload-copy">
                                <strong>
                                  {avatarSelection?.file.name
                                    ?? (profile.avatar_url ? t("profile.settings.currentAvatar") : t("profile.settings.noAvatar"))}
                                </strong>
                                <span>{t("form.photoTypes")}</span>
                              </div>
                            </div>
                          </div>
                          <label className="form-group">
                            <span className="form-label">{t("profile.settings.username")} <span>*</span></span>
                            <input
                              maxLength={20}
                              minLength={3}
                              onChange={(event) => setUsername(event.target.value)}
                              pattern="[A-Za-z0-9_]{3,20}"
                              required
                              value={username}
                            />
                          </label>
                          <label className="form-group">
                            <span className="form-label">{t("profile.settings.fullName")}</span>
                            <input
                              maxLength={80}
                              onChange={(event) => setFullName(event.target.value)}
                              value={fullName}
                            />
                          </label>
                          <label className="form-group">
                            <span className="form-label">{t("profile.settings.bio")}</span>
                            <textarea
                              maxLength={500}
                              onChange={(event) => setBio(event.target.value)}
                              rows={4}
                              value={bio}
                            />
                          </label>
                          <div className="profile-form-columns">
                            <label className="form-group">
                              <span className="form-label">{t("profile.settings.faculty")}</span>
                              <input
                                maxLength={120}
                                onChange={(event) => setFaculty(event.target.value)}
                                value={faculty}
                              />
                            </label>
                            <label className="form-group">
                              <span className="form-label">{t("profile.settings.course")}</span>
                              <input
                                max={8}
                                min={1}
                                onChange={(event) => setCourse(event.target.value)}
                                type="number"
                                value={course}
                              />
                            </label>
                          </div>
                          <Button disabled={saving} type="submit" variant="contained">
                            {saving ? t("profile.settings.saving") : t("profile.settings.save")}
                          </Button>
                          <p className="profile-edit-note">
                            {t("profile.settings.note")}
                          </p>
                        </form>
                      </>
                    )}
                  </section>
                )}
                {editingItem && (
                  <Dialog fullWidth maxWidth="sm" onClose={() => setEditingItem(null)} open={Boolean(editingItem)}>
                    <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <span>{t("profile.item.edit")}</span>
                    </DialogTitle>
                    <DialogContent>
                      <form className="item-edit-form" id="profile-edit-item-form" onSubmit={saveEditedItem}>
                        <label className="form-group"><span className="form-label">{t("form.itemName")}</span><input maxLength={80} onChange={(event) => setEditingItemForm((current) => ({ ...current, title: event.target.value }))} required value={editingItemForm.title} /></label>
                        <label className="form-group"><span className="form-label">{t("profile.item.type")}</span><select onChange={(event) => { const type = event.target.value === "found" ? "found" : "lost"; setEditingItemForm((current) => ({ ...current, type, ...(type === "found" ? { rewardEnabled: false, rewardAmount: "" } : {}) })); }} value={editingItemForm.type}><option value="lost">{t("form.lostByMe")}</option><option value="found">{t("form.foundByMe")}</option></select></label>
                        <RewardAmountField
                          amount={editingItemForm.rewardAmount}
                          enabled={editingItemForm.rewardEnabled}
                          itemType={editingItemForm.type}
                          onAmountChange={(rewardAmount) => setEditingItemForm((current) => ({ ...current, rewardAmount }))}
                          onEnabledChange={(rewardEnabled) => setEditingItemForm((current) => ({ ...current, rewardEnabled, rewardAmount: rewardEnabled ? current.rewardAmount : "" }))}
                        />
                        <label className="form-group"><span className="form-label">{t("form.category")}</span><select onChange={(event) => setEditingItemForm((current) => ({ ...current, category: event.target.value }))} required value={editingItemForm.category}>{["Документы", "Телефон", "Ключи", "Наушники", "Одежда", "Сумки", "Другое", "Электроника", "Книги"].map((category) => { const categoryKey = categoryTranslationKey(category); return <option key={category} value={category}>{categoryKey ? t(categoryKey) : category}</option>; })}</select></label>
                        <label className="form-group"><span className="form-label">{t("form.location")}</span><input maxLength={120} onChange={(event) => setEditingItemForm((current) => ({ ...current, place: event.target.value }))} required value={editingItemForm.place} /></label>
                        <label className="form-group"><span className="form-label">{t("form.date")}</span><input onChange={(event) => setEditingItemForm((current) => ({ ...current, date: event.target.value }))} required type="date" value={editingItemForm.date} /></label>
                        <label className="form-group"><span className="form-label">{t("form.price")}</span><input max={9_999_999_999.99} min={0} onChange={(event) => setEditingItemForm((current) => ({ ...current, price: event.target.value }))} step="0.01" type="number" value={editingItemForm.price} /></label>
                        <label className="form-group"><span className="form-label">{t("form.description")}</span><textarea maxLength={1500} onChange={(event) => setEditingItemForm((current) => ({ ...current, details: event.target.value }))} rows={4} value={editingItemForm.details} /></label>
                      </form>
                    </DialogContent>
                    <DialogActions sx={{ padding: "0 24px 20px" }}>
                      <Button onClick={() => setEditingItem(null)} variant="outlined">{t("form.cancel")}</Button>
                      <Button disabled={isSavingItemEdit} form="profile-edit-item-form" type="submit" variant="contained">
                        {isSavingItemEdit ? t("form.savingChanges") : t("form.saveChanges")}
                      </Button>
                    </DialogActions>
                  </Dialog>
                )}
              </>
            ) : <Alert severity="error">{t("profile.notFound")}</Alert>}
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
