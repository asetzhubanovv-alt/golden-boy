"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { DemoNotice, SiteHeader } from "@/app/components/SiteHeader";
import {
  ITEM_CATEGORIES,
  saveItem,
  type Item,
  type ItemType,
} from "@/lib/items";

type FormValues = {
  type: ItemType | "";
  title: string;
  category: string;
  description: string;
  place: string;
  date: string;
  telegram: string;
};

type FieldErrors = Partial<Record<keyof FormValues | "photo", string>>;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TELEGRAM_PATTERN = /^[A-Za-z0-9_]{5,32}$/;

function getToday(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Не удалось подготовить изображение."));
      }
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать выбранный файл."));
    reader.readAsDataURL(file);
  });
}

export default function AddItemPage() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({
    type: "",
    title: "",
    category: "",
    description: "",
    place: "",
    date: getToday(),
    telegram: "",
  });
  const [photo, setPhoto] = useState<string>();
  const [photoName, setPhotoName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        photo: "Выберите изображение в формате JPG, PNG или WebP.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((current) => ({
        ...current,
        photo: "Файл слишком большой. Максимальный размер — 5 МБ.",
      }));
      event.target.value = "";
      return;
    }

    try {
      const image = await readImage(file);
      setPhoto(image);
      setPhotoName(file.name);
      setErrors((current) => ({ ...current, photo: undefined }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        photo:
          error instanceof Error
            ? error.message
            : "Не удалось прочитать выбранное изображение.",
      }));
      event.target.value = "";
    }
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    if (!values.type) nextErrors.type = "Выберите тип объявления.";
    if (!values.title.trim()) nextErrors.title = "Укажите название вещи.";
    if (!values.category) nextErrors.category = "Выберите категорию.";
    if (!values.place.trim()) nextErrors.place = "Укажите корпус или аудиторию.";
    if (!values.date) nextErrors.date = "Укажите дату.";
    if (!values.telegram.trim()) {
      nextErrors.telegram = "Укажите Telegram-ник для связи.";
    } else if (!TELEGRAM_PATTERN.test(values.telegram.trim())) {
      nextErrors.telegram =
        "Ник должен содержать 5–32 символа: латинские буквы, цифры или подчёркивание.";
    }
    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      const itemType = values.type;
      const category = ITEM_CATEGORIES.find(
        (candidate) => candidate === values.category,
      );
      if (!itemType || !category) {
        setSubmitError(
          "Не удалось проверить тип или категорию. Проверьте обязательные поля.",
        );
        setIsSaving(false);
        return;
      }

      const item: Item = {
        id: crypto.randomUUID(),
        type: itemType,
        title: values.title.trim(),
        category,
        description: values.description.trim(),
        place: values.place.trim(),
        date: values.date,
        ...(photo ? { imageDataUrl: photo } : {}),
        telegram: values.telegram.trim(),
        status: "searching",
        createdAt: new Date().toISOString(),
      };
      saveItem(item);
      router.push(`/item/${encodeURIComponent(item.id)}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить объявление. Попробуйте ещё раз.",
      );
      setIsSaving(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="container page-container add-page">
        <div className="page-intro">
          <Link href="/" className="back-link">
            <span aria-hidden="true">←</span> К объявлениям
          </Link>
          <p className="eyebrow">ПОМОГАЕМ НАЙТИ ВАЖНОЕ</p>
          <h1>Новое объявление</h1>
          <p className="page-lead">
            Расскажите о вещи — возможно, её уже кто-то нашёл.
          </p>
        </div>

        <DemoNotice />

        <form className="row g-4 add-form" onSubmit={handleSubmit} noValidate>
          <div className="col-12 col-lg-8">
            <section className="form-panel">
              <div className="form-section-heading">
                <span className="section-number">01</span>
                <div>
                  <h2>О вещи</h2>
                  <p>Основная информация поможет её узнать.</p>
                </div>
              </div>

              <fieldset className="field-group">
                <legend className="field-label">
                  Что произошло? <span className="required-mark">*</span>
                </legend>
                <div className="type-options">
                  {(["lost", "found"] as const).map((type) => (
                    <label
                      className={`type-option ${values.type === type ? "selected" : ""}`}
                      key={type}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={type}
                        checked={values.type === type}
                        onChange={() => updateValue("type", type)}
                      />
                      <span className="type-option-icon" aria-hidden="true">
                        {type === "lost" ? "⌕" : "✳"}
                      </span>
                      <span>
                        <strong>{type === "lost" ? "Потерял" : "Нашёл"}</strong>
                        <small>
                          {type === "lost"
                            ? "Ищу свою вещь"
                            : "Нашёл чужую вещь"}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.type && (
                  <span className="field-error" role="alert">
                    {errors.type}
                  </span>
                )}
              </fieldset>

              <div className="field-group">
                <TextField
                  label="Название вещи"
                  value={values.title}
                  onChange={(event) => updateValue("title", event.target.value)}
                  placeholder="Например, чёрный кошелёк"
                  fullWidth
                  required
                  error={Boolean(errors.title)}
                  helperText={errors.title}
                  inputProps={{ maxLength: 100 }}
                />
              </div>

              <div className="field-group">
                <TextField
                  select
                  label="Категория"
                  value={values.category}
                  onChange={(event) => updateValue("category", event.target.value)}
                  fullWidth
                  required
                  error={Boolean(errors.category)}
                  helperText={errors.category}
                >
                  <MenuItem value="" disabled>
                    Выберите категорию
                  </MenuItem>
                  {ITEM_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              </div>

              <div className="field-group">
                <TextField
                  label="Описание"
                  value={values.description}
                  onChange={(event) =>
                    updateValue("description", event.target.value)
                  }
                  placeholder="Цвет, приметы и другие детали"
                  fullWidth
                  multiline
                  minRows={4}
                  inputProps={{ maxLength: 1000 }}
                  helperText={`${values.description.length}/1000`}
                />
              </div>
            </section>

            <section className="form-panel">
              <div className="form-section-heading">
                <span className="section-number">02</span>
                <div>
                  <h2>Где и когда</h2>
                  <p>Добавьте детали, которые помогут сориентироваться.</p>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-12 col-sm-7">
                  <TextField
                    label="Место"
                    value={values.place}
                    onChange={(event) => updateValue("place", event.target.value)}
                    placeholder="Корпус, аудитория или другое место"
                    fullWidth
                    required
                    error={Boolean(errors.place)}
                    helperText={errors.place}
                    inputProps={{ maxLength: 120 }}
                  />
                </div>
                <div className="col-12 col-sm-5">
                  <TextField
                    label="Дата"
                    type="date"
                    value={values.date}
                    onChange={(event) => updateValue("date", event.target.value)}
                    fullWidth
                    required
                    error={Boolean(errors.date)}
                    helperText={errors.date}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </div>
              </div>
            </section>

            <section className="form-panel">
              <div className="form-section-heading">
                <span className="section-number">03</span>
                <div>
                  <h2>Фото</h2>
                  <p>Изображение не обязательно, но поможет узнать вещь.</p>
                </div>
              </div>
              <div className="photo-upload">
                <input
                  id="item-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handlePhotoChange}
                />
                <label className="photo-upload-pick" htmlFor="item-photo">
                  {photo ? (
                    <Image
                      className="photo-preview"
                      src={photo}
                      alt="Предпросмотр"
                      width={134}
                      height={128}
                      unoptimized
                    />
                  ) : (
                    <span className="upload-icon" aria-hidden="true">
                      ↑
                    </span>
                  )}
                  <span className="upload-copy">
                    <strong>{photoName || "Нажмите, чтобы загрузить фото"}</strong>
                    <small>JPG, PNG или WebP · до 5 МБ</small>
                  </span>
                </label>
                {photo && (
                  <button
                    className="remove-photo"
                    type="button"
                    aria-label="Удалить фотографию"
                    onClick={(event) => {
                      event.preventDefault();
                      setPhoto(undefined);
                      setPhotoName("");
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              {errors.photo && (
                <span className="field-error" role="alert">
                  {errors.photo}
                </span>
              )}
            </section>
          </div>

          <div className="col-12 col-lg-4">
            <aside className="form-aside">
              <section className="form-panel contact-panel">
                <div className="form-section-heading">
                  <span className="section-number">04</span>
                  <div>
                    <h2>Как связаться</h2>
                    <p>Чтобы вам могли написать по объявлению.</p>
                  </div>
                </div>
                <TextField
                  label="Telegram-ник"
                  value={values.telegram}
                  onChange={(event) =>
                    updateValue("telegram", event.target.value.replace(/^@/, ""))
                  }
                  placeholder="username"
                  fullWidth
                  required
                  error={Boolean(errors.telegram)}
                  helperText={
                    errors.telegram || "От 5 до 32 символов, без символа @"
                  }
                  inputProps={{ maxLength: 32, autoCapitalize: "none" }}
                  slotProps={{ input: { startAdornment: "@" } }}
                />
                <Alert severity="warning" className="contact-warning">
                  Контакт будет публичным в опубликованном объявлении. Сейчас это
                  только локальная демо-версия: данные остаются в вашем браузере.
                </Alert>
              </section>

              <section className="form-panel publish-panel">
                {submitError && (
                  <Alert severity="error" className="submit-error">
                    {submitError}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isSaving}
                  className="publish-button"
                >
                  {isSaving ? "Сохраняем…" : "Сохранить объявление"}
                </Button>
                <p>Объявление сохранится только на этом устройстве.</p>
                <Link href="/" className="cancel-link">
                  Отменить
                </Link>
              </section>
            </aside>
          </div>
        </form>
      </main>
    </>
  );
}
