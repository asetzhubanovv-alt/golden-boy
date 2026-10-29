"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useState,
} from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { useLanguage } from "@/components/language-provider";
import {
  getDaysAgo,
  getItemArt,
  ITEM_CATEGORIES,
  saveItem,
  type ItemType,
} from "@/lib/items";
import { categoryTranslationKey } from "@/lib/messages";
import { useTodayDate } from "@/lib/use-stored-items";
import { useDemoAuth } from "@/lib/use-demo-auth";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Не удалось прочитать изображение."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение."));
    reader.readAsDataURL(file);
  });
}

export default function AddItemPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const today = useTodayDate();
  const { user, isReady: isAuthReady, error: authError } = useDemoAuth();
  const [type, setType] = useState<ItemType>("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [telegram, setTelegram] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError("");
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageDataUrl("");
      setImageName("");
      setImageError(t("form.error.imageType"));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageDataUrl("");
      setImageName("");
      setImageError(t("form.error.imageSize"));
      event.target.value = "";
      return;
    }

    try {
      setImageDataUrl(await readImage(file));
      setImageName(file.name);
    } catch (imageReadError) {
      setImageDataUrl("");
      setImageName("");
      setImageError(
        imageReadError instanceof Error
          ? imageReadError.message
          : t("form.error.uploadImage"),
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!user) {
      setError("Войди или зарегистрируйся, чтобы опубликовать объявление.");
      return;
    }
    const selectedDate = date || today;

    const normalizedTelegram = telegram.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{5,32}$/.test(normalizedTelegram)) {
      setError(t("form.error.telegram"));
      return;
    }

    if (!selectedDate) {
      setError(t("form.error.date"));
      return;
    }

    setIsSaving(true);
    const { art, symbol } = getItemArt(category);
    const now = new Date();
    const itemId = crypto.randomUUID();

    try {
      saveItem({
        id: itemId,
        title: title.trim(),
        category,
        type,
        place: place.trim(),
        date: selectedDate,
        daysAgo: getDaysAgo(selectedDate),
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        status: "searching",
        art,
        symbol,
        details: details.trim(),
        telegram: normalizedTelegram,
        ownerId: user.id,
        ...(imageDataUrl ? { imageDataUrl } : {}),
      });
      router.push(`/item/${itemId}`);
    } catch (saveError) {
      setIsSaving(false);
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("form.error.save"),
      );
    }
  }

  if (!isAuthReady) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader active="add" />
        <section className="auth-required-state container">
          <p>Проверяем демо-аккаунт...</p>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="foundly-shell container-fluid px-0">
        <SiteHeader active="add" />
        <section className="auth-required-state container">
          <span className="section-kicker">ПУБЛИКАЦИЯ ОБЪЯВЛЕНИЯ</span>
          <h1>Сначала войди в аккаунт</h1>
          <p>
            Демо-аккаунт нужен, чтобы сохранить объявление за его автором и
            управлять его статусом.
          </p>
          <Alert className="demo-alert" severity="info">
            {authError ||
              "Регистрация работает локально в этом браузере. Это не серверная авторизация."}
          </Alert>
          <div className="auth-required-actions">
            <Button
              className="detail-primary-button"
              href="/login"
              variant="contained"
            >
              Войти
            </Button>
            <Button className="auth-secondary-button" href="/register">
              Создать аккаунт
            </Button>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="add" />

      <section className="form-page">
        <div className="container form-page-container">
          <div className="form-breadcrumb">
            <Link href="/">{t("form.breadcrumbFeed")}</Link>
            <span aria-hidden="true">/</span>
            <span>{t("form.breadcrumbNew")}</span>
          </div>

          <div className="form-heading">
            <span className="section-kicker">{t("form.kicker")}</span>
              <h1>{t("form.title")}</h1>
              <p>{t("form.subtitle")}</p>
          </div>

          <Alert className="demo-alert" severity="info">
            {t("form.demoNotice")}
          </Alert>

          <form className="item-form" onSubmit={handleSubmit}>
            {error && (
              <Alert className="form-error" severity="error">
                {error}
              </Alert>
            )}

            <fieldset className="form-group">
              <legend>
                {t("form.whatHappened")} <span>*</span>
              </legend>
              <div className="kind-options">
                <button
                  aria-pressed={type === "lost"}
                  className={`kind-option ${type === "lost" ? "selected" : ""}`}
                  onClick={() => setType("lost")}
                  type="button"
                >
                  <span className="kind-icon lost-kind" aria-hidden="true">
                    ↗
                  </span>
                  <span>
                    <strong>{t("form.lostByMe")}</strong>
                    <small>{t("form.findMyItem")}</small>
                  </span>
                </button>
                <button
                  aria-pressed={type === "found"}
                  className={`kind-option ${type === "found" ? "selected" : ""}`}
                  onClick={() => setType("found")}
                  type="button"
                >
                  <span className="kind-icon found-kind" aria-hidden="true">
                    ✳
                  </span>
                  <span>
                    <strong>{t("form.foundByMe")}</strong>
                    <small>{t("form.findOwner")}</small>
                  </span>
                </button>
              </div>
            </fieldset>

            <div className="form-two-columns">
              <label className="form-group">
                <span className="form-label">
                  {t("form.itemName")} <span>*</span>
                </span>
                <input
                  autoComplete="off"
                  maxLength={80}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("form.namePlaceholder")}
                  required
                  value={title}
                />
              </label>

              <label className="form-group">
                <span className="form-label">
                  {t("form.category")} <span>*</span>
                </span>
                <select
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  value={category}
                >
                  <option disabled value="">
                    {t("form.chooseCategory")}
                  </option>
                  {ITEM_CATEGORIES.map((itemCategory) => (
                    <option key={itemCategory} value={itemCategory}>
                      {categoryTranslationKey(itemCategory)
                        ? t(categoryTranslationKey(itemCategory)!)
                        : itemCategory}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-group">
                <span className="form-label">{t("form.description")}</span>
              <textarea
                maxLength={1000}
                onChange={(event) => setDetails(event.target.value)}
                placeholder={t("form.descriptionPlaceholder")}
                rows={4}
                value={details}
              />
              <span className="field-hint">
                {t("form.privacyHint")}
              </span>
            </label>

            <div className="form-two-columns">
              <label className="form-group">
                <span className="form-label">
                  {t("form.location")} <span>*</span>
                </span>
                <input
                  maxLength={120}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder={t("form.locationPlaceholder")}
                  required
                  value={place}
                />
              </label>

              <label className="form-group">
                <span className="form-label">
                  {t("form.date")} <span>*</span>
                </span>
                <input
                  max={today}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  type="date"
                  value={date || today}
                />
              </label>
            </div>

            <div className="form-group">
              <span className="form-label">{t("form.photo")}</span>
              <label className="upload-area">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  type="file"
                />
                {imageDataUrl ? (
                  <span
                    className="upload-preview"
                    style={{ backgroundImage: `url("${imageDataUrl}")` }}
                    role="img"
                    aria-label={`${t("form.photo")}: ${imageName}`}
                  />
                ) : (
                  <span className="upload-icon" aria-hidden="true">
                    ↑
                  </span>
                )}
                <span className="upload-copy">
                  <strong>{imageName || t("form.addPhoto")}</strong>
                  <small>{t("form.photoTypes")}</small>
                </span>
                <span className="upload-browse">{t("form.chooseFile")}</span>
              </label>
              {imageError && (
                <span className="field-error" role="alert">
                  {imageError}
                </span>
              )}
            </div>

            <div className="form-divider" />

            <label className="form-group">
              <span className="form-label">
                {t("form.telegram")} <span>*</span>
              </span>
              <div className="telegram-input">
                <span aria-hidden="true">@</span>
                <input
                  autoComplete="off"
                  maxLength={33}
                  onChange={(event) => setTelegram(event.target.value)}
                  pattern="@?[A-Za-z0-9_]{5,32}"
                  placeholder="username"
                  required
                  value={telegram}
                />
              </div>
              <span className="field-hint">
                {t("form.telegramHint")}
              </span>
            </label>

            <div className="form-submit-row">
              <Link className="cancel-link" href="/">
                {t("form.cancel")}
              </Link>
              <Button
                className="form-submit-button"
                disabled={isSaving}
                type="submit"
                variant="contained"
              >
                {isSaving ? t("form.saving") : t("form.submit")}
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          </form>

          <p className="form-privacy-note">
            {t("form.privacyNote")}
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
