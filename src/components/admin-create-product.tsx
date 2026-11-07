import { focusFirstInvalidField } from "@/lib/admin/form-errors";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { adminRequest, AdminRequestError, readUpload } from "@/lib/admin/client";
import { displayCategories, subcategories } from "@/lib/display-taxonomy";

export function AdminCreateProduct({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (sku: string) => void;
}) {
  const [category, setCategory] = useState("general");
  const [sub, setSub] = useState("");
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleFitment, setFitment] = useState("");
  const [hidden, setHidden] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [photo, setPhoto] = useState<{ base64: string; preview: string }>();
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!Object.keys(fieldErrors).length) return;
    const id = requestAnimationFrame(() => focusFirstInvalidField(formRef.current, fieldErrors));
    return () => cancelAnimationFrame(id);
  }, [fieldErrors]);
  const fieldAttrs = (field: string) => ({
    name: field,
    "aria-invalid": Boolean(fieldErrors[field]),
    "aria-describedby": fieldErrors[field] ? `new-product-${field}-error` : undefined,
    onInput: () => {
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setError("");
    },
  });
  const feedback = (field: string) =>
    fieldErrors[field] ? (
      <span id={`new-product-${field}-error`} className="ad-field-error" role="alert">
        {fieldErrors[field]}
      </span>
    ) : null;
  async function suggestAgain() {
    setSuggesting(true);
    try {
      const result = await adminRequest<{ sku: string }>(
        `products/suggest-sku?category=${encodeURIComponent(category)}`,
      );
      setSku(result.sku);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.sku;
        return next;
      });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  }
  useEffect(() => {
    let active = true;
    setSuggesting(true);
    setSub("");
    adminRequest<{ sku: string }>(`products/suggest-sku?category=${encodeURIComponent(category)}`)
      .then((r) => {
        if (active) setSku(r.sku);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setSuggesting(false);
      });
    return () => {
      active = false;
    };
  }, [category]);
  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("בדקו את קובץ הצילום");
      setFieldErrors({ photoBase64: "מותר JPEG, PNG או WebP בלבד" });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const base64 = await readUpload(file);
      setPhoto({ base64, preview: `data:${file.type};base64,${base64}` });
    } catch (e) {
      setError((e as Error).message);
      setFieldErrors({ photoBase64: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const product = await adminRequest<{ sku: string }>("products", "POST", {
        sku,
        name,
        category,
        sub,
        price,
        brand,
        description,
        vehicleFitment,
        hidden,
        inStock,
        ...(photo ? { photoBase64: photo.base64 } : {}),
      });
      onCreated(product.sku);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof AdminRequestError) setFieldErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="ad-modal-backdrop">
          <Dialog.Content className="ad-sheet">
            <div className="ad-handle" />
            <div className="ad-row ad-between">
              <Dialog.Title className="text-xl font-bold">הוסף מוצר</Dialog.Title>
              <button
                className="ad-icon"
                aria-label="סגירת הוספת מוצר"
                disabled={busy}
                onClick={onClose}
              >
                <X />
              </button>
            </div>
            <Dialog.Description className="ad-note">
              מוצר חדש בשכבת הניהול בלבד. הקטלוג המקורי אינו משתנה. המק״ט ניתן לעריכה עד השמירה.
            </Dialog.Description>
            {error && (
              <p role="alert" className="ad-alert">
                {error}
              </p>
            )}
            <form ref={formRef} onSubmit={submit} noValidate>
              <label className="ad-field">
                שם מוצר · לפחות 2 תווים
                <textarea
                  {...fieldAttrs("name")}
                  required
                  maxLength={300}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {feedback("name")}
              </label>
              <label className="ad-field">
                קטגוריה
                <select
                  {...fieldAttrs("category")}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {displayCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {feedback("category")}
              </label>
              <label className="ad-field">
                תת־קטגוריה
                <select {...fieldAttrs("sub")} value={sub} onChange={(e) => setSub(e.target.value)}>
                  <option value="">ללא תת־קטגוריה · יוצג בהכול</option>
                  {(subcategories[category] || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {feedback("sub")}
              </label>
              <label className="ad-field">
                מק״ט שלנו · הצעה ייחודית, ניתן לעריכה
                <input
                  {...fieldAttrs("sku")}
                  dir="ltr"
                  required
                  pattern="HZ-[A-Z0-9]{2,12}-[0-9]{5}"
                  maxLength={21}
                  aria-label="מק״ט שלנו"
                  value={sku}
                  disabled={suggesting}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                />
                {feedback("sku")}
                <button
                  type="button"
                  className="ad-button ad-secondary"
                  disabled={busy || suggesting}
                  onClick={() => {
                    void suggestAgain();
                  }}
                >
                  הצע מק״ט פנוי חדש
                </button>
              </label>
              <label className="ad-field">
                מחיר כולל מע״מ
                <input
                  {...fieldAttrs("price")}
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  maxLength={30}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="ריק = הצעת מחיר"
                />
                {feedback("price")}
              </label>
              <label className="ad-field">
                מותג / יצרן · אופציונלי
                <input
                  {...fieldAttrs("brand")}
                  maxLength={60}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
                {feedback("brand")}
              </label>
              <label className="ad-field">
                תיאור
                <textarea
                  {...fieldAttrs("description")}
                  maxLength={3000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {feedback("description")}
              </label>
              <label className="ad-field">
                התאמה לרכב · יש להזין רק מידע מאומת
                <textarea
                  {...fieldAttrs("vehicleFitment")}
                  maxLength={1000}
                  value={vehicleFitment}
                  onChange={(e) => setFitment(e.target.value)}
                />
                {feedback("vehicleFitment")}
              </label>
              <label className="ad-row ad-switch-row">
                <span>במלאי</span>
                <input
                  {...fieldAttrs("inStock")}
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                />
                {feedback("inStock")}
              </label>
              <label className="ad-row ad-switch-row">
                <span>הסתר מהאתר</span>
                <input
                  {...fieldAttrs("hidden")}
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                />
                {feedback("hidden")}
              </label>
              <div className="ad-upload">
                {photo && <img alt="תצוגת צילום המוצר החדש" src={photo.preview} />}
                <label>
                  צילום אמיתי · עד 2MB
                  <input
                    {...fieldAttrs("photoBase64")}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      void upload(e.target.files?.[0]);
                    }}
                  />
                  {feedback("photoBase64")}
                </label>
              </div>
              <button className="ad-button" type="submit" disabled={busy || suggesting}>
                {busy ? "שומר…" : "הוסף מוצר"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
