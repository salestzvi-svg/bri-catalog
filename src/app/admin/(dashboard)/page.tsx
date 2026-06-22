"use client";

import CustomerLinkCard from "@/components/CustomerLinkCard";
import { STAGING_CATEGORY_NAME } from "@/lib/staging-category";
import { useEffect, useMemo, useRef, useState } from "react";

interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_staging?: boolean;
}

interface AdminProduct {
  itemId: number;
  sku: string;
  rivhitName: string;
  name: string;
  price: number;
  rivhitPrice: number;
  hasCustomPrice?: boolean;
  image: string | null;
  rivhitImage?: string | null;
  hasCustomImage?: boolean;
  categoryId: string | null;
  categoryName: string | null;
  isStaging?: boolean;
}

function formatAdminPrice(price: number) {
  if (!price || price <= 0) return "—";
  return `₪${price.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const PAGE_SIZE = 48;

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stagingCategoryId, setStagingCategoryId] = useState<string | null>(
    null,
  );
  const [assignCategoryId, setAssignCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const initialStagingFilter = useRef(false);

  async function loadCategories() {
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    if (response.ok) {
      setCategories(data.categories ?? []);
    }
  }

  async function loadProducts(refresh = false) {
    setLoading(true);
    setError("");

    const url = refresh
      ? "/api/admin/products?refresh=1"
      : "/api/admin/products";
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "שגיאה בטעינת מוצרים מ-Rivhit");
      setProducts([]);
    } else {
      setProducts(data.products ?? []);
      if (data.stagingCategoryId) {
        setStagingCategoryId(data.stagingCategoryId);
        if (!initialStagingFilter.current) {
          setCategoryFilter(data.stagingCategoryId);
          initialStagingFilter.current = true;
        }
      }
      if (refresh) {
        const count = data.products?.length ?? 0;
        if (data.syncedCount > 0) {
          setCategoryFilter(data.stagingCategoryId);
          setFilter("");
          setMessage(
            `עודכן מ-Rivhit: ${count} מוצרים | ${data.syncedCount} חדשים ב"${STAGING_CATEGORY_NAME}"`,
          );
        } else {
          setMessage(`עודכן מ-Rivhit: ${count} מוצרים`);
        }
      } else if (data.syncedCount > 0) {
        setMessage(
          `${data.syncedCount} מוצרים חדשים הועברו ל"${STAGING_CATEGORY_NAME}"`,
        );
      }
    }

    setLoading(false);
  }

  async function loadAll() {
    await Promise.all([loadCategories(), loadProducts()]);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, categoryFilter]);

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newCategory.trim()) return;

    setMessage("");
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory.trim() }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "שגיאה בהוספת קטגוריה");
      return;
    }

    setNewCategory("");
    setMessage(`הקטגוריה "${data.category.name}" נוספה`);
    await loadCategories();
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`למחוק את הקטגוריה "${name}"?`)) return;

    const response = await fetch(`/api/admin/categories?id=${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setMessage(`הקטגוריה "${name}" נמחקה`);
      await loadAll();
    }
  }

  async function renameCategory(id: string, name: string) {
    setError("");
    const response = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: name.trim() }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "שגיאה בעדכון שם");
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: data.category.name } : c)),
    );
    setProducts((prev) =>
      prev.map((p) =>
        p.categoryId === id ? { ...p, categoryName: data.category.name } : p,
      ),
    );
    setMessage(`שם הקטגוריה עודכן ל: "${data.category.name}"`);
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    setError("");
    const response = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, move: direction }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "שגיאה בסידור");
      return;
    }

    await loadCategories();
    setMessage("סדר הקטגוריות עודכן");
  }

  async function saveCategory(itemId: number, categoryId: string) {
    setSavingIds((prev) => new Set(prev).add(itemId));
    setError("");

    const response = await fetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        categoryId: categoryId || null,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const category = categories.find((c) => c.id === categoryId);

      setProducts((prev) =>
        prev.map((product) =>
          product.itemId === itemId
            ? {
                ...product,
                categoryId: categoryId || stagingCategoryId,
                categoryName: category?.name ?? STAGING_CATEGORY_NAME,
                isStaging: category?.is_staging ?? !categoryId,
              }
            : product,
        ),
      );

      const product = products.find((p) => p.itemId === itemId);
      setMessage(
        categoryId && categoryId !== stagingCategoryId
          ? `שויך לקטגוריה: ${product?.name}`
          : `הועבר ל"${STAGING_CATEGORY_NAME}": ${product?.name}`,
      );
    } else {
      setError(data.error || "שגיאה בשמירה");
    }

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  async function uploadProductImage(itemId: number, file: File) {
    setSavingIds((prev) => new Set(prev).add(itemId));
    setError("");

    const formData = new FormData();
    formData.append("itemId", String(itemId));
    formData.append("file", file);

    const response = await fetch("/api/admin/products/image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      setProducts((prev) =>
        prev.map((product) =>
          product.itemId === itemId
            ? {
                ...product,
                image: data.imageUrl ?? product.image,
                hasCustomImage: true,
              }
            : product,
        ),
      );
      setMessage("התמונה נשמרה בקטלוג");
    } else {
      setError(data.error || "שגיאה בהעלאת תמונה");
    }

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  async function saveProductPrice(itemId: number, priceInput: string) {
    const trimmed = priceInput.trim();
    let customPrice: number | null;

    if (!trimmed) {
      customPrice = null;
    } else {
      const parsed = Number.parseFloat(trimmed.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("מחיר לא תקין");
        return;
      }
      customPrice = parsed;
    }

    setSavingIds((prev) => new Set(prev).add(itemId));
    setError("");

    const response = await fetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, customPrice }),
    });

    const data = await response.json();

    if (response.ok) {
      const product = products.find((p) => p.itemId === itemId);
      setProducts((prev) =>
        prev.map((p) =>
          p.itemId === itemId
            ? {
                ...p,
                price:
                  customPrice ??
                  product?.rivhitPrice ??
                  p.rivhitPrice ??
                  0,
                hasCustomPrice: customPrice !== null,
              }
            : p,
        ),
      );
      setMessage(
        customPrice === null
          ? "המחיר חזר למחיר ריווחית"
          : "המחיר עודכן בקטלוג",
      );
    } else {
      setError(data.error || "שגיאה בעדכון מחיר");
    }

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  async function removeProductImage(itemId: number) {
    if (!confirm("להסיר את התמונה שהועלת? יוצג שוב מה שיש בריווחית (אם יש).")) {
      return;
    }

    setSavingIds((prev) => new Set(prev).add(itemId));
    setError("");

    const response = await fetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        clearCustomImage: true,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      await loadProducts(false);
      setMessage("התמונה שהועלת הוסרה");
    } else {
      setError(data.error || "שגיאה בהסרת תמונה");
    }

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const term = filter.trim().toLowerCase();
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === "all" || product.categoryId === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, filter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const stagingCount = products.filter(
    (p) => p.categoryId === stagingCategoryId || p.isStaging,
  ).length;
  const liveCount = products.filter(
    (p) => p.categoryId && p.categoryId !== stagingCategoryId,
  ).length;

  return (
    <div className="space-y-6">
      <CustomerLinkCard />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">ניהול קטלוג</h2>
        <p className="mt-2 text-sm text-gray-600">
          מוצר חדש מ-Rivhit נכנס אוטומטית ל&quot;{STAGING_CATEGORY_NAME}&quot;
          (מנהלים בלבד). משם גוררים לקטegoria האמיתית — ואז הלקוחות רואים.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadProducts(true)}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800"
          >
            רענן מ-Rivhit
          </button>
        </div>
        <p className="mt-2 text-sm font-medium text-emerald-700">
          {loading
            ? "טוען..."
            : `${products.length} מוצרים | ${stagingCount} חדשים | ${liveCount} בקטלוג ללקוחות`}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold">קטגוריות</h3>
        <form
          onSubmit={addCategory}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="שם קטגוריה חדשה, למשל: סידורים"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3"
          />
          <button className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white">
            הוסף קטגוריה
          </button>
        </form>

        {categories.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              סדר הקטגוריות (כפי שיופיע ללקוח) — השתמש בחיצים:
            </p>
            {categories.map((category, index) => (
              <CategoryChip
                key={category.id}
                category={category}
                isFirst={index === 0}
                isLast={index === categories.length - 1}
                onRename={renameCategory}
                onDelete={deleteCategory}
                onMoveUp={() => moveCategory(category.id, "up")}
                onMoveDown={() => moveCategory(category.id, "down")}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-900">
            שיוך מהיר — בחר קטגוריה ולחץ &quot;שייך&quot; על המוצר
          </p>
          <select
            value={assignCategoryId}
            onChange={(e) => setAssignCategoryId(e.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 sm:max-w-sm"
          >
            <option value="">בחר קטגוריה לשיוך...</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="חיפוש לפי שם או מק״ט — למשל: 4028"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3"
          />
        </div>
        {!filter.trim() && stagingCount > PAGE_SIZE && (
          <p className="mt-2 text-sm text-amber-800">
            יש {stagingCount} מוצרים ב&quot;{STAGING_CATEGORY_NAME}&quot; — חפש
            לפי מק&quot;ט כדי למצוא מהר (מוצגים {PAGE_SIZE} בכל עמוד).
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {stagingCategoryId && (
            <FilterPill
              active={categoryFilter === stagingCategoryId}
              onClick={() => setCategoryFilter(stagingCategoryId)}
              label={`${STAGING_CATEGORY_NAME} (${stagingCount})`}
            />
          )}
          <FilterPill
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            label={`הכל (${products.length})`}
          />
          {categories
            .filter((c) => !c.is_staging)
            .map((category) => {
            const count = products.filter(
              (p) => p.categoryId === category.id,
            ).length;
            return (
              <FilterPill
                key={category.id}
                active={categoryFilter === category.id}
                onClick={() => setCategoryFilter(category.id)}
                label={`${category.name} (${count})`}
              />
            );
          })}
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-6 text-gray-600">טוען מוצרים מ-Rivhit...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="mt-6 text-gray-600">לא נמצאו מוצרים.</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-gray-500">
              מציג {pagedProducts.length} מתוך {filteredProducts.length} מוצרים
              {stagingCategoryId &&
                categoryFilter === stagingCategoryId &&
                " — שייך לקטגוריה כדי שהלקוחות יראו"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {pagedProducts.map((product) => (
                <ProductCard
                  key={product.itemId}
                  product={product}
                  categories={categories.filter((c) => !c.is_staging)}
                  assignCategoryId={assignCategoryId}
                  isSaving={savingIds.has(product.itemId)}
                  onAssign={(categoryId) =>
                    saveCategory(product.itemId, categoryId)
                  }
                  onUploadImage={(file) =>
                    uploadProductImage(product.itemId, file)
                  }
                  onRemoveImage={() => removeProductImage(product.itemId)}
                  onSavePrice={(priceInput) =>
                    saveProductPrice(product.itemId, priceInput)
                  }
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40"
                >
                  ← הקודם
                </button>
                <span className="text-sm text-gray-600">
                  עמוד {page} מתוך {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40"
                >
                  הבא →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function CategoryChip({
  category,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  category: Category;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  useEffect(() => {
    setName(category.name);
  }, [category.name]);

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1 text-sm">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            if (name.trim()) {
              onRename(category.id, name);
              setEditing(false);
            }
          }}
          className="font-semibold text-emerald-700"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={() => {
            setName(category.name);
            setEditing(false);
          }}
          className="text-gray-500"
        >
          ביטול
        </button>
      </span>
    );
  }

  return (
    <span className="flex w-full items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
      <span className="font-medium">
        {category.name}
        {category.is_staging && (
          <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
            מנהלים בלבד
          </span>
        )}
      </span>
      <span className="flex items-center gap-2">
        {!category.is_staging && (
          <>
        <button
          type="button"
          disabled={isFirst}
          onClick={onMoveUp}
          className="rounded border border-emerald-200 px-2 py-1 disabled:opacity-30"
          aria-label="הזז למעלה"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={onMoveDown}
          className="rounded border border-emerald-200 px-2 py-1 disabled:opacity-30"
          aria-label="הזז למטה"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-emerald-700 underline"
          aria-label={`ערוך ${category.name}`}
        >
          ערוך
        </button>
        <button
          type="button"
          onClick={() => onDelete(category.id, category.name)}
          className="text-red-600"
          aria-label={`מחק ${category.name}`}
        >
          ×
        </button>
          </>
        )}
      </span>
    </span>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product,
  categories,
  assignCategoryId,
  isSaving,
  onAssign,
  onUploadImage,
  onRemoveImage,
  onSavePrice,
}: {
  product: AdminProduct;
  categories: Category[];
  assignCategoryId: string;
  isSaving: boolean;
  onAssign: (categoryId: string) => void;
  onUploadImage: (file: File) => void;
  onRemoveImage: () => void;
  onSavePrice: (priceInput: string) => void;
}) {
  const fileInputId = `product-image-${product.itemId}`;
  const [priceInput, setPriceInput] = useState(
    product.price > 0 ? String(product.price) : "",
  );

  useEffect(() => {
    setPriceInput(product.price > 0 ? String(product.price) : "");
  }, [product.price]);

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-3 shadow-sm ${
        isSaving ? "opacity-60" : ""
      } ${product.categoryId ? "border-emerald-200" : "border-gray-200"}`}
    >
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={product.image}
          src={product.image}
          alt={product.name}
          className="aspect-square w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">
          אין תמונה
        </div>
      )}

      <h4 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900">
        {product.name}
      </h4>
      <p className="mt-1 text-xs text-gray-500">מק&quot;ט: {product.sku}</p>

      <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
        <p className="text-xs font-medium text-gray-600">מחיר בקטלוג</p>
        <p className="mt-0.5 text-base font-bold text-emerald-800">
          {formatAdminPrice(product.price)}
        </p>
        {product.hasCustomPrice && product.rivhitPrice !== product.price && (
          <p className="text-[11px] text-gray-500">
            ריווחית: {formatAdminPrice(product.rivhitPrice)}
          </p>
        )}
        <div className="mt-2 flex gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={priceInput}
            disabled={isSaving}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="מחיר ₪"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSavePrice(priceInput)}
            className="shrink-0 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            שמור
          </button>
        </div>
        {product.hasCustomPrice && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSavePrice("")}
            className="mt-1 text-[11px] text-gray-500 underline disabled:opacity-60"
          >
            איפוס למחיר ריווחית
          </button>
        )}
      </div>

      {product.categoryName && (
        <span
          className={`mt-2 inline-block rounded-full px-2 py-1 text-xs ${
            product.isStaging
              ? "bg-amber-50 text-amber-900"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {product.categoryName}
        </span>
      )}

      <div className="mt-auto space-y-2 pt-3">
        <input
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={isSaving}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUploadImage(file);
            event.target.value = "";
          }}
        />
        <label
          htmlFor={fileInputId}
          className={`flex w-full cursor-pointer items-center justify-center rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white ${
            isSaving ? "pointer-events-none opacity-60" : "hover:bg-emerald-700"
          }`}
        >
          {isSaving ? "שומר..." : product.image ? "החלף תמונה" : "העלה תמונה"}
        </label>

        {product.hasCustomImage && (
          <button
            type="button"
            disabled={isSaving}
            onClick={onRemoveImage}
            className="w-full rounded-xl border border-gray-300 py-2 text-xs font-medium text-gray-700 disabled:opacity-60"
          >
            הסר תמונה שהועלת
          </button>
        )}

        {assignCategoryId && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onAssign(assignCategoryId)}
            className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? "שומר..." : "שייך לקטגוריה"}
          </button>
        )}

        <select
          value={product.categoryId ?? ""}
          disabled={isSaving}
          onChange={(e) => onAssign(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs"
        >
          <option value="">החזר למוצרים חדשים</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
